import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { hmr: false, middlewareMode: true },
});

try {
  const { optimizerVarianceLearningFactor } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/trainingSimulation.ts',
  );

  const distances = [0, 1, 2, 3, 4];
  const rows = distances.map((varianceLogDistance) => ({
    varianceLogDistance,
    sgd: optimizerVarianceLearningFactor('sgd', varianceLogDistance),
    adam: optimizerVarianceLearningFactor('adam', varianceLogDistance),
  }));

  assert.ok(rows[0].sgd > rows[1].sgd);
  assert.ok(rows[1].sgd > rows[2].sgd);
  assert.ok(rows[2].sgd > rows[3].sgd);
  assert.ok(rows[3].sgd > rows[4].sgd);
  assert.equal(rows[2].sgd, 0.5);
  assert.ok(rows.every((row) => row.adam === 1));
  assert.equal(optimizerVarianceLearningFactor('adam', undefined), 1);

  console.table(rows.map((row) => ({
    logVarianceGap: row.varianceLogDistance,
    sgdFactor: row.sgd.toFixed(6),
    adamFactor: row.adam.toFixed(6),
  })));
  console.log('\nAll optimizer variance-correction assertions passed.');
} finally {
  await server.close();
}
