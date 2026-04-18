const path = require('path');
const autocannon = require('autocannon');
const {
  artifactsRoot,
  ensureDir,
  ensureRuntimeSeed,
  estimateP95,
  log,
  readJson,
  writeJson,
  writeText,
  captureComposeLogs,
  startDockerStatsSampler,
  toMarkdownTable,
  toSlug,
  formatBytes,
} = require('./common');
const { renderBarChart, renderLineChart, writeChart } = require('./charts');

const performanceDir = path.join(artifactsRoot, 'performance');
const rawDir = path.join(performanceDir, 'raw');
const statsDir = path.join(performanceDir, 'stats');
const chartsDir = path.join(performanceDir, 'charts');
const logsDir = path.join(performanceDir, 'logs');

const scenarios = [
  { name: 'normal', connections: 10, duration: 60 },
  { name: 'peak', connections: 25, duration: 60 },
  { name: 'spike', connections: 60, duration: 30 },
  { name: 'endurance', connections: 10, duration: 300 },
];

const endpointThresholds = {
  products: {
    normal: { latencyP95Ms: 500, errorRatePercent: 0 },
    peak: { latencyP95Ms: 900, errorRatePercent: 1 },
  },
  search: {
    normal: { latencyP95Ms: 500, errorRatePercent: 0 },
    peak: { latencyP95Ms: 900, errorRatePercent: 1 },
  },
  auth: {
    normal: { latencyP95Ms: 400, errorRatePercent: 0 },
    peak: { latencyP95Ms: 800, errorRatePercent: 1 },
  },
  checkout: {
    normal: { latencyP95Ms: 1600, errorRatePercent: 2 },
    peak: { latencyP95Ms: 2200, errorRatePercent: 2 },
    endurance: { memoryGrowthPercent: 20, errorRatePercent: 2 },
  },
};

function buildEndpoints(runtime) {
  return [
    {
      key: 'products',
      label: 'Product discovery',
      url: `${runtime.services.backend}/api/products`,
      method: 'GET',
    },
    {
      key: 'search',
      label: 'Search',
      url: `${runtime.services.backend}/api/search?q=laptop`,
      method: 'GET',
    },
    {
      key: 'auth',
      label: 'Authentication',
      url: `${runtime.services.backend}/api/auth/login`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: runtime.user.email,
        password: runtime.user.password,
      }),
    },
    {
      key: 'checkout',
      label: 'Checkout',
      url: `${runtime.services.backend}/api/checkout/create-order`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: runtime.product.id, quantity: 1 }],
        name: runtime.user.name,
        email: runtime.user.email,
        shippingAddress: '123 Reliability Avenue, Test City',
        cardNumber: '4111111111111111',
        cardName: runtime.user.name,
        expiry: '12/2030',
        cvc: '123',
      }),
    },
  ];
}

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
        title: options.title,
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

function getBackendSamples(statsSamples) {
  return statsSamples.filter(sample => sample.service === 'backend' || sample.container.includes('-backend-'));
}

