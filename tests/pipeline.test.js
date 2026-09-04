const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { runConversion } = require('../src/converter/index');

test('runConversion processes brief sample XML and returns output file details', async () => {
  const result = await runConversion('brief/police_report2_75766981.XML', {
    outputDir: 'dist/pipeline-output'
  });

  assert.strictEqual(result.totalCount, 45, 'Total guests must be 45');
  assert.strictEqual(result.vnCount, 33, 'VN guests must be 33');
  assert.strictEqual(result.foreignCount, 12, 'Foreign guests must be 12');
  assert.ok(fs.existsSync(result.vnFilePath), 'VN file must exist');
  assert.ok(fs.existsSync(result.foreignFilePath), 'Foreign file must exist');
});
