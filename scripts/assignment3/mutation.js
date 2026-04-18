const fs = require('fs');
const path = require('path');
const {
  artifactsRoot,
  ensureDir,
  log,
  readJson,
  runCommand,
  toMarkdownTable,
  writeJson,
  writeText,
} = require('./common');

const mutationDir = path.join(artifactsRoot, 'mutation');
const backendDir = path.join(__dirname, '..', '..', 'backend');
const rawReportPath = path.join(backendDir, 'reports', 'mutation', 'mutation-report.json');

function collectFiles(rawReport) {
  if (rawReport.files && typeof rawReport.files === 'object') {
    return Object.entries(rawReport.files);
  }

  if (rawReport.sourceFiles && typeof rawReport.sourceFiles === 'object') {
    return Object.entries(rawReport.sourceFiles);
  }

  return [];
}

function normalizeMutants(fileEntry) {
  const [, fileData] = fileEntry;
  if (Array.isArray(fileData.mutants)) return fileData.mutants;
  if (Array.isArray(fileData.mutantResults)) return fileData.mutantResults;
  return [];
}

function summarize(rawReport) {
  const files = collectFiles(rawReport);
  const fileSummaries = files.map(([filePath, fileData]) => {
    const mutants = normalizeMutants([filePath, fileData]);
    const killed = mutants.filter(mutant => mutant.status === 'Killed').length;
    const survived = mutants.filter(mutant => mutant.status === 'Survived').length;
    const noCoverage = mutants.filter(mutant => mutant.status === 'NoCoverage').length;
    const timedOut = mutants.filter(mutant => mutant.status === 'Timeout').length;
    const runtimeErrors = mutants.filter(mutant => mutant.status === 'RuntimeError').length;
    const compileErrors = mutants.filter(mutant => mutant.status === 'CompileError').length;
    const undetected = survived + noCoverage;
    const detected = killed + timedOut + runtimeErrors + compileErrors;

    return {
      filePath,
      mutantsCreated: mutants.length,
      mutantsKilled: killed,
      mutantsDetected: detected,
      mutantsSurvived: undetected,
      survivedStrict: survived,
      noCoverage,
      timedOut,
      runtimeErrors,
      compileErrors,
      mutationScore: mutants.length ? Number(((detected / mutants.length) * 100).toFixed(2)) : 0,
      survivors: mutants
        .filter(mutant => mutant.status === 'Survived' || mutant.status === 'NoCoverage')
        .map(mutant => ({
          id: mutant.id,
          status: mutant.status,
          mutatorName: mutant.mutatorName,
          replacement: mutant.replacement,
          location: mutant.location,
        })),
      timeouts: mutants
        .filter(mutant => mutant.status === 'Timeout')
        .map(mutant => ({
          id: mutant.id,
          status: mutant.status,
          mutatorName: mutant.mutatorName,
          replacement: mutant.replacement,
          location: mutant.location,
        })),
    };
  });

  const totals = fileSummaries.reduce(
    (acc, summary) => {
      acc.mutantsCreated += summary.mutantsCreated;
      acc.mutantsKilled += summary.mutantsKilled;
      acc.mutantsDetected += summary.mutantsDetected;
      acc.mutantsSurvived += summary.mutantsSurvived;
      acc.noCoverage += summary.noCoverage;
      acc.timedOut += summary.timedOut;
      acc.runtimeErrors += summary.runtimeErrors;
      acc.compileErrors += summary.compileErrors;
      return acc;
    },
    {
      mutantsCreated: 0,
      mutantsKilled: 0,
      mutantsDetected: 0,
      mutantsSurvived: 0,
      noCoverage: 0,
      timedOut: 0,
      runtimeErrors: 0,
      compileErrors: 0,
    }
  );

  totals.mutationScore = totals.mutantsCreated
    ? Number(((totals.mutantsDetected / totals.mutantsCreated) * 100).toFixed(2))
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    totals,
    files: fileSummaries,
  };
}

async function main() {
  ensureDir(mutationDir);

  log('Running backend mutation testing with StrykerJS');
  await runCommand('npm', ['run', 'mutation'], { cwd: backendDir });

  if (!fs.existsSync(rawReportPath)) {
    throw new Error(`Expected Stryker JSON report at ${rawReportPath}`);
  }

  const rawReport = readJson(rawReportPath);
  const summary = summarize(rawReport);

  writeJson(path.join(mutationDir, 'raw-report.json'), rawReport);
  writeJson(path.join(mutationDir, 'summary.json'), summary);

  const tableRows = summary.files.map(file => [
    file.filePath,
    String(file.mutantsCreated),
    String(file.mutantsKilled),
    String(file.timedOut),
    String(file.mutantsSurvived),
    `${file.mutationScore}%`,
  ]);

  const survivorNotes = summary.files
    .flatMap(file =>
      file.survivors.slice(0, 5).map(mutant => {
        const line = mutant.location?.start?.line || 'n/a';
        return `- ${file.filePath}:${line} ${mutant.status} via ${mutant.mutatorName || 'unknown mutator'}${mutant.replacement ? ` -> ${mutant.replacement}` : ''}`;
      })
    )
    .join('\n');

  const timeoutNotes = summary.files
    .flatMap(file =>
      file.timeouts.slice(0, 3).map(mutant => {
        const line = mutant.location?.start?.line || 'n/a';
        return `- ${file.filePath}:${line} Timeout via ${mutant.mutatorName || 'unknown mutator'}${mutant.replacement ? ` -> ${mutant.replacement}` : ''}`;
      })
    )
    .join('\n');

  writeText(
    path.join(mutationDir, 'summary.md'),
    [
      '# Assignment 3 Mutation Summary',
      '',
      toMarkdownTable(
        ['Module', 'Mutants created', 'Killed', 'Timed out', 'Undetected', 'Mutation score'],
        tableRows
      ),
      '',
      `Overall mutation score: ${summary.totals.mutationScore}%`,
      '',
      `- Total mutants created: ${summary.totals.mutantsCreated}`,
      `- Total mutants killed: ${summary.totals.mutantsKilled}`,
      `- Total timed out: ${summary.totals.timedOut}`,
      `- Total undetected mutants: ${summary.totals.mutantsSurvived}`,
      `- No coverage mutants: ${summary.totals.noCoverage}`,
      '',
      '## Surviving mutants snapshot',
      '',
      survivorNotes || '- All generated mutants were killed.',
      '',
      '## Timeout snapshot',
      '',
      timeoutNotes || '- No timeout mutants were recorded.',
      '',
      `HTML report: ${path.relative(mutationDir, path.join(backendDir, 'reports', 'mutation', 'html', 'index.html'))}`,
      '',
    ].join('\n')
  );

  log('Mutation experiment artifacts generated');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
