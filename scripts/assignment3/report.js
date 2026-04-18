const fs = require('fs');
const path = require('path');
const {
  artifactsRoot,
  metadataPath,
  readJson,
  ensureDir,
  log,
  toMarkdownTable,
  writeText,
} = require('./common');

const reportPath = path.join(__dirname, '..', '..', 'docs', 'assignment-3-report.md');

const historicalBaseline = {
  assignment1: {
    source: '/home/shai/Downloads/ASSIGNMENT_1_SUBMISSION (3).pdf',
    risks: {
      'Order Management': 20,
      'User Authentication': 15,
      'Product Catalog & Auto-Sync': 15,
      'Checkout & Payment Validation': 15,
      'AI Recommendation Engine': 12,
    },
  },
  assignment2: {
    source: '/home/shai/Downloads/ASSIGNMENT_2_SUBMISSION (3).pdf',
    tests: 103,
    automationCoveragePercent: 93.3,
    backendStatementsPercent: 53.45,
    overallStatementsPercent: 57.0,
    keyDefect: 'Checkout Amex edge-case validation defect',
  },
  midterm: {
    source: '/home/shai/Downloads/midterm-project/midterm-report.docx',
    updatedRisks: {
      'Product Catalog & Auto-Sync': 16,
      'User Authentication': 12,
      'Checkout & Payment Validation': 11,
      'AI Recommendation Engine': 10,
      'Order Management': 8,
    },
    backendStatementsPercent: 67.03,
    frontendStatementsPercent: 63.38,
    evidenceRule:
      'Earlier reports are treated as baseline, but fresh repo runs/artifacts are the source of truth when they differ.',
  },
  currentVerification: {
    backend: '84/84 passing',
    frontend: '27/27 passing',
    e2e: 'Checked-in Playwright report used as browser baseline reference',
  },
};

function maybeReadJson(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : null;
}

function relFromDocs(filePath) {
  return path.relative(path.join(__dirname, '..', '..', 'docs'), filePath).replace(/\\/g, '/');
}

