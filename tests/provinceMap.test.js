// tests/provinceMap.test.js
const test = require('node:test');
const assert = require('node:assert');
const {
  matchProvinceFromText,
  cleanText,
  PROVINCE_34_MAP,
  PROVINCE_34_LIST,
  PROVINCE_63_TO_34_ALIASES,
  SORTED_ALIASES
} = require('../src/converter/provinceMap');

test('provinceMap accurately resolves former 63 provinces to 34 new provinces', () => {
  // Ba Ria - Vung Tau -> 701 (TP. Ho Chi Minh)
  const r1 = matchProvinceFromText(cleanText('2549D CMT8, Phuoc Trung, TP Ba Ria'));
  assert.ok(r1, 'Should match Ba Ria');
  assert.strictEqual(r1.matt, '701');
  assert.strictEqual(r1.display, '701 - TP. Hồ Chí Minh');

  // Binh Duong -> 701 (TP. Ho Chi Minh)
  const r2 = matchProvinceFromText(cleanText('15 Dai lo Binh Duong, TP Thu Dau Mot, Binh Duong'));
  assert.ok(r2, 'Should match Binh Duong');
  assert.strictEqual(r2.matt, '701');

  // Hai Duong -> 103 (TP. Hai Phong)
  const r3 = matchProvinceFromText(cleanText('Ngo 12 Tran Hung Dao, TP Hai Duong'));
  assert.ok(r3, 'Should match Hai Duong');
  assert.strictEqual(r3.matt, '103');

  // Nam Dinh -> 117 (Ninh Binh)
  const r4 = matchProvinceFromText(cleanText('So 5 Quang Trung, TP Nam Dinh'));
  assert.ok(r4, 'Should match Nam Dinh');
  assert.strictEqual(r4.matt, '117');

  // Ha Nam -> 117 (Ninh Binh)
  const r5 = matchProvinceFromText(cleanText('Thanh pho Phu Ly, Ha Nam'));
  assert.ok(r5, 'Should match Ha Nam');
  assert.strictEqual(r5.matt, '117');

  // Bac Giang -> 223 (Bac Ninh)
  const r6 = matchProvinceFromText(cleanText('Huyen Viet Yen, Bac Giang'));
  assert.ok(r6, 'Should match Bac Giang');
  assert.strictEqual(r6.matt, '223');

  // Unknown address
  const r7 = matchProvinceFromText(cleanText('defaultaddress .'));
  assert.strictEqual(r7, null);
});

test('provinceMap prevents short single-word alias collisions (hue, vinh)', () => {
  // Nguyen Hue street in Q1 HCM should not match Hue (411)
  const streetHue = matchProvinceFromText('12 Nguyen Hue, Phuong Ben Nghe, Quan 1');
  assert.strictEqual(streetHue, null, 'Nguyen Hue street alone should not match Hue');

  const streetHueHcm = matchProvinceFromText('12 Nguyen Hue, Phuong Ben Nghe, Quan 1, TP Ho Chi Minh');
  assert.ok(streetHueHcm);
  assert.strictEqual(streetHueHcm.matt, '701', 'Nguyen Hue in TP HCM should match TP. Ho Chi Minh (701)');

  // Actual Hue address
  const realHue = matchProvinceFromText('2 Le Loi, TP Hue');
  assert.ok(realHue);
  assert.strictEqual(realHue.matt, '411', 'TP Hue should match Hue (411)');

  const realThuaThienHue = matchProvinceFromText('Thua Thien Hue');
  assert.ok(realThuaThienHue);
  assert.strictEqual(realThuaThienHue.matt, '411');

  // Vinh Vien street / Vinh Loc ward should not match Vinh (403)
  const streetVinhVien = matchProvinceFromText('12 Vinh Vien, Phuong 4, Quan 10');
  assert.strictEqual(streetVinhVien, null, 'Vinh Vien street should not match Vinh');

  const streetVinhHcm = matchProvinceFromText('12 Vinh Vien, Quan 10, TP Ho Chi Minh');
  assert.ok(streetVinhHcm);
  assert.strictEqual(streetVinhHcm.matt, '701', 'Vinh Vien in TP HCM should match TP. Ho Chi Minh (701)');

  // Actual Vinh address
  const realVinh = matchProvinceFromText('So 10 Quang Trung, TP Vinh, Nghe An');
  assert.ok(realVinh);
  assert.strictEqual(realVinh.matt, '403', 'TP Vinh should match Nghe An (403)');
});

test('provinceMap accurately resolves Binh Dinh / Quy Nhon to 505 (Quang Ngai)', () => {
  const r1 = matchProvinceFromText('01 Le Duan, TP Quy Nhon, Binh Dinh');
  assert.ok(r1, 'Should match Binh Dinh / Quy Nhon');
  assert.strictEqual(r1.matt, '505');

  const r2 = matchProvinceFromText('Quy Nhon');
  assert.ok(r2);
  assert.strictEqual(r2.matt, '505');
});

test('provinceMap supports raw uncleaned string inputs defensively', () => {
  // Pass uncleaned diacritics string directly to matchProvinceFromText
  const res = matchProvinceFromText('2549D CMT8, Phước Trung, TP Bà Rịa');
  assert.ok(res);
  assert.strictEqual(res.matt, '701');
  assert.strictEqual(res.display, '701 - TP. Hồ Chí Minh');
});

test('provinceMap exports comply with interface requirements', () => {
  assert.strictEqual(PROVINCE_63_TO_34_ALIASES, SORTED_ALIASES);
  assert.ok(Array.isArray(PROVINCE_63_TO_34_ALIASES));
  assert.ok(PROVINCE_63_TO_34_ALIASES.length > 0);

  // Check tentt in PROVINCE_34_LIST and PROVINCE_34_MAP
  assert.strictEqual(PROVINCE_34_LIST.length, 34);
  for (const prov of PROVINCE_34_LIST) {
    assert.ok(prov.matt, 'Province must have matt');
    assert.ok(prov.name, 'Province must have name');
    assert.ok(prov.tentt, 'Province must have tentt');
    assert.strictEqual(prov.name, prov.tentt);
    assert.ok(prov.display, 'Province must have display');
  }

  const prov701 = PROVINCE_34_MAP.get('701');
  assert.ok(prov701);
  assert.strictEqual(prov701.tentt, 'Hồ Chí Minh');
});
