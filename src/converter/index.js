const fs = require('fs');
const path = require('path');
const { parsePoliceReport } = require('./xmlParser');
const { initAddressMatcher } = require('./addressMatcher');
const { exportToExcel } = require('./excelExporter');

async function runConversion(xmlPath, options = {}) {
  const resolvedXmlPath = path.resolve(xmlPath);
  const xmlContent = fs.readFileSync(resolvedXmlPath, 'utf-8');
  const vnTemplatePath = options.vnTemplatePath || path.resolve(__dirname, '../../brief/tblt_vn_import.xlsx');
  const foreignTemplatePath = options.foreignTemplatePath || path.resolve(__dirname, '../../brief/dklt nc ngoài.xlsx');
  const outputDir = options.outputDir ? path.resolve(options.outputDir) : path.dirname(resolvedXmlPath);

  const { vnGuests, foreignGuests } = parsePoliceReport(xmlContent);

  const matcher = await initAddressMatcher(vnTemplatePath);
  for (const g of vnGuests) {
    const { provinceDisplay, wardDisplay } = matcher.matchAddress(g.address);
    g.provinceDisplay = provinceDisplay;
    g.wardDisplay = wardDisplay;
  }

  const exportResult = await exportToExcel({
    vnGuests,
    foreignGuests,
    vnTemplatePath,
    foreignTemplatePath,
    outputDir,
    ...(options.timestamp ? { timestamp: options.timestamp } : {})
  });

  return {
    vnCount: vnGuests.length,
    foreignCount: foreignGuests.length,
    totalCount: vnGuests.length + foreignGuests.length,
    vnGuests,
    foreignGuests,
    ...exportResult
  };
}

module.exports = { runConversion };
