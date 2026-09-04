const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const {
  parsePoliceReport,
  normalizeName,
  normalizeDate,
  normalizeGender,
  normalizeCountry,
  COUNTRY_LOOKUP_MAP
} = require('../src/converter/xmlParser');

test('parsePoliceReport extracts all 45 guests and categorizes 33 VN vs 12 Foreign', () => {
  const xmlData = fs.readFileSync('brief/police_report2_75766981.XML', 'utf-8');
  const result = parsePoliceReport(xmlData);

  assert.strictEqual(result.total, 45, 'Total guests should be 45');
  assert.strictEqual(result.vnGuests.length, 33, 'Total VN guests should be 33');
  assert.strictEqual(result.foreignGuests.length, 12, 'Total Foreign guests should be 12');

  // Verify first foreign guest: YANG WEIBAO
  const firstForeign = result.foreignGuests.find(g => g.name.includes('YANG WEIBAO'));
  assert.ok(firstForeign, 'YANG WEIBAO must be found in foreign guests');
  assert.strictEqual(firstForeign.room, '2710');
  assert.strictEqual(firstForeign.gender, 'M - Nam');
  assert.strictEqual(firstForeign.nationalityCode, 'CHN - China');
  assert.strictEqual(firstForeign.arrival, '30/08/2026');
  assert.strictEqual(firstForeign.departure, '02/09/2026');

  // Verify all foreign guests have valid known country codes (none are 'Unknown')
  for (const fg of result.foreignGuests) {
    assert.notStrictEqual(fg.nationalityCode, 'Unknown', `${fg.name} must not have Unknown country code`);
    assert.ok(
      ['CHN - China', 'KOR - Korea (South)', 'THA - Thailand'].includes(fg.nationalityCode),
      `Unexpected foreign nationality: ${fg.nationalityCode}`
    );
  }

  // Verify first VN guest: TRAN HUU BINH
  const firstVn = result.vnGuests.find(g => g.name.includes('TRAN HUU BINH'));
  assert.ok(firstVn, 'TRAN HUU BINH must be found in VN guests');
  assert.strictEqual(firstVn.room, '2303');
  assert.strictEqual(firstVn.gender, 'M - Nam');
  assert.strictEqual(firstVn.nationalityCode, 'VNM - Viet Nam');
  assert.strictEqual(firstVn.arrival, '30-08-2026');
  assert.strictEqual(firstVn.departure, '02-09-2026');

  // Verify Nam Thanh,Pham is routed to VN guests
  const namThanh = result.vnGuests.find(g => g.name.includes('NAM THANH PHAM'));
  assert.ok(namThanh, 'Nam Thanh,Pham must be routed to VN guests');
  assert.strictEqual(namThanh.nationalityCode, 'VNM - Viet Nam');
  assert.strictEqual(namThanh.arrival, '30-08-2026');
});

test('normalizeName does not invert Vietnamese names and strips commas', () => {
  assert.strictEqual(normalizeName('TRAN,KHAC MY HANG'), 'TRAN KHAC MY HANG');
  assert.strictEqual(normalizeName('Nam Thanh,Pham'), 'NAM THANH PHAM');
  assert.strictEqual(normalizeName('', 'KHAC MY HANG', 'TRAN'), 'KHAC MY HANG TRAN');
});

test('normalizeDate supports customizable separator', () => {
  assert.strictEqual(normalizeDate('30-08-26', '20', '-'), '30-08-2026');
  assert.strictEqual(normalizeDate('30-08-26', '20', '/'), '30/08/2026');
  assert.strictEqual(normalizeDate('30/08/2026', '20', '-'), '30-08-2026');
  assert.strictEqual(normalizeDate('30/08/2026', '20', '/'), '30/08/2026');
});

test('normalizeGender and normalizeCountry handle various inputs', () => {
  assert.strictEqual(normalizeGender('M'), 'M - Nam');
  assert.strictEqual(normalizeGender('F'), 'F - Nữ');
  assert.strictEqual(normalizeCountry('TH'), 'THA - Thailand');
  assert.strictEqual(normalizeCountry('THA'), 'THA - Thailand');
  assert.strictEqual(normalizeCountry('THAILAND'), 'THA - Thailand');
  assert.strictEqual(normalizeCountry('CN'), 'CHN - China');
  assert.strictEqual(normalizeCountry('CHN'), 'CHN - China');
  assert.strictEqual(normalizeCountry('KR'), 'KOR - Korea (South)');
  assert.strictEqual(normalizeCountry('KOR'), 'KOR - Korea (South)');
});

test('parsePoliceReport throws on invalid XML missing POLICE_REPORT2', () => {
  assert.throws(() => {
    parsePoliceReport('<ROOT></ROOT>');
  }, /Định dạng XML không hợp lệ/);
});