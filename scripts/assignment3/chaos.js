const fs = require('fs');
const path = require('path');
const autocannon = require('autocannon');
const {
  artifactsRoot,
  ensureDir,
  ensureRuntimeSeed,
  fetchWithMetrics,
  getServiceContainerId,
  log,
  runCommand,
  runCommandSync,
  runCompose,
  sleep,
  waitForUrl,
  writeJson,
  writeText,
  captureComposeLogs,
  toMarkdownTable,
} = require('./common');
const { renderBarChart, renderLineChart, writeChart } = require('./charts');

const chaosDir = path.join(artifactsRoot, 'chaos');
const chartsDir = path.join(chaosDir, 'charts');
const logsDir = path.join(chaosDir, 'logs');

const probeIntervalMs = 2000;

function runAutocannon(options) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        connections: options.connections,
        duration: options.duration,
        url: options.url,
        method: options.method,
        headers: options.headers,
        body: options.body,
        pipelining: 1,
        renderProgressBar: false,
        renderResultsTable: false,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    instance.on('error', reject);
  });
}

function buildProbes(runtime) {
  return [
    {
      key: 'frontend-home',
      label: 'Frontend /',
      url: `${runtime.services.frontend}/`,
      method: 'GET',
    },
    {
      key: 'backend-health',
      label: 'Backend /health',
      url: `${runtime.services.backend}/health`,
      method: 'GET',
    },
    {
      key: 'backend-db',
      label: 'Backend /health/db',
      url: `${runtime.services.backend}/health/db`,
      method: 'GET',
    },
    {
      key: 'products',
      label: 'GET /api/products',
      url: `${runtime.services.backend}/api/products`,
      method: 'GET',
    },
    {
      key: 'search',
      label: 'GET /api/search?q=laptop',
      url: `${runtime.services.backend}/api/search?q=laptop`,
      method: 'GET',
    },
    {
      key: 'auth-login',
      label: 'POST /api/auth/login',
      url: `${runtime.services.backend}/api/auth/login`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: runtime.user.email,
        password: runtime.user.password,
      }),
    },
    {
      key: 'order-track',
      label: 'POST /api/orders/track',
      url: `${runtime.services.backend}/api/orders/track`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orderNumber: runtime.order.orderNumber,
        email: runtime.order.email,
      }),
    },
  ];
}

async function probeEndpoint(probe, scenarioName, phase, round) {
  const result = await fetchWithMetrics(probe.url, {
    method: probe.method,
    headers: probe.headers,
    body: probe.body,
    timeoutMs: 1500,
  });

  return {
    scenario: scenarioName,
    timestamp: new Date().toISOString(),
    phase,
    round,
    endpoint: probe.key,
    label: probe.label,
    method: probe.method,
    url: probe.url,
    ok: result.ok,
    status: result.status,
    latencyMs: result.latencyMs,
    error: result.error || '',
  };
}

