const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { runConversion } = require('../src/converter/index');

test('end-to-end output validation for VN and Foreign Excel files', async () => {
  const outputDir = 'dist/e2e-output';
  const result = await runConversion('brief/police_report2_75766981.XML', {
    outputDir,
    timestamp: 'e2e'
  });

  assert.strictEqual(result.vnCount, 33, 'Total VN guests should be 33');
  assert.strictEqual(result.foreignCount, 12, 'Total Foreign guests should be 12');
  assert.ok(fs.existsSync(result.vnFilePath), 'VN output file should exist');
  assert.ok(fs.existsSync(result.foreignFilePath), 'Foreign output file should exist');

  // 1. Read the output VN Excel file with exceljs
  const wbVn = new ExcelJS.Workbook();
  await wbVn.xlsx.readFile(result.vnFilePath);

  // Assert sheets exist
  assert.ok(wbVn.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU'), 'DS_KHACH_VIET_NAM_LUU_TRU sheet must exist');
  assert.ok(wbVn.getWorksheet('TINH_THANH'), 'TINH_THANH sheet must exist');
  assert.ok(wbVn.getWorksheet('DANH_MUC'), 'DANH_MUC sheet must exist');
  assert.ok(wbVn.getWorksheet('PHUONG_XA'), 'PHUONG_XA sheet must exist');

  const wsVn = wbVn.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU');

  // Assert data rows start at row 5 and end at row 37 (total 33 rows)
  let vnRowCount = 0;
  let hcmCount = 0;
  let hnCount = 0;

  for (let r = 5; r <= 37; r++) {
    const row = wsVn.getRow(r);
    const name = String(row.getCell(2).value || '');
    const nationality = String(row.getCell(5).value || '');
    const province = String(row.getCell(11).value || '');
    const rawAddress = String(row.getCell(13).value || '');
    const arrival = String(row.getCell(14).value || '');
    const departure = String(row.getCell(15).value || '');

    assert.ok(name.length > 0, `Row ${r} must have guest name`);
    // Col 2 (name has no commas)
    assert.ok(!name.includes(','), `Row ${r} name '${name}' must not contain commas`);

    // Col 5 (VNM - Viet Nam)
    assert.strictEqual(nationality, 'VNM - Viet Nam', `Row ${r} nationality must be 'VNM - Viet Nam'`);

    // Col 14 & 15 dates are hyphenated (dd-MM-yyyy)
    const hyphenDateRegex = /^\d{2}-\d{2}-\d{4}$/;
    assert.match(arrival, hyphenDateRegex, `Row ${r} arrival date '${arrival}' must match dd-MM-yyyy`);
    assert.match(departure, hyphenDateRegex, `Row ${r} departure date '${departure}' must match dd-MM-yyyy`);

    // Assert address provinceDisplay is mapped for Vietnamese guests (e.g., 701 - TP. Hồ Chí Minh or 101 - TP. Hà Nội for addresses containing those keywords)
    const cleanAddr = rawAddress
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (cleanAddr.includes('ho chi minh') || cleanAddr.includes('hcm') || cleanAddr.includes('sai gon')) {
      assert.strictEqual(province, '701 - TP. Hồ Chí Minh', `Row ${r} should map to HCM`);
      hcmCount++;
    } else if (cleanAddr.includes('ha noi')) {
      assert.strictEqual(province, '101 - TP. Hà Nội', `Row ${r} should map to Hanoi`);
      hnCount++;
    }

    vnRowCount++;
  }

  assert.strictEqual(vnRowCount, 33, 'Total VN data rows must be 33');
  assert.ok(hcmCount > 0, 'Should have guests mapped to TP. Hồ Chí Minh');
  assert.ok(hnCount > 0, 'Should have guests mapped to TP. Hà Nội');

  // Verify row 38 has no guest data
  const row38 = wsVn.getRow(38);
  assert.ok(!row38.getCell(2).value, 'Row 38 should not contain guest data');

  // 2. Read the output Foreign Excel file with exceljs
  const wbFg = new ExcelJS.Workbook();
  await wbFg.xlsx.readFile(result.foreignFilePath);

  // Assert sheets exist
  assert.ok(wbFg.getWorksheet('KBTT'), 'KBTT sheet must exist');
  assert.ok(wbFg.getWorksheet('Lookup'), 'Lookup sheet must exist');

  const wsFg = wbFg.getWorksheet('KBTT');

  // Assert data rows start at row 4 and end at row 15 (total 12 rows)
  let fgRowCount = 0;
  const slashDateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  const observedCountries = new Set();

  for (let r = 4; r <= 15; r++) {
    const row = wsFg.getRow(r);
    const name = String(row.getCell(2).value || '');
    const nationality = String(row.getCell(6).value || '');
    const arrival = String(row.getCell(9).value || '');
    const departure = String(row.getCell(10).value || '');

    assert.ok(name.length > 0, `Row ${r} must have guest name`);
    // Col 2 (name has no commas)
    assert.ok(!name.includes(','), `Row ${r} name '${name}' must not contain commas`);

    // Col 6 country codes (e.g. CHN - China, THA - Thailand)
    assert.ok(nationality.includes(' - '), `Row ${r} nationality '${nationality}' must follow 'CODE - Country' format`);
    observedCountries.add(nationality);

    // Col 9 & 10 dates are slash-separated (dd/MM/yyyy)
    assert.match(arrival, slashDateRegex, `Row ${r} arrival date '${arrival}' must match dd/MM/yyyy`);
    assert.match(departure, slashDateRegex, `Row ${r} departure date '${departure}' must match dd/MM/yyyy`);

    fgRowCount++;
  }

  assert.strictEqual(fgRowCount, 12, 'Total Foreign data rows must be 12');
  assert.ok(observedCountries.has('CHN - China'), 'Must include CHN - China');
  assert.ok(observedCountries.has('THA - Thailand'), 'Must include THA - Thailand');

  // Verify row 16 has no guest data
  const row16 = wsFg.getRow(16);
  assert.ok(!row16.getCell(2).value, 'Row 16 should not contain guest data');
});
