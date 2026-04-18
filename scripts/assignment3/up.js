const {
  log,
  runtimeDir,
  runtimeSeedPath,
  ensureDir,
  writeJson,
  runCommand,
  runCompose,
  waitForUrl,
  captureEnvironmentMetadata,
} = require('./common');

async function main() {
  ensureDir(runtimeDir);

  log('Starting Assignment 3 Docker Compose environment');
  await runCompose(['up', '-d', '--build']);

  log('Waiting for backend readiness');
  await waitForUrl('http://127.0.0.1:5000/health/ready', {
    acceptableStatus: status => status === 200,
  });

  log('Waiting for frontend availability');
  await waitForUrl('http://127.0.0.1:3000/', {
    acceptableStatus: status => status >= 200 && status < 400,
  });

  log('Capturing environment metadata');
  await captureEnvironmentMetadata();

  log('Seeding deterministic Assignment 3 runtime data');
  const result = await runCompose(
    ['exec', '-T', 'backend', 'node', 'scripts/assignment3-seed.js'],
    { stream: false }
  );

  const payload = JSON.parse(result.stdout.trim().split(/\r?\n/).pop());
  payload.services = {
    frontend: 'http://127.0.0.1:3000',
    backend: 'http://127.0.0.1:5000',
  };

  writeJson(runtimeSeedPath, payload);
  log(`Runtime seed written to ${runtimeSeedPath}`);
}

main().catch(async error => {
  console.error(error);
  await runCommand('node', ['scripts/assignment3/metadata.js']).catch(() => {});
  process.exit(1);
});
