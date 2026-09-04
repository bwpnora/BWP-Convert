const fs = require('fs');
const path = require('path');
const { parsePoliceReport } = require('./xmlParser');
const { initAddressMatcher } = require('./addressMatcher');
const { exportToExcel } = require('./excelExporter');

function resolveTemplatePath(filename, customPath) {
  if (customPath) return path.resolve(customPath);
  if (process.resourcesPath) {
    const packagedPath = path.join(process.resourcesPath, 'brief', filename);
    if (fs.existsSync(packagedPath)) return packagedPath;
  }
  return path.resolve(__dirname, '../../brief', filename);
}

async function runConversion(xmlPath, options = {}) {
  const resolvedXmlPath = path.resolve(xmlPath);
  const xmlContent = fs.readFileSync(resolvedXmlPath, 'utf-8');
  const vnTemplatePath = resolveTemplatePath('tblt_vn_import.xlsx', options.vnTemplatePath);
  const foreignTemplatePath = resolveTemplatePath('dklt nc ngoài.xlsx', options.foreignTemplatePath);
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

module.exports = { runConversion, resolveTemplatePath };
