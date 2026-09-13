// Polyfill: Ensure readable-stream has Symbol.asyncIterator from Node native stream
try {
  const { Readable: nativeReadable } = require('stream');
  const rs = require('readable-stream');
  if (rs && rs.Readable && typeof rs.Readable.prototype[Symbol.asyncIterator] !== 'function') {
    rs.Readable.prototype[Symbol.asyncIterator] = nativeReadable.prototype[Symbol.asyncIterator];
  }
} catch (_) {}

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { normalizeForeignCountry } = require('./countryMap');

async function exportToExcel({
  vnGuests = [],
  foreignGuests = [],
  vnTemplatePath,
  foreignTemplatePath,
  outputDir,
  timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
}) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const vnFileName = `tblt_vn_import_${timestamp}.xlsx`;
  const foreignFileName = `dklt_nc_ngoai_${timestamp}.xlsx`;
  const vnFilePath = path.join(outputDir, vnFileName);
  const foreignFilePath = path.join(outputDir, foreignFileName);

  // 1. Export Vietnamese Guests
  const wbVn = new ExcelJS.Workbook();
  await wbVn.xlsx.load(fs.readFileSync(vnTemplatePath));
  const wsVn = wbVn.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU');

  if (wsVn.dataValidations) {
    wsVn.dataValidations.model = {};
  }

  const totalVnRows = wsVn.rowCount;
  for (let r = 5; r <= totalVnRows; r++) {
    wsVn.getRow(r).values = [];
  }
  if (wsVn._rows && wsVn._rows.length > 4) {
    wsVn._rows.length = 4;
  }

  vnGuests.forEach((g, idx) => {
    const rowNum = 5 + idx;
    const row = wsVn.getRow(rowNum);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = g.name || '';
    row.getCell(3).value = g.dob || '';
    row.getCell(4).value = g.gender || 'M - Nam';
    row.getCell(5).value = g.nationalityCode || 'VNM - Viet Nam';
    row.getCell(6).value = g.idTypeDisplay || '8 - Thẻ Căn Cước';
    row.getCell(7).value = '';
    row.getCell(8).value = g.idNumber || '';
    row.getCell(9).value = '';
    row.getCell(10).value = '';
    row.getCell(11).value = g.provinceDisplay || '';
    row.getCell(12).value = g.wardDisplay || '';
    row.getCell(13).value = g.addressDetail || g.address || '';
    row.getCell(14).value = g.arrival || '';
    row.getCell(15).value = g.departure || '';
    row.getCell(16).value = g.room || '';
    row.getCell(17).value = '1 - Du lịch';
    row.getCell(18).value = '';
    row.getCell(19).value = g.rawAddress || g.address || '';

    // Remove italics from guest data row cells (template column defaults to italic: true)
    for (let c = 1; c <= 19; c++) {
      const cell = row.getCell(c);
      cell.font = {
        name: 'Calibri',
        size: 11,
        italic: false
      };
    }

    row.commit();
  });

  await wbVn.xlsx.writeFile(vnFilePath);

  // 2. Export Foreign Guests
  const wbFg = new ExcelJS.Workbook();
  await wbFg.xlsx.load(fs.readFileSync(foreignTemplatePath));
  const wsFg = wbFg.getWorksheet('KBTT');

  const totalFgRows = wsFg.rowCount;
  for (let r = 3; r <= totalFgRows; r++) {
    wsFg.getRow(r).values = [];
  }
  if (wsFg._rows && wsFg._rows.length > 2) {
    wsFg._rows.length = 2;
  }

  foreignGuests.forEach((g, idx) => {
    const rowNum = 3 + idx;
    const row = wsFg.getRow(rowNum);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = g.name || '';
    row.getCell(3).value = g.dob || '';
    row.getCell(4).value = 'D - Ngày';
    row.getCell(5).value = g.gender || 'M - Nam';
    const rawNat = g.nationalityCode || g.nationality || '';
    row.getCell(6).value = normalizeForeignCountry(rawNat) || 'CHN - China';
    row.getCell(7).value = g.idNumber || '';
    row.getCell(8).value = g.room || '';
    row.getCell(9).value = g.arrival || '';
    row.getCell(10).value = g.departure || '';
    row.getCell(11).value = g.departure || '';
    row.getCell(12).value = g.visaExp || g.departure || '';

    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.font = {
        name: 'Times New Roman',
        size: 11,
        italic: false
      };
    }

    row.commit();
  });

  // Fix Table1 AutoFilter and range so Excel opens cleanly without repair dialog
  const lastFgRow = Math.max(3, 2 + foreignGuests.length);
  const fgTableRef = `A2:L${lastFgRow}`;
  const tables = wsFg.getTables();
  for (const t of tables) {
    t.table.tableRef = fgTableRef;
    t.table.autoFilterRef = fgTableRef;
    t.table.headerRow = true;
    t.table.totalsRow = false;
    if (t.table.columns) {
      t.table.columns.forEach(c => {
        c.filterButton = true;
      });
    }
  }

  await wbFg.xlsx.writeFile(foreignFilePath);

  return { vnFilePath, foreignFilePath, vnFileName, foreignFileName };
}

module.exports = { exportToExcel };
