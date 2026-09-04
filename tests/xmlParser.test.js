const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const {
  parsePoliceReport,
  normalizeName,
  normalizeDate,
  normalizeGender,
  normalizeCountry
} = require('../src/converter/xmlParser');

test('parsePoliceReport extracts all 45 guests and categorizes VN vs Foreign', () => {
  const xmlData = fs.readFileSync('brief/police_report2_75766981.XML', 'utf-8');
  const result = parsePoliceReport(xmlData);

  assert.strictEqual(result.total, 45, 'Total guests should be 45');
  assert.strictEqual(result.vnGuests.length, 32, 'Total VN guests should be 32');
  assert.strictEqual(result.foreignGuests.length, 13, 'Total Foreign guests should be 13');

  // Verify first foreign guest: YANG WEIBAO
  const firstForeign = result.foreignGuests.find(g => g.name.includes('YANG WEIBAO'));
  assert.ok(firstForeign, 'YANG WEIBAO must be found in foreign guests');
  assert.strictEqual(firstForeign.room, '2710');
  assert.strictEqual(firstForeign.gender, 'M - Nam');
  assert.strictEqual(firstForeign.nationalityCode, 'CHN - China');

  // Verify first VN guest: TRAN HUU BINH
  const firstVn = result.vnGuests.find(g => g.name.includes('TRAN HUU BINH'));
  assert.ok(firstVn, 'TRAN HUU BINH must be found in VN guests');
  assert.strictEqual(firstVn.room, '2303');
  assert.strictEqual(firstVn.gender, 'M - Nam');
  assert.strictEqual(firstVn.nationalityCode, 'VNM - Viet Nam');
});

test('helper functions normalize fields correctly', () => {
  assert.strictEqual(normalizeName('Doe, John'), 'JOHN DOE');
  assert.strictEqual(normalizeName('', 'John', 'Doe'), 'JOHN DOE');
  assert.strictEqual(normalizeDate('30-08-26'), '30/08/2026');
  assert.strictEqual(normalizeDate('30/08/2026'), '30/08/2026');
  assert.strictEqual(normalizeGender('M'), 'M - Nam');
  assert.strictEqual(normalizeGender('F'), 'F - Nữ');
  assert.strictEqual(normalizeCountry('CN'), 'CHN - China');
  assert.strictEqual(normalizeCountry('KOREA (SOUTH)'), 'KOR - Korea (South)');
});

test('parsePoliceReport throws on invalid XML missing POLICE_REPORT2', () => {
  assert.throws(() => {
    parsePoliceReport('<ROOT></ROOT>');
  }, /Định dạng XML không hợp lệ/);
});