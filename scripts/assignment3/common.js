const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'assignment3');
const runtimeDir = path.join(artifactsRoot, 'runtime');
const runtimeSeedPath = path.join(runtimeDir, 'runtime-seed.json');
const metadataPath = path.join(runtimeDir, 'environment.json');
const composeArgs = ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.assignment3.yml'];

function log(message) {
  console.log(`[assignment3] ${message}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureParent(filePath) {
  ensureDir(path.dirname(filePath));
}

function writeJson(filePath, data) {
  ensureParent(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeText(filePath, text) {
  ensureParent(filePath);
  fs.writeFileSync(filePath, text, 'utf8');
}

function appendText(filePath, text) {
  ensureParent(filePath);
  fs.appendFileSync(filePath, text, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runCommand(cmd, args, options = {}) {
  const {
    cwd = repoRoot,
    env = {},
    stream = true,
    shell = false,
  } = options;
  const resolvedEnv = { ...process.env, ...env };
  if (cmd === 'docker' && !resolvedEnv.DOCKER_CONTEXT) {
    resolvedEnv.DOCKER_CONTEXT = process.env.ASSIGNMENT3_DOCKER_CONTEXT || 'default';
  }

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: resolvedEnv,
      shell,
      stdio: stream ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      if (stream) process.stdout.write(text);
    });

    child.stderr.on('data', chunk => {
      const text = chunk.toString();
      stderr += text;
      if (stream) process.stderr.write(text);
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) {
        const error = new Error(`${cmd} ${args.join(' ')} exited with code ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        return reject(error);
      }

      resolve({ stdout, stderr });
    });
  });
}

