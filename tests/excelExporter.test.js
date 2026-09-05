const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
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
  assert.ok(!wsVn.getCell('B5').font?.italic, 'Guest name must not be italic');

  const wbFg = new ExcelJS.Workbook();
  await wbFg.xlsx.readFile(result.foreignFilePath);
  assert.ok(wbFg.getWorksheet('KBTT'), 'KBTT sheet must exist');
  assert.ok(wbFg.getWorksheet('Lookup'), 'Lookup sheet must be preserved');

  const wsFg = wbFg.getWorksheet('KBTT');
  assert.strictEqual(wsFg.getCell('A3').value, 1);
  assert.strictEqual(wsFg.getCell('B3').value, 'JOHN DOE');
  assert.strictEqual(wsFg.getCell('F3').value, 'USA - United States of America');
  assert.ok(!wsFg.getCell('B3').font?.italic, 'Foreign guest name must not be italic');
});

test('exportToExcel fills Col 11, 12, 13, and Col 19 GHI CHU with original address', async () => {
  const outDir = path.resolve(__dirname, '../dist/test-excel-dual');
  const sampleVnGuests = [{
    name: 'NGUYEN VAN A',
    dob: '01/01/1990',
    gender: 'M - Nam',
    idTypeDisplay: '8 - Thẻ Căn Cước',
    idNumber: '012345678901',
    provinceDisplay: '701 - TP. Hồ Chí Minh',
    wardDisplay: '701926542 - Phường Phước Thắng',
    addressDetail: '2549D CMT8',
    rawAddress: '2549D CMT8, Phuoc Trung, TP Ba Ria',
    arrival: '01-09-2026',
    departure: '05-09-2026',
    room: '101'
  }];

  const result = await exportToExcel({
    vnGuests: sampleVnGuests,
    foreignGuests: [],
    vnTemplatePath: 'brief/tblt_vn_import.xlsx',
    foreignTemplatePath: 'brief/dklt nc ngoài.xlsx',
    outputDir: outDir,
    timestamp: '20260905999999'
  });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(result.vnFilePath);
  const ws = wb.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU');
  const row5 = ws.getRow(5);

  assert.strictEqual(row5.getCell(11).value, '701 - TP. Hồ Chí Minh', 'Col 11 is new province');
  assert.strictEqual(row5.getCell(12).value, '701926542 - Phường Phước Thắng', 'Col 12 is new ward');
  assert.strictEqual(row5.getCell(13).value, '2549D CMT8', 'Col 13 is cleaned addressDetail');
  assert.strictEqual(row5.getCell(19).value, '2549D CMT8, Phuoc Trung, TP Ba Ria', 'Col 19 is original rawAddress');

  fs.rmSync(outDir, { recursive: true, force: true });
});

