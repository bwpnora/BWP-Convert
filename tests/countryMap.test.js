const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const ExcelJS = require('exceljs');
const {
  LOOKUP_COUNTRY_LIST,
  COUNTRY_INDEX,
  normalizeForeignCountry
} = require('../src/converter/countryMap');

test('countryMap: validates 100% parity with brief/dklt nc ngoài.xlsx Lookup sheet', async () => {
  const templatePath = path.resolve(__dirname, '../brief/dklt nc ngoài.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet('Lookup');
  assert.ok(ws, 'Lookup sheet must exist in foreign template');

  const templateCountries = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const val = ws.getRow(r).getCell(1).value;
    if (val) templateCountries.push(String(val).trim());
  }

  assert.equal(LOOKUP_COUNTRY_LIST.length, 205, 'Must contain exactly 205 countries');
  assert.equal(templateCountries.length, 205, 'Template must contain exactly 205 countries');

  for (let i = 0; i < 205; i++) {
    assert.equal(
      LOOKUP_COUNTRY_LIST[i].display,
      templateCountries[i],
      `Mismatch at index ${i}: expected ${templateCountries[i]}, got ${LOOKUP_COUNTRY_LIST[i].display}`
    );
  }
});

test('countryMap: resolves ISO-2 codes correctly', () => {
  assert.equal(normalizeForeignCountry('TW'), 'TWN - Taiwan');
  assert.equal(normalizeForeignCountry('tw'), 'TWN - Taiwan');
  assert.equal(normalizeForeignCountry('US'), 'USA - United States of America');
  assert.equal(normalizeForeignCountry('KR'), 'KOR - Korea (South)');
  assert.equal(normalizeForeignCountry('JP'), 'JPN - Japan');
  assert.equal(normalizeForeignCountry('CN'), 'CHN - China');
  assert.equal(normalizeForeignCountry('TH'), 'THA - Thailand');
  assert.equal(normalizeForeignCountry('DE'), 'D - Germany');
  assert.equal(normalizeForeignCountry('GB'), 'GBR - United Kingdom of Great Britain and Northern Ireland');
  assert.equal(normalizeForeignCountry('FR'), 'FRA - France');
  assert.equal(normalizeForeignCountry('AU'), 'AUS - Australia');
  assert.equal(normalizeForeignCountry('SG'), 'SGP - Singapore');
  assert.equal(normalizeForeignCountry('VN'), 'VNM - Viet Nam');
});

test('countryMap: resolves hotel PMS aliases and practical edge cases', () => {
  assert.equal(normalizeForeignCountry('NI'), 'NGA - Nigeria');
  assert.equal(normalizeForeignCountry('NG'), 'NGA - Nigeria');
  assert.equal(normalizeForeignCountry('UK'), 'GBR - United Kingdom of Great Britain and Northern Ireland');
  assert.equal(normalizeForeignCountry('D'), 'D - Germany');
  assert.equal(normalizeForeignCountry('DEU'), 'D - Germany');
  assert.equal(normalizeForeignCountry('HK'), 'CHN - China');
  assert.equal(normalizeForeignCountry('HKG'), 'CHN - China');
  assert.equal(normalizeForeignCountry('HONG KONG'), 'CHN - China');
  assert.equal(normalizeForeignCountry('MACAU'), 'CHN - China');
  assert.equal(normalizeForeignCountry('SCOTLAND'), 'SC- - Scotland');
  assert.equal(normalizeForeignCountry('ENGLAND'), 'GBR - United Kingdom of Great Britain and Northern Ireland');
  assert.equal(normalizeForeignCountry('GREAT BRITAIN'), 'GBR - United Kingdom of Great Britain and Northern Ireland');
  assert.equal(normalizeForeignCountry('SOUTH KOREA'), 'KOR - Korea (South)');
  assert.equal(normalizeForeignCountry('NORTH KOREA'), 'PRK - Korea Democratic Peoples Republic of');
  assert.equal(normalizeForeignCountry('LAOS'), 'LAO - Lao Peoples Democratic Republic');
  assert.equal(normalizeForeignCountry('HOLLAND'), 'NLD - Netherland');
});

test('countryMap: resolves ISO-3 codes and full names', () => {
  assert.equal(normalizeForeignCountry('TWN'), 'TWN - Taiwan');
  assert.equal(normalizeForeignCountry('USA'), 'USA - United States of America');
  assert.equal(normalizeForeignCountry('Taiwan'), 'TWN - Taiwan');
  assert.equal(normalizeForeignCountry('germany'), 'D - Germany');
  assert.equal(normalizeForeignCountry('TWN - Taiwan'), 'TWN - Taiwan');
});

test('countryMap: defensive fallback for empty and unknown values', () => {
  assert.equal(normalizeForeignCountry(''), '');
  assert.equal(normalizeForeignCountry(null), '');
  assert.equal(normalizeForeignCountry(undefined), '');
  assert.equal(normalizeForeignCountry('   '), '');
  assert.equal(normalizeForeignCountry('UNKNOWN_COUNTRY_XYZ'), 'UNKNOWN_COUNTRY_XYZ');
});
