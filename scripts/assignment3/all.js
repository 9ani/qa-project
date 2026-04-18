const { runCommand, log } = require('./common');

async function main() {
  const steps = [
    'scripts/assignment3/up.js',
    'scripts/assignment3/performance.js',
    'scripts/assignment3/mutation.js',
    'scripts/assignment3/chaos.js',
    'scripts/assignment3/report.js',
  ];

  for (const step of steps) {
    log(`Running ${step}`);
    await runCommand('node', [step]);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