function summarizePerformance(endpoint, scenario, result, statsSamples) {
  const requestCount = result.requests.sent || result.requests.total || 0;
  const errorCount = result.errors + result.timeouts + result.non2xx + result.resets;
  const errorRatePercent = requestCount ? Number(((errorCount / requestCount) * 100).toFixed(2)) : 0;
  const backendSamples = getBackendSamples(statsSamples);
  const firstSample = backendSamples[0];
  const lastSample = backendSamples[backendSamples.length - 1];
  const memoryGrowthPercent =
    firstSample && lastSample && firstSample.memUsageBytes > 0
      ? Number((((lastSample.memUsageBytes - firstSample.memUsageBytes) / firstSample.memUsageBytes) * 100).toFixed(2))
      : 0;

  const summary = {
    endpoint: endpoint.key,
    endpointLabel: endpoint.label,
    scenario: scenario.name,
    connections: scenario.connections,
    durationSeconds: scenario.duration,
    latencyAverageMs: Number(result.latency.average.toFixed(2)),
    latencyMedianMs: Number(result.latency.p50.toFixed(2)),
    latencyP95Ms: estimateP95(result.latency),
    latencyP99Ms: Number(result.latency.p99.toFixed(2)),
    throughputRps: Number(result.requests.average.toFixed(2)),
    requestCount,
    errorCount,
    errorRatePercent,
    non2xx: result.non2xx,
    memoryGrowthPercent,
    peakCpuPercent: Number(Math.max(...backendSamples.map(sample => sample.cpuPercent), 0).toFixed(2)),
    peakMemoryBytes: Math.max(...backendSamples.map(sample => sample.memUsageBytes), 0),
    peakBlockIoBytes: Math.max(
      ...backendSamples.map(sample => sample.blockInputBytes + sample.blockOutputBytes),
      0
    ),
  };

  const thresholds = endpointThresholds[endpoint.key]?.[scenario.name];
  summary.thresholds = thresholds || null;
  summary.thresholdStatus = !thresholds
    ? 'n/a'
    : Object.entries(thresholds).every(([metric, threshold]) => {
        if (metric === 'errorRatePercent' || metric === 'memoryGrowthPercent') {
          return summary[metric] <= threshold;
        }
        return summary[metric] <= threshold;
      })
      ? 'pass'
      : 'fail';

  return summary;
}

function writeResourceCharts(slug, statsSamples) {
  const backendSamples = getBackendSamples(statsSamples);
  if (!backendSamples.length) {
    return null;
  }

  const cpuPoints = backendSamples.map((sample, index) => ({
    label: `${index * 5}s`,
    value: Number(sample.cpuPercent.toFixed(2)),
  }));
  const memoryPoints = backendSamples.map((sample, index) => ({
    label: `${index * 5}s`,
    value: Number((sample.memUsageBytes / (1024 * 1024)).toFixed(2)),
  }));
  const blockIoPoints = backendSamples.map((sample, index) => ({
    label: `${index * 5}s`,
    value: Number(((sample.blockInputBytes + sample.blockOutputBytes) / (1024 * 1024)).toFixed(3)),
  }));

  const files = {
    cpu: path.join(chartsDir, `${slug}-backend-cpu.svg`),
    memory: path.join(chartsDir, `${slug}-backend-memory.svg`),
    blockIo: path.join(chartsDir, `${slug}-backend-block-io.svg`),
  };

  writeChart(
    files.cpu,
    renderLineChart({
      title: `${slug} backend CPU utilisation`,
      points: cpuPoints,
      color: '#b91c1c',
      ySuffix: '%',
    })
  );

  writeChart(
    files.memory,
    renderLineChart({
      title: `${slug} backend memory usage`,
      points: memoryPoints,
      color: '#1d4ed8',
      ySuffix: ' MiB',
    })
  );

  writeChart(
    files.blockIo,
    renderLineChart({
      title: `${slug} backend block I/O`,
      points: blockIoPoints,
      color: '#7c3aed',
      ySuffix: ' MiB',
    })
  );

  return files;
}

function loadExistingArtifacts(slug) {
  if (!process.env.ASSIGNMENT3_PERFORMANCE_REUSE) {
    return null;
  }

  return {
    result: readJson(path.join(rawDir, `${slug}.json`)),
    statsSamples: readJson(path.join(statsDir, `${slug}.json`)),
  };
}

