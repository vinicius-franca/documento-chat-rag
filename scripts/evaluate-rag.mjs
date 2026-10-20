import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const evaluationPath = resolve('test/fixtures/corpus/evaluation.json');
const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const bookId = readArgument('--book-id') ?? process.env.EVALUATION_BOOK_ID;

if (!bookId) {
  throw new Error('Informe --book-id <UUID> ou configure EVALUATION_BOOK_ID.');
}

const evaluation = JSON.parse(await readFile(evaluationPath, 'utf8'));
const results = [];

for (const testCase of evaluation.cases) {
  const response = await fetch(`${apiBaseUrl}/questions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: testCase.question, bookIds: [bookId] }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao avaliar ${testCase.id}: HTTP ${response.status}.`);
  }

  const answer = await response.json();
  const sources = Array.isArray(answer.sources) ? answer.sources : [];
  const topFiveSources = sources.slice(0, 5);
  const expectedPageFound = topFiveSources.some(
    (source) => source.pageStart <= testCase.expectedPage && source.pageEnd >= testCase.expectedPage,
  );
  results.push({
    id: testCase.id,
    expectedPage: testCase.expectedPage,
    expectedPageFound,
    hasSources: sources.length > 0,
    insufficientContext: Boolean(answer.insufficientContext),
    sourceCount: sources.length,
    evaluatedSourceCount: topFiveSources.length,
  });
}

const recalled = results.filter((result) => result.expectedPageFound).length;
const withSources = results.filter((result) => result.hasSources).length;
console.log(
  JSON.stringify(
    {
      corpus: evaluation.corpus,
      total: results.length,
      recallAt5: recalled / results.length,
      answersWithSources: withSources / results.length,
      results,
    },
    null,
    2,
  ),
);

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}
