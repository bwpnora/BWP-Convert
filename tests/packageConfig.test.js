const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Cấu hình Package & Electron-Builder NSIS', () => {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  test('Phải có cấu hình build với tên sản phẩm và appId chuẩn', () => {
    assert.strictEqual(pkg.name, 'bwp-convert');
    assert.strictEqual(pkg.build.appId, 'com.bwpconvert.app');
    assert.strictEqual(pkg.build.productName, 'BWP Convert');
  });

  test('Cấu hình NSIS phải cho phép cài không cần quyền Admin và hiển thị Wizard', () => {
    assert.ok(pkg.build.win, 'Phải có mục cấu hình win');
    assert.strictEqual(pkg.build.win.target, 'nsis');
    assert.strictEqual(pkg.build.win.artifactName, '${productName}-Setup-${version}.${ext}');

    const nsis = pkg.build.nsis;
    assert.ok(nsis, 'Phải có mục cấu hình nsis');
    assert.strictEqual(nsis.oneClick, false, 'oneClick phải là false để hiện wizard');
    assert.strictEqual(nsis.perMachine, false, 'perMachine phải là false để không yêu cầu admin');
    assert.strictEqual(nsis.allowToChangeInstallationDirectory, true);
    assert.strictEqual(nsis.createDesktopShortcut, 'always');
    assert.strictEqual(nsis.createStartMenuShortcut, true);
    assert.strictEqual(nsis.shortcutName, 'BWP Convert');
  });

  test('Phải đóng gói kèm extraResources cho brief/*.xlsx', () => {
    const resources = pkg.build.extraResources;
    assert.ok(Array.isArray(resources), 'extraResources phải là mảng');
    const briefRes = resources.find(r => r.from === 'brief' && r.to === 'brief');
    assert.ok(briefRes, 'Phải có extraResources sao chép thư mục brief');
  });
});
