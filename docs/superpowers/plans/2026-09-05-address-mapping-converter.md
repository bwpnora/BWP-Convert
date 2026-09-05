# Automated Vietnam Address Mapping & Dual-Address Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automatic administrative address conversion (mapping 63 historical provinces to 34 new template provinces) with clean street extraction for Column 13 and original address preservation in Column 19 (GHI CHÚ) in `tblt_vn_import.xlsx`.

**Architecture:** A dedicated `provinceMap.js` provides an indexed dictionary and aliases for the 63-to-34 consolidation and district keywords. `addressMatcher.js` orchestrates multi-tier matching (province resolution, ward resolution from template's 3,324 wards, and substring subtraction for detailed street). `excelExporter.js` writes the results into standard 19 columns: Col 11 (Province), Col 12 (Ward), Col 13 (Detailed Address), and Col 19 (Original PMS Address).

**Tech Stack:** Node.js (CommonJS, v20+), ExcelJS, Fast-XML-Parser, Node built-in `node:test` & `node:assert`.

**Spec:** [docs/superpowers/specs/2026-09-05-address-mapping-converter-design.md](file:///c:/Code/nora-convert/docs/superpowers/specs/2026-09-05-address-mapping-converter-design.md)

## Global Constraints

- Retain exact 19 columns in `DS_KHACH_VIET_NAM_LUU_TRU` of `tblt_vn_import.xlsx` (no shifting or deleting standard columns).
- Match province dropdown display codes in Sheet `TINH_THANH` (34 entries) exactly.
- Match ward dropdown display codes in Sheet `PHUONG_XA` (3,324 entries) exactly.
- 100% offline in-memory execution; zero external network calls.
- Maintain existing non-italic Calibri 11pt formatting for guest rows.

---

### Task 1: Administrative Province & District Mapping Module (`provinceMap.js`)

**Files:**
- Create: `src/converter/provinceMap.js`
- Test: `tests/provinceMap.test.js`

**Interfaces:**
- Produces:
  - `PROVINCE_34_MAP`: Map of target 34 provinces (`matt` -> `{ matt, tentt, display }`)
  - `PROVINCE_63_TO_34_ALIASES`: Array of `{ alias: string, matt: string }` sorted by alias length descending
  - `matchProvinceFromText(cleanAddressStr)`: Returns `{ matt, display, matchedAlias }` or `null`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/provinceMap.test.js`
Expected: FAIL (`Cannot find module '../src/converter/provinceMap'`)

- [ ] **Step 3: Implement `src/converter/provinceMap.js`**

```javascript
// src/converter/provinceMap.js
function cleanText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PROVINCE_34_LIST = [
  { matt: '101', name: 'Hà Nội', display: '101 - TP. Hà Nội' },
  { matt: '103', name: 'Hải Phòng', display: '103 - TP. Hải Phòng' },
  { matt: '109', name: 'Hưng Yên', display: '109 - Hưng Yên' },
  { matt: '117', name: 'Ninh Bình', display: '117 - Ninh Bình' },
  { matt: '203', name: 'Cao Bằng', display: '203 - Cao Bằng' },
  { matt: '205', name: 'Lào Cai', display: '205 - Lào Cai' },
  { matt: '209', name: 'Lạng Sơn', display: '209 - Lạng Sơn' },
  { matt: '211', name: 'Tuyên Quang', display: '211 - Tuyên Quang' },
  { matt: '215', name: 'Thái Nguyên', display: '215 - Thái Nguyên' },
  { matt: '217', name: 'Phú Thọ', display: '217 - Phú Thọ' },
  { matt: '223', name: 'Bắc Ninh', display: '223 - Bắc Ninh' },
  { matt: '225', name: 'Quảng Ninh', display: '225 - Quảng Ninh' },
  { matt: '301', name: 'Lai Châu', display: '301 - Lai Châu' },
  { matt: '302', name: 'Điện Biên', display: '302 - Điện Biên' },
  { matt: '303', name: 'Sơn La', display: '303 - Sơn La' },
  { matt: '401', name: 'Thanh Hóa', display: '401 - Thanh Hóa' },
  { matt: '403', name: 'Nghệ An', display: '403 - Nghệ An' },
  { matt: '405', name: 'Hà Tĩnh', display: '405 - Hà Tĩnh' },
  { matt: '409', name: 'Quảng Trị', display: '409 - Quảng Trị' },
  { matt: '411', name: 'Huế', display: '411 - TP. Huế' },
  { matt: '501', name: 'Đà Nẵng', display: '501 - TP. Đà Nẵng' },
  { matt: '505', name: 'Quảng Ngãi', display: '505 - Quảng Ngãi' },
  { matt: '511', name: 'Khánh Hòa', display: '511 - Khánh Hòa' },
  { matt: '603', name: 'Gia Lai', display: '603 - Gia Lai' },
  { matt: '605', name: 'Đắk Lắk', display: '605 - Đắk Lắk' },
  { matt: '701', name: 'Hồ Chí Minh', display: '701 - TP. Hồ Chí Minh' },
  { matt: '703', name: 'Lâm Đồng', display: '703 - Lâm Đồng' },
  { matt: '709', name: 'Tây Ninh', display: '709 - Tây Ninh' },
  { matt: '713', name: 'Đồng Nai', display: '713 - Đồng Nai' },
  { matt: '803', name: 'Đồng Tháp', display: '803 - Đồng Tháp' },
  { matt: '805', name: 'An Giang', display: '805 - An Giang' },
  { matt: '809', name: 'Vĩnh Long', display: '809 - Vĩnh Long' },
  { matt: '815', name: 'Cần Thơ', display: '815 - TP. Cần Thơ' },
  { matt: '823', name: 'Cà Mau', display: '823 - Cà Mau' }
];

const PROVINCE_34_MAP = new Map(PROVINCE_34_LIST.map(p => [p.matt, p]));

const RAW_PROVINCE_ALIASES = [
  // TP. Ho Chi Minh (701) - Includes BRVT, Binh Duong
  { alias: 'thanh pho ho chi minh', matt: '701' },
  { alias: 'tp ho chi minh', matt: '701' },
  { alias: 'ho chi minh', matt: '701' },
  { alias: 'tp hcm', matt: '701' },
  { alias: 'tphcm', matt: '701' },
  { alias: 'sai gon', matt: '701' },
  { alias: 'saigon', matt: '701' },
  { alias: 'ba ria vung tau', matt: '701' },
  { alias: 'ba ria', matt: '701' },
  { alias: 'vung tau', matt: '701' },
  { alias: 'brvt', matt: '701' },
  { alias: 'binh duong', matt: '701' },
  { alias: 'thu dau mot', matt: '701' },
  { alias: 'di an', matt: '701' },
  { alias: 'thuan an', matt: '701' },
  { alias: 'ben cat', matt: '701' },
  { alias: 'tan uyen', matt: '701' },
  { alias: 'dau tieng', matt: '701' },
  { alias: 'con dao', matt: '701' },

  // Ha Noi (101)
  { alias: 'thanh pho ha noi', matt: '101' },
  { alias: 'tp ha noi', matt: '101' },
  { alias: 'ha noi', matt: '101' },
  { alias: 'ha tay', matt: '101' },

  // Hai Phong (103) - Includes Hai Duong
  { alias: 'thanh pho hai phong', matt: '103' },
  { alias: 'tp hai phong', matt: '103' },
  { alias: 'hai phong', matt: '103' },
  { alias: 'hai duong', matt: '103' },
  { alias: 'chi linh', matt: '103' },

  // Hung Yen (109) - Includes Thai Binh
  { alias: 'hung yen', matt: '109' },
  { alias: 'thai binh', matt: '109' },

  // Ninh Binh (117) - Includes Nam Dinh, Ha Nam
  { alias: 'ninh binh', matt: '117' },
  { alias: 'nam dinh', matt: '117' },
  { alias: 'ha nam', matt: '117' },
  { alias: 'phu ly', matt: '117' },

  // Cao Bang (203)
  { alias: 'cao bang', matt: '203' },

  // Lao Cai (205) - Includes Yen Bai
  { alias: 'lao cai', matt: '205' },
  { alias: 'yen bai', matt: '205' },

  // Lang Son (209)
  { alias: 'lang son', matt: '209' },

  // Tuyen Quang (211) - Includes Ha Giang
  { alias: 'tuyen quang', matt: '211' },
  { alias: 'ha giang', matt: '211' },

  // Thai Nguyen (215) - Includes Bac Kan
  { alias: 'thai nguyen', matt: '215' },
  { alias: 'bac kan', matt: '215' },
  { alias: 'bac can', matt: '215' },

  // Phu Tho (217) - Includes Vinh Phuc, Hoa Binh
  { alias: 'phu tho', matt: '217' },
  { alias: 'vinh phuc', matt: '217' },
  { alias: 'vinh yen', matt: '217' },
  { alias: 'phuc yen', matt: '217' },
  { alias: 'hoa binh', matt: '217' },

  // Bac Ninh (223) - Includes Bac Giang
  { alias: 'bac ninh', matt: '223' },
  { alias: 'bac giang', matt: '223' },

  // Quang Ninh (225)
  { alias: 'quang ninh', matt: '225' },
  { alias: 'ha long', matt: '225' },
  { alias: 'cam pha', matt: '225' },
  { alias: 'uong bi', matt: '225' },
  { alias: 'mong cai', matt: '225' },

  // Lai Chau (301)
  { alias: 'lai chau', matt: '301' },

  // Dien Bien (302)
  { alias: 'dien bien', matt: '302' },
  { alias: 'dien bien phu', matt: '302' },

  // Son La (303)
  { alias: 'son la', matt: '303' },

  // Thanh Hoa (401)
  { alias: 'thanh hoa', matt: '401' },
  { alias: 'sam son', matt: '401' },
  { alias: 'bim son', matt: '401' },

  // Nghe An (403)
  { alias: 'nghe an', matt: '403' },
  { alias: 'vinh', matt: '403' },
  { alias: 'cua lo', matt: '403' },

  // Ha Tinh (405)
  { alias: 'ha tinh', matt: '405' },

  // Quang Tri (409) - Includes Quang Binh
  { alias: 'quang tri', matt: '409' },
  { alias: 'dong ha', matt: '409' },
  { alias: 'quang binh', matt: '409' },
  { alias: 'dong hoi', matt: '409' },

  // Hue (411)
  { alias: 'thua thien hue', matt: '411' },
  { alias: 'tp hue', matt: '411' },
  { alias: 'hue', matt: '411' },

  // Da Nang (501)
  { alias: 'thanh pho da nang', matt: '501' },
  { alias: 'tp da nang', matt: '501' },
  { alias: 'da nang', matt: '501' },
  { alias: 'quang nam', matt: '501' },

  // Quang Ngai (505) - Includes Kon Tum
  { alias: 'quang ngai', matt: '505' },
  { alias: 'kon tum', matt: '505' },

  // Khanh Hoa (511) - Includes Ninh Thuan
  { alias: 'khanh hoa', matt: '511' },
  { alias: 'nha trang', matt: '511' },
  { alias: 'cam ranh', matt: '511' },
  { alias: 'ninh thuan', matt: '511' },
  { alias: 'phan rang', matt: '511' },

  // Gia Lai (603)
  { alias: 'gia lai', matt: '603' },
  { alias: 'pleiku', matt: '603' },

  // Dak Lak (605) - Includes Dak Nong, Phu Yen
  { alias: 'dak lak', matt: '605' },
  { alias: 'daklak', matt: '605' },
  { alias: 'buon ma thuot', matt: '605' },
  { alias: 'dak nong', matt: '605' },
  { alias: 'phu yen', matt: '605' },
  { alias: 'tuy hoa', matt: '605' },

  // Lam Dong (703) - Includes Binh Thuan
  { alias: 'lam dong', matt: '703' },
  { alias: 'da lat', matt: '703' },
  { alias: 'bao loc', matt: '703' },
  { alias: 'binh thuan', matt: '703' },
  { alias: 'phan thiet', matt: '703' },

  // Tay Ninh (709) - Includes Long An
  { alias: 'tay ninh', matt: '709' },
  { alias: 'long an', matt: '709' },
  { alias: 'tan an', matt: '709' },

  // Dong Nai (713) - Includes Binh Phuoc
  { alias: 'dong nai', matt: '713' },
  { alias: 'bien hoa', matt: '713' },
  { alias: 'long khanh', matt: '713' },
  { alias: 'binh phuoc', matt: '713' },
  { alias: 'dong xoai', matt: '713' },

  // Dong Thap (803)
  { alias: 'dong thap', matt: '803' },
  { alias: 'cao lanh', matt: '803' },
  { alias: 'sa dec', matt: '803' },

  // An Giang (805)
  { alias: 'an giang', matt: '805' },
  { alias: 'long xuyen', matt: '805' },
  { alias: 'chau doc', matt: '805' },

  // Vinh Long (809) - Includes Tien Giang, Ben Tre, Tra Vinh
  { alias: 'vinh long', matt: '809' },
  { alias: 'tien giang', matt: '809' },
  { alias: 'my tho', matt: '809' },
  { alias: 'ben tre', matt: '809' },
  { alias: 'tra vinh', matt: '809' },

  // Can Tho (815) - Includes Hau Giang, Soc Trang
  { alias: 'can tho', matt: '815' },
  { alias: 'hau giang', matt: '815' },
  { alias: 'vi thanh', matt: '815' },
  { alias: 'soc trang', matt: '815' },

  // Ca Mau (823) - Includes Bac Lieu, Kien Giang
  { alias: 'ca mau', matt: '823' },
  { alias: 'bac lieu', matt: '823' },
  { alias: 'kien giang', matt: '823' },
  { alias: 'rach gia', matt: '823' },
  { alias: 'phu quoc', matt: '823' },
  { alias: 'ha tien', matt: '823' }
];

// Sort aliases descending by length for priority matching
const SORTED_ALIASES = RAW_PROVINCE_ALIASES
  .map(a => ({
    alias: cleanText(a.alias),
    paddedAlias: ` ${cleanText(a.alias)} `,
    matt: a.matt,
    rawAlias: a.alias
  }))
  .sort((a, b) => b.alias.length - a.alias.length);

function matchProvinceFromText(cleanAddressStr) {
  if (!cleanAddressStr) return null;
  const padded = ` ${cleanAddressStr} `;

  for (const item of SORTED_ALIASES) {
    if (padded.includes(item.paddedAlias)) {
      const prov = PROVINCE_34_MAP.get(item.matt);
      return {
        matt: item.matt,
        display: prov ? prov.display : `${item.matt} - ${item.alias}`,
        matchedAlias: item.alias,
        rawAlias: item.rawAlias
      };
    }
  }

  return null;
}

module.exports = {
  cleanText,
  PROVINCE_34_LIST,
  PROVINCE_34_MAP,
  SORTED_ALIASES,
  matchProvinceFromText
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/provinceMap.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/converter/provinceMap.js tests/provinceMap.test.js
git commit -m "feat: add 63-to-34 province mapping and alias lookup module"
```

---

### Task 2: Advanced Address Matcher with Substring Detail Extraction (`addressMatcher.js`)

**Files:**
- Modify: `src/converter/addressMatcher.js`
- Test: `tests/addressMatcher.test.js`

**Interfaces:**
- Consumes: `matchProvinceFromText`, `cleanText`, `PROVINCE_34_MAP` from `provinceMap.js`
- Produces: `initAddressMatcher(templateVnPath)` returning `{ matchAddress(rawAddress) }`
  - Output shape: `{ provinceDisplay, wardDisplay, addressDetail, rawAddress }`

- [ ] **Step 1: Write failing tests for detailed extraction & dual address**

```javascript
// tests/addressMatcher.test.js
const test = require('node:test');
const assert = require('node:assert');
const { initAddressMatcher } = require('../src/converter/addressMatcher');

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/addressMatcher.test.js`
Expected: FAIL on `addressDetail` and `rawAddress` assertions.

- [ ] **Step 3: Refactor `src/converter/addressMatcher.js` to implement extraction**

```javascript
// src/converter/addressMatcher.js
const ExcelJS = require('exceljs');
const { cleanText, matchProvinceFromText, PROVINCE_34_MAP } = require('./provinceMap');

function extractDetailedAddress(rawAddress, matchedProvAlias, matchedWardTen) {
  if (!rawAddress) return '';
  let detail = rawAddress;

  // Helper to remove matched pattern case-insensitively
  function removeFragment(str, frag) {
    if (!frag || frag.length < 2) return str;
    const cleanFrag = cleanText(frag);
    // Find matching word sequence in str
    const regex = new RegExp(`(^|[,\\s\\-–/])(${frag.replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&')}|${cleanFrag.replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&')})([,\\s\\-–/]|$)`, 'gi');
    return str.replace(regex, '$1$3');
  }

  if (matchedProvAlias) {
    detail = removeFragment(detail, matchedProvAlias);
  }
  if (matchedWardTen) {
    detail = removeFragment(detail, matchedWardTen);
    const baseWard = matchedWardTen.replace(/^(phường|xã|đặc khu|thị trấn)\s+/i, '');
    detail = removeFragment(detail, baseWard);
  }

  // Also clean common residual keywords (TP, Tỉnh, Huyện, Quận, Việt Nam)
  detail = detail
    .replace(/(^|[,\\s])(thành phố|tỉnh|quận|huyện|thị xã|tp\.|tp|q\.|q|h\.|h)\s*[\w\d\s]*/gi, (match) => {
      // If it looks like a dangling administrative label at the end, strip it
      if (/^(,\s*)?(thành phố|tỉnh|quận|huyện|thị xã|tp|q|h)\s+/i.test(match.trim())) {
        return ' ';
      }
      return match;
    })
    .replace(/,\s*,/g, ',')
    .replace(/^[,\s\-–./]+/, '')
    .replace(/[,\s\-–./]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return detail || rawAddress.trim();
}

async function initAddressMatcher(templateVnPath) {
  const wardsByMatt = new Map();
  const allUniqueWards = [];

  if (templateVnPath) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(templateVnPath);

      const phuongXaSheet = wb.getWorksheet('PHUONG_XA');
      if (phuongXaSheet) {
        phuongXaSheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const ma = String(row.getCell(1).value || '').trim();
            const ten = String(row.getCell(2).value || '').trim();
            const matt = String(row.getCell(3).value || '').trim();
            const display = String(row.getCell(4).value || '').trim();
            if (ma && ten && display) {
              if (!wardsByMatt.has(matt)) {
                wardsByMatt.set(matt, []);
              }
              const cleanTen = cleanText(ten);
              const baseTen = cleanTen.replace(/^(phuong|xa|thi tran|dac khu)\s+/, '');
              const wardObj = {
                ma,
                ten,
                matt,
                display,
                cleanTen,
                paddedCleanTen: ` ${cleanTen} `,
                baseTen,
                paddedBaseTen: ` ${baseTen} `,
                baseLength: baseTen.length
              };
              wardsByMatt.get(matt).push(wardObj);
              allUniqueWards.push(wardObj);
            }
          }
        });

        for (const [, list] of wardsByMatt.entries()) {
          list.sort((a, b) => b.cleanTen.length - a.cleanTen.length);
        }
      }
    } catch {
      // Fallback gracefully
    }
  }

  function matchAddress(rawAddress) {
    if (!rawAddress) {
      return { provinceDisplay: '', wardDisplay: '', addressDetail: '', rawAddress: '' };
    }

    const cleanAddr = cleanText(rawAddress);
    if (!cleanAddr) {
      return { provinceDisplay: '', wardDisplay: '', addressDetail: rawAddress, rawAddress };
    }

    const paddedAddr = ` ${cleanAddr} `;

    // 1. Province Match
    const provMatch = matchProvinceFromText(cleanAddr);
    let matchedMatt = provMatch ? provMatch.matt : '';
    let provinceDisplay = provMatch ? provMatch.display : '';
    let matchedProvAlias = provMatch ? provMatch.rawAlias : '';

    // 2. Ward Match
    let matchedWardObj = null;
    if (matchedMatt && wardsByMatt.has(matchedMatt)) {
      const wards = wardsByMatt.get(matchedMatt);
      for (const w of wards) {
        if (w.paddedCleanTen && paddedAddr.includes(w.paddedCleanTen)) {
          matchedWardObj = w;
          break;
        }
        if (w.paddedBaseTen && w.baseLength >= 3 && paddedAddr.includes(w.paddedBaseTen)) {
          matchedWardObj = w;
          break;
        }
      }
    } else if (!matchedMatt) {
      // Reverse search across distinctive wards
      for (const w of allUniqueWards) {
        if (w.baseLength >= 5 && paddedAddr.includes(w.paddedBaseTen)) {
          matchedWardObj = w;
          matchedMatt = w.matt;
          const p = PROVINCE_34_MAP.get(w.matt);
          provinceDisplay = p ? p.display : `${w.matt}`;
          break;
        }
      }
    }

    const wardDisplay = matchedWardObj ? matchedWardObj.display : '';
    const matchedWardTen = matchedWardObj ? matchedWardObj.ten : '';

    // 3. Extract Detailed Address (Column 13)
    const addressDetail = extractDetailedAddress(rawAddress, matchedProvAlias, matchedWardTen);

    return {
      provinceDisplay,
      wardDisplay,
      addressDetail,
      rawAddress
    };
  }

  return { matchAddress, extractDetailedAddress };
}

