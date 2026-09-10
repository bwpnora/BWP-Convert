# Vietnam Address Conversion (Old to New, 63 to 34 Provinces) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Nora Convert's address conversion engine to automatically normalize Vietnamese addresses from old 63-province / old ward formats to the new 34-province / 3,324-ward police reporting model with dual-column transparency (Old vs New), add UI comparison preview, and fix the drag-and-drop XML file path error in Electron.

**Architecture:** 
- A dedicated administrative mapping dictionary (`administrativeMapping.js`) defines 63->34 province aliases, old-to-new merged ward lookups, and district fallbacks.
- An enhanced 4-tier address matcher (`addressMatcher.js`) resolves province, ward (direct, alias, district fallback, reverse lookup), cleans detailed street address, and flags match quality.
- The Excel exporter preserves the strict 19-column police schema (`tblt_vn_import.xlsx`) using Col 11/12/13 for new address and Col 19 (GHI CHÚ) for raw old address.
- The UI exposes a collapsible preview table of old vs new addresses and uses Electron `webUtils.getPathForFile` in preload for drag-and-drop compatibility.

**Tech Stack:** Node.js (v20+ / native test runner), Electron 34+, fast-xml-parser, ExcelJS.

**Spec:** [`docs/superpowers/specs/2026-09-10-vietnam-address-conversion-design.md`](file:///c:/Code/nora-convert/docs/superpowers/specs/2026-09-10-vietnam-address-conversion-design.md)

## Global Constraints
- Do not alter the 19-column schema of `tblt_vn_import.xlsx`.
- Excel cell formatting must remain Calibri 11pt non-italic.
- All address resolution must remain 100% offline without external network or API dependencies.
- All tests must pass with `npm test` (`node --test tests/**/*.test.js`).

---

### Task 1: Fix Drag-and-Drop XML file path error in Electron

**Files:**
- Modify: `src/preload/preload.js:1-8`
- Modify: `src/renderer/app.js:154-173`
- Test: `tests/gui.test.js`

**Interfaces:**
- Consumes: Electron `webUtils.getPathForFile(file)`
- Produces: `window.api.getPathForFile(file)` exposed in renderer context bridge

- [ ] **Step 1: Write test verifying preload exposes getPathForFile**

Add to `tests/gui.test.js`:
```javascript
test('preload script exposes getPathForFile API contract', () => {
  const preloadContent = fs.readFileSync(path.join(__dirname, '../src/preload/preload.js'), 'utf-8');
  assert.ok(preloadContent.includes('getPathForFile'), 'Preload must expose getPathForFile');
  assert.ok(preloadContent.includes('webUtils'), 'Preload must require webUtils from electron');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gui.test.js`
Expected: FAIL (assertion error: Preload must expose getPathForFile)

- [ ] **Step 3: Update `src/preload/preload.js` and `src/renderer/app.js`**

In `src/preload/preload.js`:
```javascript
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  convertFile: (filePath) => ipcRenderer.invoke('convert-file', filePath),
  selectFile: () => ipcRenderer.invoke('select-file'),
  openFolder: (folderOrFilePath) => ipcRenderer.invoke('open-folder', folderOrFilePath),
  getPathForFile: (file) => (webUtils && typeof webUtils.getPathForFile === 'function' ? webUtils.getPathForFile(file) : (file ? file.path : ''))
});
```

In `src/renderer/app.js` (inside `dropzone.addEventListener('drop')`):
```javascript
    const file = dt.files[0];
    const path = (window.api && typeof window.api.getPathForFile === 'function')
      ? window.api.getPathForFile(file)
      : (file ? file.path : '');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/preload/preload.js src/renderer/app.js tests/gui.test.js
git commit -m "fix: resolve electron drag-and-drop file path retrieval via webUtils"
```

---

### Task 2: Build Administrative Mapping Module (`administrativeMapping.js`)

**Files:**
- Create: `src/converter/administrativeMapping.js`
- Test: `tests/administrativeMapping.test.js`

**Interfaces:**
- Produces:
  - `OLD_PROVINCE_EXTRA_ALIASES`: Array of `{ alias, matt }` for 63 -> 34 province consolidation (Hue, HN, SG, Binh Duong, Hai Duong, etc.)
  - `OLD_WARD_TO_NEW_WARD_MAP`: Map or lookup function `lookupMergedWard(matt, cleanWardName)` -> `{ ma, ten, display }`
  - `OLD_DISTRICT_FALLBACK_MAP`: Map or lookup function `lookupDistrictFallback(matt, cleanDistrictName)` -> `{ ma, ten, display }`

- [ ] **Step 1: Write unit tests for administrative mapping**

Create `tests/administrativeMapping.test.js`:
```javascript
const test = require('node:test');
const assert = require('node:assert');
const {
  lookupMergedWard,
  lookupDistrictFallback,
  OLD_PROVINCE_EXTRA_ALIASES
} = require('../src/converter/administrativeMapping');

test('administrativeMapping maps old provinces correctly', () => {
  const hue = OLD_PROVINCE_EXTRA_ALIASES.find(a => a.alias === 'hue');
  assert.ok(hue, 'Must have alias hue');
  assert.strictEqual(hue.matt, '411');

  const bd = OLD_PROVINCE_EXTRA_ALIASES.find(a => a.alias === 'binh duong');
  assert.ok(bd, 'Must have alias binh duong');
  assert.strictEqual(bd.matt, '701');
});

test('administrativeMapping maps merged HCM wards', () => {
  const r1 = lookupMergedWard('701', 'nguyen thai binh');
  assert.ok(r1, 'Nguyen Thai Binh must map to a new ward');
  assert.ok(r1.ten.includes('Bến Thành') || r1.ten.includes('Cầu Ông Lãnh'));

  const r2 = lookupMergedWard('701', 'hang bong');
  assert.strictEqual(r2, null, 'Hang Bong is in Hanoi, not HCM');
});

test('administrativeMapping falls back to representative district ward', () => {
  const q1 = lookupDistrictFallback('701', 'q1');
  assert.ok(q1, 'Q1 must map to Ben Thanh');
  assert.ok(q1.ten.includes('Bến Thành'));

  const tanBinh = lookupDistrictFallback('701', 'tan binh');
  assert.ok(tanBinh, 'Tan Binh must map to Tan Binh ward');
  assert.ok(tanBinh.ten.includes('Tân Bình'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/administrativeMapping.test.js`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Implement `src/converter/administrativeMapping.js`**

Implement comprehensive mappings for:
- All 63 old provinces mapped to 34 `MATT`.
- Common merged wards in HCM (`701`), Hanoi (`101`), Hue (`411`), Da Nang (`501`).
- District fallbacks for Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12, Bình Thạnh, Gò Vấp, Phú Nhuận, Tân Bình, Tân Phú, Bình Tân, Thủ Đức, Củ Chi, Hóc Môn, Bình Chánh, Nhà Bè, Cần Giờ, Hoàn Kiếm, Ba Đình, Đống Đa, Hai Bà Trưng, v.v.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/administrativeMapping.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/converter/administrativeMapping.js tests/administrativeMapping.test.js
git commit -m "feat: add administrative mapping dictionary for vietnam province and ward reform"
```

---

### Task 3: Upgrade `addressMatcher.js` & `provinceMap.js` with Multi-tier Resolution

**Files:**
- Modify: `src/converter/provinceMap.js:53-252`
- Modify: `src/converter/addressMatcher.js:31-230`
- Test: `tests/addressMatcher.test.js`

**Interfaces:**
- Consumes: `administrativeMapping.js`
- Produces:
  - `matchAddress(rawAddress)`: Returns `{ provinceDisplay, wardDisplay, addressDetail, rawAddress, matchQuality }`
  - `matchQuality` enum: `'EXACT' | 'WARD_ALIASED' | 'DISTRICT_FALLBACK' | 'UNMATCHED'`

- [ ] **Step 1: Write test cases in `tests/addressMatcher.test.js` for real XML addresses**

Add tests to `tests/addressMatcher.test.js`:
```javascript
test('addressMatcher correctly converts real-world Opera PMS addresses to 34-province & new wards', async () => {
  const matcher = await initAddressMatcher('brief/tblt_vn_import.xlsx');

  // Case 1: Q1 with old ward Nguyen Thai Binh
  const r1 = matcher.matchAddress('59 PHAM NGU LAO, NGUYEN THAI BINH, Q1, Ho Chi Minh');
  assert.strictEqual(r1.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.ok(r1.wardDisplay.includes('Bến Thành'));
  assert.ok(r1.addressDetail.includes('59 PHAM NGU LAO'));

  // Case 2: Hanoi old ward Hang Bong, Hoan Kiem
  const r2 = matcher.matchAddress('23 HOI VU,HANG BONG, HOAN KIEM, HA NOI');
  assert.strictEqual(r2.provinceDisplay, '101 - TP. Hà Nội');
  assert.ok(r2.wardDisplay.includes('Hoàn Kiếm'));
  assert.ok(r2.addressDetail.includes('23 HOI VU'));

  // Case 3: Hue address
  const r3 = matcher.matchAddress('56 THANH LAM BO, PHU XUAN, HUE');
  assert.strictEqual(r3.provinceDisplay, '411 - TP. Huế');

  // Case 4: District fallback (only district without specific ward)
  const r4 = matcher.matchAddress('11 DONG DEN, PHUONG 1, TAN BINH, HO CHI MINH');
  assert.strictEqual(r4.provinceDisplay, '701 - TP. Hồ Chí Minh');
  assert.ok(r4.wardDisplay.includes('Tân Bình'));
  assert.ok(r4.addressDetail.includes('11 DONG DEN'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/addressMatcher.test.js`
Expected: FAIL (on Case 1 or Case 3 matching Hue/Ninh Binh)

- [ ] **Step 3: Integrate `administrativeMapping` into `provinceMap.js` and `addressMatcher.js`**

- In `provinceMap.js`: Merge `OLD_PROVINCE_EXTRA_ALIASES` into `RAW_PROVINCE_ALIASES`, ensuring word boundary padding and longest-match-first sorting.
- In `addressMatcher.js`:
  1. Match province.
  2. Inside matched province:
     - Match direct `PHUONG_XA`.
     - Match `lookupMergedWard`.
     - Match `lookupDistrictFallback`.
     - Reverse lookup for unassigned provinces.
  3. Clean `addressDetail`: Preserve numbers, lots (`Lô H`), TDP, street names. Strip matched province and ward. Keep district name if fallback was applied.
  4. Return `matchQuality`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/addressMatcher.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/converter/provinceMap.js src/converter/addressMatcher.js tests/addressMatcher.test.js
git commit -m "feat: upgrade addressMatcher with 4-tier resolution and clean detail extraction"
```

---

### Task 4: Update `excelExporter.js` & `index.js` for Dual-Column Transparency

**Files:**
- Modify: `src/converter/excelExporter.js:31-65`
- Modify: `src/converter/index.js:34-42`
- Test: `tests/excelExporter.test.js`
- Test: `tests/pipeline.test.js`

**Interfaces:**
- Consumes: `matcher.matchAddress` output
- Produces: Excel file `tblt_vn_import.xlsx` with Col 11 (Tỉnh mới), Col 12 (Phường mới), Col 13 (Địa chỉ chi tiết mới), Col 19 (Địa chỉ cũ raw)

- [ ] **Step 1: Write test in `tests/excelExporter.test.js` verifying Excel column contents**

Add test:
```javascript
test('exportToExcel populates Col 11, 12, 13 with new address and Col 19 with raw old address', async () => {
  // Test export of sample VN guests and assert cell values for row 5 (first guest)
});
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `node --test tests/excelExporter.test.js`

- [ ] **Step 3: Update `src/converter/index.js` and `src/converter/excelExporter.js`**

Ensure `index.js` passes `matchQuality` and formatted new address along with `vnGuests`.
Ensure `excelExporter.js` writes:
- Col 11: `g.provinceDisplay`
- Col 12: `g.wardDisplay`
- Col 13: `g.addressDetail`
- Col 19: `g.rawAddress || g.address`
- Sets Calibri 11pt, `italic: false` across all cells.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/excelExporter.test.js tests/pipeline.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/converter/excelExporter.js src/converter/index.js tests/excelExporter.test.js tests/pipeline.test.js
git commit -m "feat: export dual-column address format in compliance with 19-column police template"
```

---

### Task 5: Add Address Comparison Preview Table to UI

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/styles.css`
- Modify: `src/renderer/app.js`
- Test: `tests/gui.test.js`

**Interfaces:**
- Consumes: `result.vnGuests` with `{ name, room, rawAddress, provinceDisplay, wardDisplay, addressDetail, matchQuality }`
- Produces: Interactive table on results screen with toggleable expand/collapse

- [ ] **Step 1: Write test for UI preview markup and logic contract**

In `tests/gui.test.js`:
```javascript
test('HTML template and app logic contain address preview section', () => {
  const html = fs.readFileSync('src/renderer/index.html', 'utf-8');
  assert.ok(html.includes('address-preview-section'), 'Must contain address-preview-section');
  assert.ok(html.includes('table'), 'Must render preview table');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gui.test.js`
Expected: FAIL (assertion error: Must contain address-preview-section)

- [ ] **Step 3: Implement Address Preview in `index.html`, `styles.css`, and `app.js`**

- In `src/renderer/index.html`: Add an accordion / collapsible card in `results-section` displaying:
  - Header: "📋 Đối chiếu Chuyển đổi Địa chỉ (Khách Việt Nam)" with guest count badge.
  - Table: STT, Khách & Phòng, Địa chỉ cũ (PMS), Địa chỉ mới (Công an), Trạng thái (Badge).
- In `src/renderer/styles.css`: Add styles for the preview table, badge colors (green, yellow, gray), scrollable container with max-height.
- In `src/renderer/app.js`: Populate table rows dynamically on conversion success.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/index.html src/renderer/styles.css src/renderer/app.js tests/gui.test.js
git commit -m "feat: add interactive address comparison preview table to renderer UI"
```

---

### Task 6: End-to-End Verification Across All Test Suites

**Files:**
- Test: `tests/verifyOutputs.test.js`
- Test: All test files in `tests/`

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests pass (0 failures)

- [ ] **Step 2: Verify sample XML conversion outputs**

Run: `node src/cli.js brief/police_report2_75766981.XML`
Expected: Successful conversion of 15 VN guests and foreign guests with proper address mapping.

- [ ] **Step 3: Commit final verification**

```bash
git commit --allow-empty -m "chore: complete vietnam address conversion verification"
```