function writeCsv(filePath, records) {
  const headers = [
    'scenario',
    'timestamp',
    'phase',
    'round',
    'endpoint',
    'label',
    'method',
    'url',
    'ok',
    'status',
    'latencyMs',
    'error',
  ];
  const rows = records.map(record =>
    headers
      .map(header => {
        const value = record[header] ?? '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',')
  );

  writeText(filePath, `${headers.join(',')}\n${rows.join('\n')}\n`);
}

function summarizeScenario(name, records, faultStartMs, faultEndMs) {
  const totals = {
    probes: records.length,
    successful: records.filter(record => record.ok).length,
  };

  const byEndpoint = new Map();
  for (const record of records) {
    if (!byEndpoint.has(record.endpoint)) {
      byEndpoint.set(record.endpoint, []);
    }
    byEndpoint.get(record.endpoint).push(record);
  }

  const endpointSummary = Array.from(byEndpoint.entries()).map(([endpoint, endpointRecords]) => {
    const baseline = endpointRecords.filter(record => record.phase === 'baseline');
    const duringFault = endpointRecords.filter(record => record.phase === 'fault');
    const recovery = endpointRecords.filter(record => record.phase === 'recovery');

    const averageLatency = source =>
      source.length
        ? Number(
            (
              source.reduce((sum, record) => sum + record.latencyMs, 0) / source.length
            ).toFixed(2)
          )
        : 0;

    const failuresDuringFault = duringFault.filter(record => !record.ok).length;
    const firstRecovery = failuresDuringFault > 0 ? recovery.find(record => record.ok) : null;

    return {
      endpoint,
      label: endpointRecords[0].label,
      availabilityPercent: Number(
        ((endpointRecords.filter(record => record.ok).length / endpointRecords.length) * 100).toFixed(2)
      ),
      baselineAverageLatencyMs: averageLatency(baseline),
      faultAverageLatencyMs: averageLatency(duringFault),
      recoveryAverageLatencyMs: averageLatency(recovery),
      latencyDeltaMs: Number((averageLatency(duringFault) - averageLatency(baseline)).toFixed(2)),
      failuresDuringFault,
      recoveredAt: firstRecovery ? firstRecovery.timestamp : null,
      mttrMs: firstRecovery ? Date.parse(firstRecovery.timestamp) - faultEndMs : null,
    };
  });

  const roundSummary = Array.from(
    records.reduce((map, record) => {
      if (!map.has(record.round)) {
        map.set(record.round, []);
      }
      map.get(record.round).push(record);
      return map;
    }, new Map())
  ).map(([round, roundRecords]) => ({
    round,
    averageLatencyMs: Number(
      (
        roundRecords.reduce((sum, record) => sum + record.latencyMs, 0) / roundRecords.length
      ).toFixed(2)
    ),
    phase: roundRecords[0].phase,
  }));

  const recoveryRequired = endpointSummary.some(item => item.failuresDuringFault > 0);
  const impactedEndpoints = endpointSummary.filter(item => item.failuresDuringFault > 0);

  return {
    scenario: name,
    generatedAt: new Date().toISOString(),
    faultStart: new Date(faultStartMs).toISOString(),
    faultEnd: new Date(faultEndMs).toISOString(),
    availabilityPercent: Number(((totals.successful / totals.probes) * 100).toFixed(2)),
    recoveryRequired,
    mttrMs: !recoveryRequired
      ? null
      : impactedEndpoints.every(item => item.mttrMs !== null)
      ? Math.max(...impactedEndpoints.map(item => item.mttrMs))
      : null,
    errorPropagation: endpointSummary
      .filter(item => item.failuresDuringFault > 0)
      .map(item => item.label),
    endpointSummary,
    roundSummary,
  };
}

async function getCpuSettings(containerId) {
  const stdout = runCommandSync('docker', ['inspect', containerId]);
  const [inspectData] = JSON.parse(stdout);

  return {
    nanoCpus: inspectData.HostConfig.NanoCpus,
    cpuPeriod: inspectData.HostConfig.CpuPeriod,
    cpuQuota: inspectData.HostConfig.CpuQuota,
  };
}

async function restoreCpuSettings(containerId, settings) {
  if (settings.nanoCpus && settings.nanoCpus > 0) {
    await runCommand('docker', [
      'update',
      '--cpus',
      String(settings.nanoCpus / 1_000_000_000),
      containerId,
    ]);
    return;
  }

  await runCommand('docker', [
    'update',
    '--cpu-period',
    String(settings.cpuPeriod || 0),
    '--cpu-quota',
    String(settings.cpuQuota || 0),
    containerId,
  ]);
}

function writeScenarioCharts(scenarioName, summary) {
  const availabilityFile = path.join(chartsDir, `${scenarioName}-availability.svg`);
  const latencyDeltaFile = path.join(chartsDir, `${scenarioName}-latency-delta.svg`);
  const latencyTrendFile = path.join(chartsDir, `${scenarioName}-latency-trend.svg`);

  writeChart(
    availabilityFile,
    renderBarChart({
      title: `${scenarioName} availability by probe`,
      labels: summary.endpointSummary.map(item => item.endpoint),
      values: summary.endpointSummary.map(item => item.availabilityPercent),
      color: '#2563eb',
      ySuffix: '%',
    })
  );

  writeChart(
    latencyDeltaFile,
    renderBarChart({
      title: `${scenarioName} latency delta during fault`,
      labels: summary.endpointSummary.map(item => item.endpoint),
      values: summary.endpointSummary.map(item => item.latencyDeltaMs),
      color: '#dc2626',
      ySuffix: ' ms',
    })
  );

  writeChart(
    latencyTrendFile,
    renderLineChart({
      title: `${scenarioName} average latency trend`,
      points: summary.roundSummary.map(item => ({
        label: `${item.round}`,
        value: item.averageLatencyMs,
      })),
      color: '#0f766e',
      ySuffix: ' ms',
    })
  );

  return {
    availabilityFile,
    latencyDeltaFile,
    latencyTrendFile,
  };
}

async function runScenario(config, runtime, probes) {
  const scenarioStartIso = new Date().toISOString();
  const scenarioStartMs = Date.now();
  const faultStartMs = scenarioStartMs + config.preFaultMs;
  const faultEndMs = faultStartMs + config.faultDurationMs;
  const scenarioEndMs = faultEndMs + config.postFaultMs;
  const records = [];

  const context = {
    backendContainerId: getServiceContainerId('backend'),
    mongodbContainerId: getServiceContainerId('mongodb'),
    runtime,
  };

  const faultTask = (async () => {
    await sleep(config.preFaultMs);
    await config.start(context);
    await sleep(config.faultDurationMs);
    await config.stop(context);
  })();

  let round = 0;
  while (Date.now() < scenarioEndMs) {
    round += 1;
    const roundStart = Date.now();
    const phase =
      roundStart < faultStartMs ? 'baseline' : roundStart < faultEndMs ? 'fault' : 'recovery';

    const roundResults = await Promise.all(
      probes.map(probe => probeEndpoint(probe, config.name, phase, round))
    );
    records.push(...roundResults);

    const elapsed = Date.now() - roundStart;
    if (elapsed < probeIntervalMs) {
      await sleep(probeIntervalMs - elapsed);
    }
  }

  await faultTask;

  const summary = summarizeScenario(config.name, records, faultStartMs, faultEndMs);
  const scenarioDir = path.join(chaosDir, config.name);
  ensureDir(scenarioDir);

  writeCsv(path.join(scenarioDir, 'probes.csv'), records);
  writeJson(path.join(scenarioDir, 'summary.json'), summary);
  await captureComposeLogs(path.join(logsDir, `${config.name}.log`), { since: scenarioStartIso });
  summary.charts = writeScenarioCharts(config.name, summary);
  writeJson(path.join(scenarioDir, 'summary.json'), summary);

  await waitForUrl(`${runtime.services.backend}/health/ready`, {
    timeoutMs: 180000,
    acceptableStatus: status => status === 200,
  });

  return summary;
}

async function main() {
  ensureDir(chaosDir);
  ensureDir(chartsDir);
  ensureDir(logsDir);

  const runtime = await ensureRuntimeSeed();
  const probes = buildProbes(runtime);

  const cpuThrottleScenario = {
    name: 'cpu-throttle',
    preFaultMs: 10_000,
    faultDurationMs: 120_000,
    postFaultMs: 30_000,
    async start(context) {
      context.originalCpuSettings = await getCpuSettings(context.backendContainerId);
      await runCommand('docker', ['update', '--cpus', '0.25', context.backendContainerId]);
      context.loadResult = runAutocannon({
        url: `${runtime.services.backend}/api/search?q=laptop`,
        method: 'GET',
        connections: 25,
        duration: 120,
      });
    },
    async stop(context) {
      await context.loadResult;
      await restoreCpuSettings(context.backendContainerId, context.originalCpuSettings);
    },
  };

  const scenarioDefinitions = [
    {
      name: 'backend-pause',
      preFaultMs: 10_000,
      faultDurationMs: 30_000,
      postFaultMs: 20_000,
      async start(context) {
        await runCommand('docker', ['pause', context.backendContainerId]);
      },
      async stop(context) {
        await runCommand('docker', ['unpause', context.backendContainerId]);
      },
    },
    {
      name: 'mongodb-restart',
      preFaultMs: 10_000,
      faultDurationMs: 45_000,
      postFaultMs: 30_000,
      async start() {
        await runCompose(['stop', 'mongodb']);
      },
      async stop() {
        await runCompose(['start', 'mongodb']);
      },
    },
    cpuThrottleScenario,
  ];

  const scenarioSummaries = [];
  for (const scenario of scenarioDefinitions) {
    log(`Running chaos scenario: ${scenario.name}`);
    const summary = await runScenario(scenario, runtime, probes);
    scenarioSummaries.push(summary);
  }

  writeJson(path.join(chaosDir, 'summary.json'), {
    generatedAt: new Date().toISOString(),
    scenarios: scenarioSummaries,
  });

  writeText(
    path.join(chaosDir, 'summary.md'),
    [
      '# Assignment 3 Chaos Summary',
      '',
      toMarkdownTable(
        ['Scenario', 'Availability', 'MTTR', 'Endpoints impacted'],
        scenarioSummaries.map(summary => [
          summary.scenario,
          `${summary.availabilityPercent}%`,
          summary.mttrMs === null ? (summary.recoveryRequired ? 'unrecovered' : 'n/a') : `${summary.mttrMs} ms`,
          summary.errorPropagation.join(', ') || 'None',
        ])
      ),
      '',
    ].join('\n')
  );

  log('Chaos experiment artifacts generated');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
