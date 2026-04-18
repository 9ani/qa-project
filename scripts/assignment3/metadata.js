const { captureEnvironmentMetadata, log } = require('./common');

async function main() {
  log('Capturing Assignment 3 environment metadata');
  await captureEnvironmentMetadata();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

