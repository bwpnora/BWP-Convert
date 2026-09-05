const test = require('node:test');
const assert = require('node:assert');
const { initAddressMatcher, extractDetailedAddress } = require('../src/converter/addressMatcher');

test('addressMatcher extracts clean street detail and identifies 34-province & ward', async () => {
  const matcher = await initAddressMatcher('brief/tblt_vn_import.xlsx');

  // Case 1: Ba Ria - Vung Tau -> 701, Phước Thắng or Long Hương, detail: 2549D CMT8
  const r1 = matcher.matchAddress('2549D CMT8, Phuoc Trung, TP Ba Ria');
  assert.strictEqual(r1.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.strictEqual(r1.rawAddress, '2549D CMT8, Phuoc Trung, TP Ba Ria');
  assert.ok(r1.addressDetail.includes('2549D CMT8'), 'Extracted house/street');
  assert.ok(!r1.addressDetail.toLowerCase().includes('tp ba ria'), 'Province removed from detail');

  // Case 2: Hanoi commune
  const r2 = matcher.matchAddress('Ngõ 3/6A, Xã Gia Lâm, TP. Hà Nội');
  assert.strictEqual(r2.provinceDisplay, '101 - TP. Hà Nội');
  assert.strictEqual(r2.wardDisplay, '101900565 - Xã Gia Lâm');
  assert.strictEqual(r2.addressDetail, 'Ngõ 3/6A');
  assert.strictEqual(r2.rawAddress, 'Ngõ 3/6A, Xã Gia Lâm, TP. Hà Nội');

  // Case 3: Empty / junk
  const r3 = matcher.matchAddress('defaultaddress .');
  assert.strictEqual(r3.provinceDisplay, '');
  assert.strictEqual(r3.wardDisplay, '');
  assert.strictEqual(r3.addressDetail, 'defaultaddress .');
  assert.strictEqual(r3.rawAddress, 'defaultaddress .');

  // Case 4: Reverse ward search (distinctive name without explicit province)
  const r4 = matcher.matchAddress('Khu 2, Dầu Tiếng');
  assert.strictEqual(r4.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.ok(r4.wardDisplay.includes('Dầu Tiếng'));
  assert.strictEqual(r4.addressDetail, 'Khu 2');
});

test('extractDetailedAddress handles standalone extraction with diacritics and residuals', () => {
  assert.strictEqual(extractDetailedAddress('', '', ''), '');
  assert.strictEqual(extractDetailedAddress('123 Le Loi', '', ''), '123 Le Loi');
  assert.strictEqual(
    extractDetailedAddress('123 Le Loi, Phuong Ben Nghe, TP.HCM', 'tphcm', 'Phuong Ben Nghe'),
    '123 Le Loi'
  );
  assert.strictEqual(
    extractDetailedAddress('Ngõ 3/6A, Xã Gia Lâm, TP. Hà Nội', 'tp ha noi', 'Xã Gia Lâm'),
    'Ngõ 3/6A'
  );
  // Compound district without leaving dangling number
  const rCompound = extractDetailedAddress('123 Nguyễn Huệ, Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'tp ho chi minh', '');
  assert.ok(!rCompound.includes(', 1'));
  assert.ok(!rCompound.endsWith('1'));

  // Preserves single-letter lot / block
  const rLoH = extractDetailedAddress('123 Lô H, Phường Tân Phú, TP.HCM', 'tphcm', 'Phường Tân Phú');
  assert.strictEqual(rLoH, '123 Lô H');
});

test('addressMatcher cleanly strips administrative district numbers and preserves single-letter lots/blocks', async () => {
  const matcher = await initAddressMatcher('brief/tblt_vn_import.xlsx');

  // Finding 1: 123 Nguyễn Huệ, Bến Nghé, Quận 1, TP. Hồ Chí Minh does not leave dangling ", 1"
  const r1 = matcher.matchAddress('123 Nguyễn Huệ, Bến Nghé, Quận 1, TP. Hồ Chí Minh');
  assert.strictEqual(r1.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.ok(!r1.addressDetail.includes(', 1'), 'Must not leave dangling district number ", 1"');
  assert.ok(!r1.addressDetail.endsWith('1'), 'Must not end with dangling district digit');
  assert.ok(!r1.addressDetail.toLowerCase().includes('quận 1'), 'Must strip Quận 1');
  assert.ok(r1.addressDetail.includes('123 Nguyễn Huệ'), 'Preserves street number and name');

  // Finding 2: 123 Lô H, Phường Tân Phú, TP.HCM preserves Lô H
  const r2 = matcher.matchAddress('123 Lô H, Phường Tân Phú, TP.HCM');
  assert.strictEqual(r2.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.ok(r2.addressDetail.includes('Lô H'), 'Must preserve single-letter block/lot "Lô H"');
  assert.strictEqual(r2.addressDetail, '123 Lô H');
});

