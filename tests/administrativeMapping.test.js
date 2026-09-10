const test = require('node:test');
const assert = require('node:assert');
const {
  lookupMergedWard,
  lookupDistrictFallback,
  OLD_PROVINCE_EXTRA_ALIASES,
  ALL_PROVINCE_ALIASES
} = require('../src/converter/administrativeMapping');

test('administrativeMapping maps old provinces correctly', () => {
  const hue = ALL_PROVINCE_ALIASES.find(a => a.alias === 'hue');
  assert.ok(hue, 'Must have alias hue');
  assert.strictEqual(hue.matt, '411');

  const bd = ALL_PROVINCE_ALIASES.find(a => a.alias === 'binh duong');
  assert.ok(bd, 'Must have alias binh duong');
  assert.strictEqual(bd.matt, '701');

  const hn = ALL_PROVINCE_ALIASES.find(a => a.alias === 'hn');
  assert.ok(hn, 'Must have alias hn');
  assert.strictEqual(hn.matt, '101');
});

test('administrativeMapping maps merged HCM wards', () => {
  const r1 = lookupMergedWard('701', 'nguyen thai binh');
  assert.ok(r1, 'Nguyen Thai Binh must map to a new ward');
  assert.ok(r1.ten.includes('Bến Thành') || r1.ten.includes('Cầu Ông Lãnh'));

  const r2 = lookupMergedWard('701', 'hang bong');
  assert.strictEqual(r2, null, 'Hang Bong is in Hanoi, not HCM');

  const r3 = lookupMergedWard('701', 'da kao');
  assert.ok(r3, 'Da Kao must map to a new ward');
  assert.ok(r3.ten.includes('Tân Định'));
});

test('administrativeMapping maps merged Hanoi wards', () => {
  const rHb = lookupMergedWard('101', 'hang bong');
  assert.ok(rHb, 'Hang Bong must map to Hoan Kiem');
  assert.ok(rHb.ten.includes('Hoàn Kiếm'));

  const rMd = lookupMergedWard('101', 'my dinh 1');
  assert.ok(rMd, 'My Dinh 1 must map to Tu Liem');
  assert.ok(rMd.ten.includes('Từ Liêm'));
});

test('administrativeMapping falls back to representative district ward', () => {
  const q1 = lookupDistrictFallback('701', 'q1');
  assert.ok(q1, 'Q1 must map to Ben Thanh');
  assert.ok(q1.ten.includes('Bến Thành'));

  const tanBinh = lookupDistrictFallback('701', 'tan binh');
  assert.ok(tanBinh, 'Tan Binh must map to Tan Binh ward');
  assert.ok(tanBinh.ten.includes('Tân Bình'));

  const cuChi = lookupDistrictFallback('701', 'cu chi');
  assert.ok(cuChi, 'Cu Chi must map to Cu Chi');
  assert.ok(cuChi.ten.includes('Củ Chi'));

  const hoanKiem = lookupDistrictFallback('101', 'hoan kiem');
  assert.ok(hoanKiem, 'Hoan Kiem must map to Hoan Kiem');
  assert.ok(hoanKiem.ten.includes('Hoàn Kiếm'));
});
