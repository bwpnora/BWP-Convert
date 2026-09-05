// tests/provinceMap.test.js
const test = require('node:test');
const assert = require('node:assert');
const { matchProvinceFromText, cleanText } = require('../src/converter/provinceMap');

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
