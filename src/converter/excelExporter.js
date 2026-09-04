const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

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
  await wbVn.xlsx.readFile(vnTemplatePath);
  const wsVn = wbVn.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU');

  while (wsVn.rowCount >= 5) {
    wsVn.spliceRows(5, 1);
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
    row.getCell(13).value = g.address || '';
    row.getCell(14).value = g.arrival || '';
    row.getCell(15).value = g.departure || '';
    row.getCell(16).value = g.room || '';
    row.getCell(17).value = '1 - Du lịch';
    row.getCell(18).value = '';
    row.getCell(19).value = '';
    row.commit();
  });

  await wbVn.xlsx.writeFile(vnFilePath);

  // 2. Export Foreign Guests
  const wbFg = new ExcelJS.Workbook();
  await wbFg.xlsx.readFile(foreignTemplatePath);
  const wsFg = wbFg.getWorksheet('KBTT');

  while (wsFg.rowCount >= 4) {
    wsFg.spliceRows(4, 1);
  }

  foreignGuests.forEach((g, idx) => {
    const rowNum = 4 + idx;
    const row = wsFg.getRow(rowNum);
    row.getCell(1).value = '';
    row.getCell(2).value = g.name || '';
    row.getCell(3).value = g.dob || '';
    row.getCell(4).value = 'D - Ngày';
    row.getCell(5).value = g.gender || 'M - Nam';
    row.getCell(6).value = g.nationalityCode || 'CHN - China';
    row.getCell(7).value = g.idNumber || '';
    row.getCell(8).value = g.room || '';
    row.getCell(9).value = g.arrival || '';
    row.getCell(10).value = g.departure || '';
    row.getCell(11).value = g.departure || '';
    row.getCell(12).value = g.visaExp || g.departure || '';
    row.commit();
  });

  await wbFg.xlsx.writeFile(foreignFilePath);

  return { vnFilePath, foreignFilePath, vnFileName, foreignFileName };
}

module.exports = { exportToExcel };
