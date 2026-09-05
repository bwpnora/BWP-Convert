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

test('code review fixes: reverse lookup uniqueness, ward prefix cleanup, and template caching', async () => {
  // 1. Template caching allows fast consecutive initializations (< 1ms)
  const t0 = performance.now();
  const cachedMatcher = await initAddressMatcher('brief/tblt_vn_import.xlsx');
  const elapsed = performance.now() - t0;
  assert.ok(elapsed < 20, `Consecutive initAddressMatcher took ${elapsed.toFixed(2)}ms, expected < 20ms (cache hit)`);
  assert.strictEqual(typeof cachedMatcher.matchAddress, 'function');

  // 2. Ambiguous ward without province leaves provinceDisplay and wardDisplay blank (instead of falsely mapping to Nghệ An)
  const rAmbiguous1 = cachedMatcher.matchAddress('123 Le Loi, Phuong Tan Phu');
  assert.strictEqual(rAmbiguous1.provinceDisplay, '', 'Ambiguous ward "Tân Phú" without province must not map to Nghệ An');
  assert.strictEqual(rAmbiguous1.wardDisplay, '', 'Ambiguous ward without province must leave wardDisplay blank');
  assert.strictEqual(rAmbiguous1.addressDetail, '123 Le Loi, Phuong Tan Phu');

  const rAmbiguous2 = cachedMatcher.matchAddress('456 Tran Hung Dao, Phuong An Phu');
  assert.strictEqual(rAmbiguous2.provinceDisplay, '', 'Ambiguous ward "An Phú" without province must leave provinceDisplay blank');
  assert.strictEqual(rAmbiguous2.wardDisplay, '', 'Ambiguous ward without province must leave wardDisplay blank');
  assert.strictEqual(rAmbiguous2.addressDetail, '456 Tran Hung Dao, Phuong An Phu');

  // 3. Distinctive ward without province still successfully resolves
  const rDistinctiveNoDiacritics = cachedMatcher.matchAddress('Khu 2, Dau Tieng');
  assert.strictEqual(rDistinctiveNoDiacritics.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.ok(rDistinctiveNoDiacritics.wardDisplay.includes('Dầu Tiếng'));
  assert.strictEqual(rDistinctiveNoDiacritics.addressDetail, 'Khu 2');

  const rDistinctiveDiacritics = cachedMatcher.matchAddress('Khu 2, Dầu Tiếng');
  assert.strictEqual(rDistinctiveDiacritics.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.ok(rDistinctiveDiacritics.wardDisplay.includes('Dầu Tiếng'));
  assert.strictEqual(rDistinctiveDiacritics.addressDetail, 'Khu 2');

  // 4. Dangling P. or P. Bến Nghé is cleanly stripped from addressDetail
  assert.strictEqual(
    extractDetailedAddress('123 Le Loi, P. Ben Nghe, TP.HCM', 'tphcm', 'Ben Nghe'),
    '123 Le Loi'
  );
  assert.strictEqual(
    extractDetailedAddress('123 Le Loi, P. Bến Nghé, TP.HCM', 'tphcm', 'Phường Bến Nghé'),
    '123 Le Loi'
  );

  const rMatchP1 = cachedMatcher.matchAddress('123 Le Loi, P. Tan Phu, TP.HCM');
  assert.strictEqual(rMatchP1.addressDetail, '123 Le Loi');
  assert.strictEqual(rMatchP1.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.ok(rMatchP1.wardDisplay.includes('Tân Phú'));

  const rMatchP2 = cachedMatcher.matchAddress('123 Le Loi, P. Tân Phú, TP. Hồ Chí Minh');
  assert.strictEqual(rMatchP2.addressDetail, '123 Le Loi');
  assert.strictEqual(rMatchP2.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.ok(rMatchP2.wardDisplay.includes('Tân Phú'));

  // Preserves single-letter lots like Lô P and Lô X
  assert.strictEqual(
    extractDetailedAddress('123 Lô P, Phường Tân Phú, TP.HCM', 'tphcm', 'Phường Tân Phú'),
    '123 Lô P'
  );
  assert.strictEqual(
    extractDetailedAddress('456 Lô X, Xã Tân An, TP.HCM', 'tphcm', 'Xã Tân An'),
    '456 Lô X'
  );
});