function buildPerformanceSection(summary) {
  if (!summary) {
    return ['## Performance Testing', '', 'Performance artifacts have not been generated yet.', ''].join('\n');
  }

  const productPeak = summary.summaries.find(item => item.endpoint === 'products' && item.scenario === 'peak');
  const searchPeak = summary.summaries.find(item => item.endpoint === 'search' && item.scenario === 'peak');
  const authNormal = summary.summaries.find(item => item.endpoint === 'auth' && item.scenario === 'normal');
  const authPeak = summary.summaries.find(item => item.endpoint === 'auth' && item.scenario === 'peak');
  const checkoutNormal = summary.summaries.find(item => item.endpoint === 'checkout' && item.scenario === 'normal');
  const checkoutPeak = summary.summaries.find(item => item.endpoint === 'checkout' && item.scenario === 'peak');
  const checkoutEndurance = summary.summaries.find(item => item.endpoint === 'checkout' && item.scenario === 'endurance');

  return [
    '## Performance Testing',
    '',
    '### Methodology',
    '',
    '- Environment: Docker Compose using `docker-compose.yml` plus `docker-compose.assignment3.yml`.',
    '- Warm-up: 15 seconds before each endpoint family.',
    '- Scenarios: normal (10 connections / 60s), peak (25 / 60s), spike (60 / 30s), endurance (10 / 300s).',
    '- Endpoints: `GET /api/products`, `GET /api/search?q=laptop`, `POST /api/auth/login`, `POST /api/checkout/create-order`.',
    '- Resource sampling: `docker stats` every 5 seconds for frontend, backend, and MongoDB.',
    '',
    '### Results',
    '',
    toMarkdownTable(
      [
        'Endpoint',
        'Scenario',
        'Average (ms)',
        'Median (ms)',
        'Estimated p95 (ms)',
        'Throughput (rps)',
        'Error rate',
        'Memory growth',
        'Threshold',
      ],
      summary.summaries.map(item => [
        item.endpointLabel,
        item.scenario,
        `${item.latencyAverageMs}`,
        `${item.latencyMedianMs}`,
        `${item.latencyP95Ms}`,
        `${item.throughputRps}`,
        `${item.errorRatePercent}%`,
        `${item.memoryGrowthPercent}%`,
        item.thresholdStatus,
      ])
    ),
    '',
    '### Evidence',
    '',
    `- Raw results: [performance raw JSON](./${relFromDocs(path.join(artifactsRoot, 'performance', 'raw'))})`,
    `- Docker stats: [performance stats](./${relFromDocs(path.join(artifactsRoot, 'performance', 'stats'))})`,
    `- Compose log: [performance log](./${relFromDocs(path.join(artifactsRoot, 'performance', 'logs', 'compose.log'))})`,
    `- p95 chart: ![Performance p95](./${relFromDocs(path.join(artifactsRoot, 'performance', 'charts', 'p95-latency.svg'))})`,
    `- Throughput chart: ![Performance throughput](./${relFromDocs(path.join(artifactsRoot, 'performance', 'charts', 'throughput.svg'))})`,
    `- Error rate chart: ![Performance error rate](./${relFromDocs(path.join(artifactsRoot, 'performance', 'charts', 'error-rate.svg'))})`,
    `- Per-scenario resource charts: [performance charts](./${relFromDocs(path.join(artifactsRoot, 'performance', 'charts'))})`,
    '',
    '### Analysis',
    '',
    `- Product discovery and search outperformed the Assignment 3 thresholds under normal and peak load. The measured peak p95 values were ${productPeak?.latencyP95Ms ?? 'n/a'} ms for product discovery and ${searchPeak?.latencyP95Ms ?? 'n/a'} ms for search, both far below the 900 ms ceiling.`,
    `- Authentication remained the clearest latency bottleneck. Its normal and peak p95 values were ${authNormal?.latencyP95Ms ?? 'n/a'} ms and ${authPeak?.latencyP95Ms ?? 'n/a'} ms, which missed the 400 ms and 800 ms thresholds even though error rate stayed at 0%.`,
    `- Checkout also missed the normal and peak latency targets with p95 values of ${checkoutNormal?.latencyP95Ms ?? 'n/a'} ms and ${checkoutPeak?.latencyP95Ms ?? 'n/a'} ms, but endurance still passed because memory growth stayed at ${checkoutEndurance?.memoryGrowthPercent ?? 'n/a'}% and no request failures were recorded.`,
    '',
  ].join('\n');
}