function runCommandSync(cmd, args, options = {}) {
  const {
    cwd = repoRoot,
    env = {},
  } = options;
  const resolvedEnv = { ...process.env, ...env };
  if (cmd === 'docker' && !resolvedEnv.DOCKER_CONTEXT) {
    resolvedEnv.DOCKER_CONTEXT = process.env.ASSIGNMENT3_DOCKER_CONTEXT || 'default';
  }

  const result = spawnSync(cmd, args, {
    cwd,
    env: resolvedEnv,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const error = new Error(`${cmd} ${args.join(' ')} exited with code ${result.status}`);
    error.code = result.status;
    error.stdout = result.stdout;
    error.stderr = result.stderr;
    throw error;
  }

  return result.stdout.trim();
}

async function runCompose(args, options = {}) {
  return runCommand('docker', [...composeArgs, ...args], options);
}

function runComposeSync(args, options = {}) {
  return runCommandSync('docker', [...composeArgs, ...args], options);
}

function parseJsonLines(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function toSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseByteValue(value) {
  if (!value || value === '0B') return 0;

  const match = String(value).trim().match(/^([\d.]+)\s*([KMGTPE]?i?B)$/i);
  if (!match) return 0;

  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();
  const powers = {
    B: 0,
    KB: 1,
    MB: 2,
    GB: 3,
    TB: 4,
    PB: 5,
    EB: 6,
    KIB: 1,
    MIB: 2,
    GIB: 3,
    TIB: 4,
    PIB: 5,
    EIB: 6,
  };
  const base = unit.includes('IB') ? 1024 : 1000;
  const power = powers[unit] || 0;
  return Math.round(amount * base ** power);
}

function parseDockerPair(value) {
  const [left, right] = String(value || '0B / 0B')
    .split('/')
    .map(part => part.trim());

  return {
    leftBytes: parseByteValue(left),
    rightBytes: parseByteValue(right),
  };
}

function parseDockerPercent(value) {
  return Number(String(value || '0').replace('%', '').trim()) || 0;
}

async function fetchWithMetrics(url, options = {}) {
  const {
    timeoutMs = 5000,
    ...requestOptions
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      latencyMs,
      body: text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      error: error.message || 'Request failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForUrl(url, options = {}) {
  const {
    timeoutMs = 180000,
    intervalMs = 2000,
    acceptableStatus = status => status >= 200 && status < 500,
  } = options;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await fetchWithMetrics(url, { timeoutMs: Math.min(5000, intervalMs) });
    if (acceptableStatus(result.status)) {
      return result;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function captureEnvironmentMetadata() {
  ensureDir(runtimeDir);

  const metadata = {
    capturedAt: new Date().toISOString(),
    os: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytes: os.freemem(),
    },
    tools: {
      node: runCommandSync('node', ['-v']),
      npm: runCommandSync('npm', ['-v']),
      docker: runCommandSync('docker', ['--version']),
      dockerCompose: runCommandSync('docker', ['compose', 'version']),
      gitCommit: runCommandSync('git', ['rev-parse', 'HEAD']),
    },
  };

  writeJson(metadataPath, metadata);

  const markdown = [
    '# Assignment 3 Environment',
    '',
    `- Captured: ${metadata.capturedAt}`,
    `- Host: ${metadata.os.hostname}`,
    `- OS: ${metadata.os.platform} ${metadata.os.release} (${metadata.os.arch})`,
    `- CPU threads: ${metadata.os.cpus}`,
    `- Total memory: ${metadata.os.totalMemoryBytes}`,
    `- Free memory: ${metadata.os.freeMemoryBytes}`,
    `- Node: ${metadata.tools.node}`,
    `- npm: ${metadata.tools.npm}`,
    `- Docker: ${metadata.tools.docker}`,
    `- Docker Compose: ${metadata.tools.dockerCompose}`,
    `- Git commit: ${metadata.tools.gitCommit}`,
    '',
  ].join('\n');

  writeText(path.join(runtimeDir, 'environment.md'), markdown);
  return metadata;
}

function getServiceContainerId(service) {
  return runComposeSync(['ps', '-q', service]);
}

function getServiceContainerIds(services) {
  const ids = {};
  for (const service of services) {
    const id = getServiceContainerId(service);
    if (id) ids[service] = id;
  }
  return ids;
}

function resolveServiceName(serviceIds, containerId, containerName) {
  const normalizedId = String(containerId || '').trim();
  const normalizedName = String(containerName || '').trim();

  for (const [service, id] of Object.entries(serviceIds)) {
    if (!id) continue;
    if (id === normalizedId || id.startsWith(normalizedId) || normalizedId.startsWith(id)) {
      return service;
    }
  }

  for (const service of Object.keys(serviceIds)) {
    if (normalizedName.includes(`-${service}-`) || normalizedName.endsWith(`_${service}_1`)) {
      return service;
    }
  }

  return normalizedName || normalizedId;
}

function parseDockerStatsLine(entry, serviceName) {
  const mem = parseDockerPair(entry.MemUsage);
  const net = parseDockerPair(entry.NetIO);
  const block = parseDockerPair(entry.BlockIO);

  return {
    timestamp: new Date().toISOString(),
    service: serviceName,
    container: entry.Name,
    cpuPercent: parseDockerPercent(entry.CPUPerc),
    memUsageBytes: mem.leftBytes,
    memLimitBytes: mem.rightBytes,
    memPercent: parseDockerPercent(entry.MemPerc),
    netInputBytes: net.leftBytes,
    netOutputBytes: net.rightBytes,
    blockInputBytes: block.leftBytes,
    blockOutputBytes: block.rightBytes,
    pids: Number(entry.PIDs) || 0,
  };
}

function startDockerStatsSampler(outputPath, services, intervalMs = 5000) {
  const serviceIds = getServiceContainerIds(services);
  const samples = [];

  const collect = () => {
    const ids = Object.values(serviceIds).filter(Boolean);
    if (!ids.length) return;

    const stdout = runCommandSync(
      'docker',
      ['stats', '--no-stream', '--format', '{{json .}}', ...ids],
      { cwd: repoRoot }
    );

    const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (const line of lines) {
      const parsed = JSON.parse(line);
      const service = resolveServiceName(serviceIds, parsed.ID, parsed.Name);
      samples.push(parseDockerStatsLine(parsed, service));
    }
  };

  collect();
  const timer = setInterval(collect, intervalMs);

  return {
    stop() {
      clearInterval(timer);
      collect();
      writeJson(outputPath, samples);
      return samples;
    },
  };
}

async function captureComposeLogs(outputPath, options = {}) {
  const {
    since,
  } = options;

  const args = ['logs', '--timestamps', '--no-color'];
  if (since) {
    args.push('--since', since);
  }
  args.push('frontend', 'backend', 'mongodb');

  const result = await runCompose(args, { stream: false });
  writeText(outputPath, result.stdout);
  return result.stdout;
}

async function ensureRuntimeSeed(options = {}) {
  const { autoUp = true } = options;

  if (fs.existsSync(runtimeSeedPath)) {
    return readJson(runtimeSeedPath);
  }

  if (!autoUp) {
    throw new Error(`Missing runtime seed at ${runtimeSeedPath}`);
  }

  await runCommand('node', ['scripts/assignment3/up.js']);
  return readJson(runtimeSeedPath);
}

function formatBytes(value) {
  if (!value) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function estimateP95(latency) {
  if (typeof latency.p95 === 'number') {
    return latency.p95;
  }

  const lower = typeof latency.p90 === 'number' ? latency.p90 : latency.p50;
  const upper = typeof latency.p97_5 === 'number' ? latency.p97_5 : latency.p99;
  return Number((lower + (upper - lower) * ((95 - 90) / (97.5 - 90))).toFixed(2));
}

function toMarkdownTable(headers, rows) {
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`);
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  repoRoot,
  artifactsRoot,
  runtimeDir,
  runtimeSeedPath,
  metadataPath,
  log,
  ensureDir,
  writeJson,
  writeText,
  appendText,
  readJson,
  sleep,
  runCommand,
  runCommandSync,
  runCompose,
  runComposeSync,
  parseJsonLines,
  toSlug,
  fetchWithMetrics,
  waitForUrl,
  captureEnvironmentMetadata,
  getServiceContainerId,
  getServiceContainerIds,
  startDockerStatsSampler,
  captureComposeLogs,
  ensureRuntimeSeed,
  formatBytes,
  estimateP95,
  toMarkdownTable,
  parseByteValue,
};
