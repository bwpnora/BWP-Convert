const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const {
  parsePoliceReport,
  normalizeName,
  normalizeDate,
  normalizeBirthDate,
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
  assert.strictEqual(firstVn.arrival, '30/08/2026');
  assert.strictEqual(firstVn.departure, '02/09/2026');

  // Verify Nam Thanh,Pham is routed to VN guests
  const namThanh = result.vnGuests.find(g => g.name.includes('NAM THANH PHAM'));
  assert.ok(namThanh, 'Nam Thanh,Pham must be routed to VN guests');
  assert.strictEqual(namThanh.nationalityCode, 'VNM - Viet Nam');
  assert.strictEqual(namThanh.arrival, '30/08/2026');
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
  assert.strictEqual(normalizeCountry('TW'), 'TWN - Taiwan');
  assert.strictEqual(normalizeCountry('NI'), 'NGA - Nigeria');
});

test('parsePoliceReport throws on invalid XML missing POLICE_REPORT2', () => {
  assert.throws(() => {
    parsePoliceReport('<ROOT></ROOT>');
  }, /Định dạng XML không hợp lệ/);
});

test('normalizeBirthDate resolves birth dates accurately with CCCD or age fallback', () => {
  // With 12-digit CCCD matching 2-digit year
  assert.strictEqual(normalizeBirthDate('08-12-92', '079092022759'), '08/12/1992', 'Male born in 1992 (century digit 0)');
  assert.strictEqual(normalizeBirthDate('05-01-97', '068197014622'), '05/01/1997', 'Female born in 1997 (century digit 1)');
  assert.strictEqual(normalizeBirthDate('06-05-03', '068303000637'), '06/05/2003', 'Female born in 2003 (century digit 3)');
  assert.strictEqual(normalizeBirthDate('01-01-05', '001205001234'), '01/01/2005', 'Male born in 2005 (century digit 2)');

  // Without CCCD or non-CCCD ID (fallback: birth date cannot be in the future)
  assert.strictEqual(normalizeBirthDate('09-09-79', 'K0200854'), '09/09/1979');
  assert.strictEqual(normalizeBirthDate('28-05-89', 'C9825869'), '28/05/1989');
  assert.strictEqual(normalizeBirthDate('19-01-03', 'C9815961'), '19/01/2003');
  assert.strictEqual(normalizeBirthDate('21-01-83', 'N1993057'), '21/01/1983');

  // Standard 4-digit and ISO formats
  assert.strictEqual(normalizeBirthDate('08-12-1992'), '08/12/1992');
  assert.strictEqual(normalizeBirthDate('1992-12-08'), '08/12/1992');
  assert.strictEqual(normalizeBirthDate('08-12-92', '079092022759', '-'), '08-12-1992');

  // Edge cases
  assert.strictEqual(normalizeBirthDate('XX/XX/XX'), 'XX/XX/XX');
  assert.strictEqual(normalizeBirthDate(''), '');
  assert.strictEqual(normalizeBirthDate(null), '');
});

test('parsePoliceReport correctly formats birth date for brief/police_report2_77548343.XML guests', () => {
  const xmlData = fs.readFileSync('brief/police_report2_77548343.XML', 'utf-8');
  const result = parsePoliceReport(xmlData);

  const catGuest = result.vnGuests.find(g => g.name.includes('CAT NGUYEN HUY QUANG'));
  assert.ok(catGuest, 'CAT NGUYEN HUY QUANG must be found');
  assert.strictEqual(catGuest.dob, '08/12/1992', 'CAT NGUYEN HUY QUANG birth date must be 08/12/1992, not 2092');

  const ngaGuest = result.vnGuests.find(g => g.name.includes('NGUYEN THI NGA'));
  assert.ok(ngaGuest, 'NGUYEN THI NGA must be found');
  assert.strictEqual(ngaGuest.dob, '05/01/1997', 'NGUYEN THI NGA birth date must be 05/01/1997, not 2097');

  const bichGuest = result.vnGuests.find(g => g.name.includes('NGUYEN HA NGOC BICH'));
  assert.ok(bichGuest, 'NGUYEN HA NGOC BICH must be found');
  assert.strictEqual(bichGuest.dob, '06/05/2003');

  const tuyenGuest = result.vnGuests.find(g => g.name.includes('DUONG PHUOC TUYEN'));
  assert.ok(tuyenGuest, 'DUONG PHUOC TUYEN must be found');
  assert.strictEqual(tuyenGuest.dob, '09/09/1979');
});