function buildMutationSection(summary) {
  if (!summary) {
    return ['## Mutation Testing', '', 'Mutation artifacts have not been generated yet.', ''].join('\n');
  }

  const authFile = summary.files.find(item => item.filePath === 'middleware/auth.js');
  const checkoutFile = summary.files.find(item => item.filePath === 'routes/checkout.js');
  const ordersFile = summary.files.find(item => item.filePath === 'routes/orders.js');
  const searchFile = summary.files.find(item => item.filePath === 'routes/search.js');

  return [
    '## Mutation Testing',
    '',
    '### Methodology',
    '',
    '- Tooling: StrykerJS running against the existing backend Jest suite.',
    '- Mutated files: `backend/middleware/auth.js`, `backend/routes/orders.js`, `backend/routes/checkout.js`, `backend/routes/search.js`.',
    '- Deferred scope: `backend/routes/products.js` remains excluded in this first campaign because the midterm identified it as the biggest detectability gap and its size/branching would distort the first mutation run.',
    '',
    '### Results',
    '',
    toMarkdownTable(
      ['Module', 'Mutants created', 'Killed', 'Timed out', 'Undetected', 'Mutation score'],
      summary.files.map(item => [
        item.filePath,
        `${item.mutantsCreated}`,
        `${item.mutantsKilled}`,
        `${item.timedOut}`,
        `${item.mutantsSurvived}`,
        `${item.mutationScore}%`,
      ])
    ),
    '',
    `Overall mutation score: ${summary.totals.mutationScore}%`,
    '',
    `- Timed-out mutants: ${summary.totals.timedOut}`,
    `- Undetected mutants: ${summary.totals.mutantsSurvived}`,
    '',
    '### Evidence',
    '',
    `- Raw JSON report: [mutation raw JSON](./${relFromDocs(path.join(artifactsRoot, 'mutation', 'raw-report.json'))})`,
    `- Summary markdown: [mutation summary](./${relFromDocs(path.join(artifactsRoot, 'mutation', 'summary.md'))})`,
    `- HTML report: [backend mutation report](./${relFromDocs(path.join(__dirname, '..', '..', 'backend', 'reports', 'mutation', 'html', 'index.html'))})`,
    '',
    '### Analysis',
    '',
    '- Surviving or no-coverage mutants indicate missing assertions, not just missing lines executed.',
    `- The strongest protected scope was authentication middleware at ${authFile?.mutationScore ?? 'n/a'}%, followed by search at ${searchFile?.mutationScore ?? 'n/a'}%. Those files show that focused tests can detect most behavioral changes in smaller control-flow surfaces.`,
    `- Checkout and order tracking remained the weaker areas at ${checkoutFile?.mutationScore ?? 'n/a'}% and ${ordersFile?.mutationScore ?? 'n/a'}%. The surviving mutants cluster around generated order numbers, request normalization, status advancement, totals, and delivery-date calculations, which points to missing behavioral assertions rather than missing line coverage.`,
    '- Timed-out mutants still count as detected by Stryker, but they also signal heavier or less deterministic execution paths that deserve follow-up when the suite is expanded.',
    '- The next mutation-expansion target should be `backend/routes/products.js`, because the midterm already showed that low detectability in catalog/recommendation paths is still the highest remaining QA risk.',
    '',
  ].join('\n');
}

function buildChaosSection(summary) {
  if (!summary) {
    return ['## Chaos / Fault Injection Testing', '', 'Chaos artifacts have not been generated yet.', ''].join('\n');
  }

  const backendPause = summary.scenarios.find(item => item.scenario === 'backend-pause');
  const mongodbRestart = summary.scenarios.find(item => item.scenario === 'mongodb-restart');
  const cpuThrottle = summary.scenarios.find(item => item.scenario === 'cpu-throttle');

  return [
    '## Chaos / Fault Injection Testing',
    '',
    '### Methodology',
    '',
    '- Probe cadence: every 2 seconds.',
    '- Probe set: frontend `/`, backend `/health`, backend `/health/db`, `GET /api/products`, `GET /api/search?q=laptop`, `POST /api/auth/login`, `POST /api/orders/track`.',
    '- Scenarios:',
    '  1. Pause backend container for 30 seconds.',
    '  2. Stop MongoDB for 45 seconds and then restart it.',
    '  3. Throttle backend to 0.25 CPU for 120 seconds while peak search load runs.',
    '',
    '### Results',
    '',
    toMarkdownTable(
      ['Scenario', 'Availability', 'MTTR', 'Endpoints impacted'],
      summary.scenarios.map(item => [
        item.scenario,
        `${item.availabilityPercent}%`,
        item.mttrMs === null ? (item.recoveryRequired ? 'unrecovered' : 'n/a') : `${item.mttrMs} ms`,
        item.errorPropagation.join(', ') || 'None',
      ])
    ),
    '',
    '### Evidence',
    '',
    ...summary.scenarios.flatMap(item => [
      `- ${item.scenario} probes: [CSV](./${relFromDocs(path.join(artifactsRoot, 'chaos', item.scenario, 'probes.csv'))})`,
      `- ${item.scenario} logs: [scenario log](./${relFromDocs(path.join(artifactsRoot, 'chaos', 'logs', `${item.scenario}.log`))})`,
      `- ${item.scenario} availability chart: ![${item.scenario} availability](./${relFromDocs(path.join(artifactsRoot, 'chaos', 'charts', `${item.scenario}-availability.svg`))})`,
      `- ${item.scenario} latency delta: ![${item.scenario} latency delta](./${relFromDocs(path.join(artifactsRoot, 'chaos', 'charts', `${item.scenario}-latency-delta.svg`))})`,
      `- ${item.scenario} latency trend: ![${item.scenario} latency](./${relFromDocs(path.join(artifactsRoot, 'chaos', 'charts', `${item.scenario}-latency-trend.svg`))})`,
    ]),
    '',
    '### Analysis',
    '',
    `- Backend pause produced ${backendPause?.availabilityPercent ?? 'n/a'}% aggregate availability with an MTTR of ${backendPause?.mttrMs ?? 'n/a'} ms. The frontend shell stayed available, but every backend-dependent probe degraded together, which confirms a broad API blast radius when the service is fully paused.`,
    `- MongoDB restart produced ${mongodbRestart?.availabilityPercent ?? 'n/a'}% aggregate availability with an MTTR of ${mongodbRestart?.mttrMs ?? 'n/a'} ms. \`/health\` itself stayed up, while \`/health/db\`, catalog reads, authentication, and order tracking failed, which cleanly separates process liveness from database readiness.`,
    `- CPU throttling preserved ${cpuThrottle?.availabilityPercent ?? 'n/a'}% availability with no recovery event required. That makes it a degradation scenario rather than an outage scenario, and the latency-delta charts provide the useful evidence for capacity planning.`,
    '',
  ].join('\n');
}