async function main() {
  ensureDir(rawDir);
  ensureDir(statsDir);
  ensureDir(chartsDir);
  ensureDir(logsDir);

  const runtime = await ensureRuntimeSeed();
  const endpoints = buildEndpoints(runtime);
  const startedAt = new Date().toISOString();
  const summaries = [];
  const resourceCharts = {};

  for (const endpoint of endpoints) {
    if (!process.env.ASSIGNMENT3_PERFORMANCE_REUSE) {
      log(`Warming up ${endpoint.label} for 15 seconds`);
      await runAutocannon({
        ...endpoint,
        title: `${endpoint.label} warmup`,
        connections: Math.min(5, scenarios[0].connections),
        duration: 15,
      });
    }

    for (const scenario of scenarios) {
      const slug = toSlug(`${endpoint.key}-${scenario.name}`);
      const rawPath = path.join(rawDir, `${slug}.json`);
      const statsPath = path.join(statsDir, `${slug}.json`);
      const existingArtifacts = loadExistingArtifacts(slug);
      let result;
      let statsSamples;

      if (existingArtifacts) {
        result = existingArtifacts.result;
        statsSamples = existingArtifacts.statsSamples;
      } else {
        log(`Running ${endpoint.label} under ${scenario.name} load`);
        const sampler = startDockerStatsSampler(statsPath, ['backend', 'mongodb', 'frontend']);
        result = await runAutocannon({
          ...endpoint,
          title: `${endpoint.label} ${scenario.name}`,
          connections: scenario.connections,
          duration: scenario.duration,
        });
        statsSamples = sampler.stop();
        writeJson(rawPath, result);
      }

      const summary = summarizePerformance(endpoint, scenario, result, statsSamples);
      summary.rawResultPath = path.relative(performanceDir, rawPath);
      summary.statsPath = path.relative(performanceDir, statsPath);
      summary.resourceCharts = writeResourceCharts(slug, statsSamples);
      summaries.push(summary);

      if (summary.resourceCharts) {
        resourceCharts[slug] = summary.resourceCharts;
      }
    }
  }

  if (!process.env.ASSIGNMENT3_PERFORMANCE_REUSE) {
    await captureComposeLogs(path.join(logsDir, 'compose.log'), { since: startedAt });
  }

  const latencyLabels = summaries.map(summary => `${summary.endpoint}-${summary.scenario}`);
  writeChart(
    path.join(chartsDir, 'p95-latency.svg'),
    renderBarChart({
      title: 'Performance: estimated p95 latency',
      labels: latencyLabels,
      values: summaries.map(summary => Number(summary.latencyP95Ms.toFixed(2))),
      color: '#2563eb',
      ySuffix: 'ms',
    })
  );

  writeChart(
    path.join(chartsDir, 'throughput.svg'),
    renderBarChart({
      title: 'Performance: average throughput',
      labels: latencyLabels,
      values: summaries.map(summary => Number(summary.throughputRps.toFixed(2))),
      color: '#059669',
      ySuffix: ' rps',
    })
  );

  writeChart(
    path.join(chartsDir, 'error-rate.svg'),
    renderBarChart({
      title: 'Performance: error rate',
      labels: latencyLabels,
      values: summaries.map(summary => Number(summary.errorRatePercent.toFixed(2))),
      color: '#dc2626',
      ySuffix: '%',
    })
  );

  const summaryPayload = {
    generatedAt: new Date().toISOString(),
    warmupSeconds: 15,
    summaries,
    resourceCharts,
  };

  writeJson(path.join(performanceDir, 'summary.json'), summaryPayload);

  const rows = summaries.map(summary => [
    summary.endpointLabel,
    summary.scenario,
    String(summary.connections),
    `${summary.latencyAverageMs} ms`,
    `${summary.latencyMedianMs} ms`,
    `${summary.latencyP95Ms} ms`,
    `${summary.throughputRps} rps`,
    `${summary.errorRatePercent}%`,
    `${summary.memoryGrowthPercent}%`,
    summary.thresholdStatus,
  ]);

  writeText(
    path.join(performanceDir, 'summary.md'),
    [
      '# Assignment 3 Performance Summary',
      '',
      toMarkdownTable(
        [
          'Endpoint',
          'Scenario',
          'Connections',
          'Average',
          'Median',
          'Estimated p95',
          'Throughput',
          'Error rate',
          'Memory growth',
          'Threshold status',
        ],
        rows
      ),
      '',
      '## Peak resources',
      '',
      ...summaries.map(summary =>
        `- ${summary.endpointLabel} / ${summary.scenario}: peak CPU ${summary.peakCpuPercent}% , peak memory ${formatBytes(summary.peakMemoryBytes)} , peak block I/O ${formatBytes(summary.peakBlockIoBytes)}`
      ),
      '',
    ].join('\n')
  );

  log('Performance experiment artifacts generated');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
