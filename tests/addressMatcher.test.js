const test = require('node:test');
const assert = require('node:assert');
const { initAddressMatcher } = require('../src/converter/addressMatcher');

test('addressMatcher identifies province display codes from raw address strings', async () => {
  const matcher = await initAddressMatcher('brief/tblt_vn_import.xlsx');

  const r1 = matcher.matchAddress('523/19 NGUYEN TRI PHUONG, KHU PHO 21, TP. Hồ Chí Minh');
  assert.strictEqual(r1.provinceDisplay, '701 - TP. Hồ Chí Minh');

  const r2 = matcher.matchAddress('Ngõ 3/6A, Xã Gia Lâm, TP. Hà Nội');
  assert.strictEqual(r2.provinceDisplay, '101 - TP. Hà Nội');

  const r3 = matcher.matchAddress('defaultaddress .');
  assert.strictEqual(r3.provinceDisplay, '');

  const r4 = matcher.matchAddress('123 Le Loi, Quan 1, TPHCM');
  assert.strictEqual(r4.provinceDisplay, '701 - TP. Hồ Chí Minh');

  const r5 = matcher.matchAddress('Vũng Tàu');
  assert.ok(r5.provinceDisplay.includes('Bà Rịa') || r5.provinceDisplay.includes('Vũng Tàu'));
});