module.exports = {
  cleanText,
  initAddressMatcher,
  extractDetailedAddress
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/addressMatcher.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/converter/addressMatcher.js tests/addressMatcher.test.js
git commit -m "feat: implement address extraction and dual-address matcher"
```

---

### Task 3: Excel Exporter & Pipeline Integration (Dual Address Output)

**Files:**
- Modify: `src/converter/excelExporter.js`
- Modify: `src/converter/index.js`
- Test: `tests/excelExporter.test.js`
- Test: `tests/pipeline.test.js`

**Interfaces:**
- `exportToExcel({ vnGuests, foreignGuests, ... })`:
  - `vnGuests` elements contain `{ provinceDisplay, wardDisplay, addressDetail, rawAddress, ... }`
  - Writes Col 11 (`provinceDisplay`), Col 12 (`wardDisplay`), Col 13 (`addressDetail`), Col 19 (`rawAddress`)

- [ ] **Step 1: Write the failing test**

```javascript
// tests/excelExporter.test.js
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { exportToExcel } = require('../src/converter/excelExporter');

test('exportToExcel fills Col 11, 12, 13, and Col 19 GHI CHU with original address', async () => {
  const outDir = path.resolve(__dirname, '../dist/test-excel-dual');
  const sampleVnGuests = [{
    name: 'NGUYEN VAN A',
    dob: '01/01/1990',
    gender: 'M - Nam',
    idTypeDisplay: '8 - Thẻ Căn Cước',
    idNumber: '012345678901',
    provinceDisplay: '701 - TP. Hồ Chí Minh',
    wardDisplay: '701926542 - Phường Phước Thắng',
    addressDetail: '2549D CMT8',
    rawAddress: '2549D CMT8, Phuoc Trung, TP Ba Ria',
    arrival: '01-09-2026',
    departure: '05-09-2026',
    room: '101'
  }];

  const result = await exportToExcel({
    vnGuests: sampleVnGuests,
    foreignGuests: [],
    vnTemplatePath: 'brief/tblt_vn_import.xlsx',
    foreignTemplatePath: 'brief/dklt nc ngoài.xlsx',
    outputDir: outDir,
    timestamp: '20260905999999'
  });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(result.vnFilePath);
  const ws = wb.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU');
  const row5 = ws.getRow(5);

  assert.strictEqual(row5.getCell(11).value, '701 - TP. Hồ Chí Minh', 'Col 11 is new province');
  assert.strictEqual(row5.getCell(12).value, '701926542 - Phường Phước Thắng', 'Col 12 is new ward');
  assert.strictEqual(row5.getCell(13).value, '2549D CMT8', 'Col 13 is cleaned addressDetail');
  assert.strictEqual(row5.getCell(19).value, '2549D CMT8, Phuoc Trung, TP Ba Ria', 'Col 19 is original rawAddress');

  fs.rmSync(outDir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/excelExporter.test.js`
Expected: FAIL (Col 19 does not have rawAddress).

- [ ] **Step 3: Update `src/converter/excelExporter.js` and `src/converter/index.js`**

In `src/converter/excelExporter.js`:
```javascript
// Update row 5+idx mapping:
row.getCell(11).value = g.provinceDisplay || '';
row.getCell(12).value = g.wardDisplay || '';
row.getCell(13).value = g.addressDetail || g.address || '';
row.getCell(14).value = g.arrival || '';
row.getCell(15).value = g.departure || '';
row.getCell(16).value = g.room || '';
row.getCell(17).value = '1 - Du lịch';
row.getCell(18).value = '';
row.getCell(19).value = g.rawAddress || g.address || '';
```

In `src/converter/index.js`:
```javascript
// After matcher.matchAddress(g.address):
const { provinceDisplay, wardDisplay, addressDetail, rawAddress } = matcher.matchAddress(g.address);
g.provinceDisplay = provinceDisplay;
g.wardDisplay = wardDisplay;
g.addressDetail = addressDetail;
g.rawAddress = rawAddress;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/excelExporter.test.js tests/pipeline.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/converter/excelExporter.js src/converter/index.js tests/excelExporter.test.js
git commit -m "feat: output new address in Col 11-13 and original address in Col 19"
```

---

### Task 4: CLI Summary & Full System End-to-End Verification

**Files:**
- Modify: `src/cli.js` (add address mapping stats output)
- Test: Full test suite (`pnpm test` / `node --test tests/*.test.js`)

**Interfaces:**
- CLI logs:
  - `Địa chỉ đã nhận diện Tỉnh/TP mới: X/Y (Z%)`
  - `Địa chỉ đã nhận diện Phường/Xã mới: A/Y (B%)`

- [ ] **Step 1: Update `src/cli.js` with stats reporting**

Enhance CLI console output to show:
```javascript
const provMatched = result.vnGuests.filter(g => g.provinceDisplay).length;
const wardMatched = result.vnGuests.filter(g => g.wardDisplay).length;
console.log(`  - Khớp Tỉnh/Thành mới (34 tỉnh): ${provMatched}/${result.vnCount}`);
console.log(`  - Khớp Phường/Xã mới (3.324 xã/phường): ${wardMatched}/${result.vnCount}`);
```

- [ ] **Step 2: Run all unit and integration tests**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 3: Run end-to-end CLI conversion with sample XML**

Run: `node src/cli.js brief/police_report2_75766981.XML --out dist/cli-output`
Expected: Successful conversion, file `tblt_vn_import_*.xlsx` generated with clean Col 13 and Col 19 original addresses.

- [ ] **Step 4: Commit**

```bash
git add src/cli.js
git commit -m "feat: add address conversion statistics to CLI output"
```
