const path = require('path');
const { runConversion } = require('./converter/index');

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Sử dụng: node src/cli.js <đường-dẫn-file-xml> [--out thư-mục-đầu-ra]');
    process.exit(0);
  }

  let xmlPath;
  let outputDir;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' || args[i] === '-o') {
      outputDir = args[i + 1];
      i++;
    } else if (!args[i].startsWith('-')) {
      if (!xmlPath) {
        xmlPath = args[i];
      } else if (!outputDir) {
        outputDir = args[i];
      }
    }
  }

  if (!xmlPath) {
    xmlPath = 'brief/police_report2_75766981.XML';
  }

  console.log(`Bắt đầu chuyển đổi: ${xmlPath}`);
  const result = await runConversion(xmlPath, outputDir ? { outputDir } : {});

  console.log('--- KẾT QUẢ CHUYỂN ĐỔI ---');
  console.log(`✅ Khách Việt Nam: ${result.vnCount} -> ${result.vnFilePath}`);
  if (result.vnGuests && result.vnCount > 0) {
    const provMatched = result.vnGuests.filter(g => g.provinceDisplay).length;
    const wardMatched = result.vnGuests.filter(g => g.wardDisplay).length;
    const provPct = ((provMatched / result.vnCount) * 100).toFixed(1);
    const wardPct = ((wardMatched / result.vnCount) * 100).toFixed(1);
    console.log(`  - Khớp Tỉnh/Thành mới (34 tỉnh): ${provMatched}/${result.vnCount} (${provPct}%)`);
    console.log(`  - Khớp Phường/Xã mới (3.324 xã/phường): ${wardMatched}/${result.vnCount} (${wardPct}%)`);
  }
  console.log(`✅ Khách Nước ngoài: ${result.foreignCount} -> ${result.foreignFilePath}`);
  console.log(`Tổng cộng: ${result.totalCount} khách`);
  console.log('Hoàn thành xuất sắc!');
}

main().catch(err => {
  console.error('Lỗi khi chuyển đổi:', err.message);
  process.exit(1);
});