async function main() {
  ensureDir(path.dirname(reportPath));

  const metadata = maybeReadJson(metadataPath);
  const performanceSummary = maybeReadJson(path.join(artifactsRoot, 'performance', 'summary.json'));
  const mutationSummary = maybeReadJson(path.join(artifactsRoot, 'mutation', 'summary.json'));
  const chaosSummary = maybeReadJson(path.join(artifactsRoot, 'chaos', 'summary.json'));

  const report = [
    '# Assignment 3: Experimental Engineering',
    '',
    '## Scope And Sources',
    '',
    '- System under test: Fusion Electronics MERN stack e-commerce application.',
    '- Historical baseline sources:',
    `  - Assignment 1: \`${historicalBaseline.assignment1.source}\``,
    `  - Assignment 2: \`${historicalBaseline.assignment2.source}\``,
    `  - Midterm: \`${historicalBaseline.midterm.source}\``,
    '- Fresh Assignment 3 experiments treat current local artifacts as the source of truth wherever they differ from earlier reports.',
    '',
    '## Historical Baseline',
    '',
    toMarkdownTable(
      ['Phase', 'Metric', 'Value'],
      [
        ['Assignment 1', 'Order Management risk', `${historicalBaseline.assignment1.risks['Order Management']}`],
        ['Assignment 1', 'User Authentication risk', `${historicalBaseline.assignment1.risks['User Authentication']}`],
        ['Assignment 1', 'Product Catalog & Auto-Sync risk', `${historicalBaseline.assignment1.risks['Product Catalog & Auto-Sync']}`],
        ['Assignment 1', 'Checkout & Payment Validation risk', `${historicalBaseline.assignment1.risks['Checkout & Payment Validation']}`],
        ['Assignment 1', 'AI Recommendation Engine risk', `${historicalBaseline.assignment1.risks['AI Recommendation Engine']}`],
        ['Assignment 2', 'Automated tests', `${historicalBaseline.assignment2.tests}`],
        ['Assignment 2', 'Automation coverage', `${historicalBaseline.assignment2.automationCoveragePercent}%`],
        ['Assignment 2', 'Backend statements', `${historicalBaseline.assignment2.backendStatementsPercent}%`],
        ['Assignment 2', 'Overall statements', `${historicalBaseline.assignment2.overallStatementsPercent}%`],
        ['Assignment 2', 'Known defect', historicalBaseline.assignment2.keyDefect],
        ['Midterm', 'Product Catalog & Auto-Sync risk', `${historicalBaseline.midterm.updatedRisks['Product Catalog & Auto-Sync']}`],
        ['Midterm', 'User Authentication risk', `${historicalBaseline.midterm.updatedRisks['User Authentication']}`],
        ['Midterm', 'Checkout & Payment Validation risk', `${historicalBaseline.midterm.updatedRisks['Checkout & Payment Validation']}`],
        ['Midterm', 'AI Recommendation Engine risk', `${historicalBaseline.midterm.updatedRisks['AI Recommendation Engine']}`],
        ['Midterm', 'Order Management risk', `${historicalBaseline.midterm.updatedRisks['Order Management']}`],
        ['Midterm', 'Backend statements', `${historicalBaseline.midterm.backendStatementsPercent}%`],
        ['Midterm', 'Frontend statements', `${historicalBaseline.midterm.frontendStatementsPercent}%`],
        ['Current repo', 'Backend baseline', historicalBaseline.currentVerification.backend],
        ['Current repo', 'Frontend baseline', historicalBaseline.currentVerification.frontend],
        ['Current repo', 'E2E baseline', historicalBaseline.currentVerification.e2e],
      ]
    ),
    '',
    '## Environment',
    '',
    metadata
      ? toMarkdownTable(
          ['Field', 'Value'],
          [
            ['Captured at', metadata.capturedAt],
            ['Host', metadata.os.hostname],
            ['OS', `${metadata.os.platform} ${metadata.os.release} (${metadata.os.arch})`],
            ['CPU threads', `${metadata.os.cpus}`],
            ['Total memory', `${metadata.os.totalMemoryBytes}`],
            ['Node', metadata.tools.node],
            ['npm', metadata.tools.npm],
            ['Docker', metadata.tools.docker],
            ['Docker Compose', metadata.tools.dockerCompose],
            ['Git commit', metadata.tools.gitCommit],
          ]
        )
      : 'Environment metadata has not been captured yet.\n',
    '',
    buildPerformanceSection(performanceSummary),
    buildMutationSection(mutationSummary),
    buildChaosSection(chaosSummary),
    '## Expected Vs Observed Behaviour',
    '',
    '- Assignment 1 and the midterm both treated authentication, checkout, catalog, and order management as the most important risk areas. Assignment 3 confirmed that framing, but it split the risks more clearly: discovery/search performed well under load, while authentication and checkout remained the main latency bottlenecks.',
    '- Assignment 2 improved automation depth, and the current mutation run shows that the gains are real but uneven. Authentication middleware and search are now strongly protected, while checkout and order tracking still allow too many meaningful mutants to survive.',
    '- The midterm warned that catalog/recommendation detectability was still a major gap. Assignment 3 does not contradict that finding; instead, it reinforces it by deferring `backend/routes/products.js` from the first mutation campaign and recommending it as the next expansion target.',
    '- Chaos testing added evidence that was not available in the earlier assignments: backend pause and MongoDB restart both cause broad user-visible degradation, while CPU throttling hurts latency without causing outright downtime. That distinction is important for resilience planning and was not visible from coverage metrics alone.',
    '',
    '## Lessons Learned',
    '',
    '- High line/test coverage and passing suites did not guarantee acceptable performance. Authentication and checkout still missed their latency goals even though functional tests were green.',
    '- Health signalling matters at multiple levels. `/health` can remain available while `/health/db` and business endpoints fail, so both liveness and dependency-specific readiness checks are necessary.',
    '- Mutation testing was most valuable when it exposed weak assertions around business behavior such as order numbering, normalization, totals, and status progression rather than just missing executed lines.',
    '',
    '## Recommendations',
    '',
    '- Expand mutation testing into `backend/routes/products.js` and `backend/models/product.js` after stabilising a larger catalog/recommendation integration suite.',
    '- Keep the new health endpoints and Docker Compose Assignment 3 override as permanent QA infrastructure because both chaos and deployment scripts already depend on them.',
    '- Add the performance and mutation manual workflow to the team’s regression playbook so the same evidence can be reproduced without altering the main CI gate.',
    '- Treat chaos outcomes that affect `/health/db`, catalog reads, or order tracking as resilience backlog items for the next QA iteration because those are the user-visible blast-radius indicators used in this assignment.',
    '',
  ].join('\n');

  writeText(reportPath, `${report}\n`);
  log(`Assignment 3 report written to ${reportPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
