const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

test('brief template files and XML sample exist', () => {
  assert.ok(fs.existsSync('brief/police_report2_75766981.XML'), 'Sample XML must exist');
  assert.ok(fs.existsSync('brief/tblt_vn_import.xlsx'), 'VN template must exist');
  assert.ok(fs.existsSync('brief/dklt nc ngoài.xlsx'), 'Foreign template must exist');
});
