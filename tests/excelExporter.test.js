const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { exportToExcel } = require('../src/converter/excelExporter');

test('exportToExcel creates both files preserving template sheets and correct rows', async () => {
  const sampleVnGuests = [
    {
      name: 'NGUYEN VAN A',
      dob: '01/01/1990',
      gender: 'M - Nam',
      nationalityCode: 'VNM - Viet Nam',
      idTypeDisplay: '8 - Thẻ Căn Cước',
      idNumber: '012345678901',
      provinceDisplay: '701 - TP. Hồ Chí Minh',
      wardDisplay: '',
      address: '123 Nguyen Trai, Q1, TP. HCM',
      arrival: '30-08-2026',
      departure: '02-09-2026',
      room: '101'
    }
  ];

  const sampleForeignGuests = [
    {
      name: 'JOHN DOE',
      dob: '15/05/1985',
      gender: 'M - Nam',
      nationalityCode: 'USA - United States of America',
      idNumber: 'A12345678',
      room: '202',
      arrival: '30/08/2026',
      departure: '02/09/2026',
      visaExp: '02/09/2026'
    }
  ];

  const outputDir = 'dist/test-output';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const result = await exportToExcel({
    vnGuests: sampleVnGuests,
    foreignGuests: sampleForeignGuests,
    vnTemplatePath: 'brief/tblt_vn_import.xlsx',
    foreignTemplatePath: 'brief/dklt nc ngoài.xlsx',
    outputDir,
    timestamp: 'test'
  });

  assert.ok(fs.existsSync(result.vnFilePath), 'VN output file must exist');
  assert.ok(fs.existsSync(result.foreignFilePath), 'Foreign output file must exist');

  const wbVn = new ExcelJS.Workbook();
  await wbVn.xlsx.readFile(result.vnFilePath);
  assert.ok(wbVn.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU'), 'VN sheet must exist');
  assert.ok(wbVn.getWorksheet('TINH_THANH'), 'TINH_THANH sheet must be preserved');
  assert.ok(wbVn.getWorksheet('DANH_MUC'), 'DANH_MUC sheet must be preserved');

  const wsVn = wbVn.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU');
  assert.strictEqual(wsVn.getCell('B5').value, 'NGUYEN VAN A');
  assert.strictEqual(wsVn.getCell('E5').value, 'VNM - Viet Nam');
  assert.strictEqual(wsVn.getCell('K5').value, '701 - TP. Hồ Chí Minh');

  const wbFg = new ExcelJS.Workbook();
  await wbFg.xlsx.readFile(result.foreignFilePath);
  assert.ok(wbFg.getWorksheet('KBTT'), 'KBTT sheet must exist');
  assert.ok(wbFg.getWorksheet('Lookup'), 'Lookup sheet must be preserved');

  const wsFg = wbFg.getWorksheet('KBTT');
  assert.strictEqual(wsFg.getCell('B4').value, 'JOHN DOE');
  assert.strictEqual(wsFg.getCell('F4').value, 'USA - United States of America');
});
