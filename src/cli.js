const path = require('path');
const { runConversion } = require('./converter/index');

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Sử dụng: node src/cli.js <đường-dẫn-file-xml> [thư-mục-đầu-ra]');
    process.exit(0);
  }

  const xmlPath = args[0] || 'brief/police_report2_75766981.XML';
  const outputDir = args[1];

  console.log(`Bắt đầu chuyển đổi: ${xmlPath}`);
  const result = await runConversion(xmlPath, outputDir ? { outputDir } : {});

  console.log('--- KẾT QUẢ CHUYỂN ĐỔI ---');
  console.log(`✅ Khách Việt Nam: ${result.vnCount} -> ${result.vnFilePath}`);
  console.log(`✅ Khách Nước ngoài: ${result.foreignCount} -> ${result.foreignFilePath}`);
  console.log(`Tổng cộng: ${result.totalCount} khách`);
  console.log('Hoàn thành xuất sắc!');
}

main().catch(err => {
  console.error('Lỗi khi chuyển đổi:', err.message);
  process.exit(1);
});
