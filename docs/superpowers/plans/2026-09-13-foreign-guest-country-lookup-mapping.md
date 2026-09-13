# Foreign Guest Country LookUp Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically convert and normalize foreign guest nationality codes and country names from Opera PMS reports to the exact 205-country format required by the 'Lookup' sheet of `dklt nc ngoài.xlsx` (e.g. `TW` -> `TWN - Taiwan`, `NI` -> `NGA - Nigeria`, `D` / `DE` -> `D - Germany`), strictly scoped to foreign guests without altering Vietnamese guest exports.

**Architecture:** A dedicated, self-contained dictionary module `src/converter/countryMap.js` containing the 205 official target records, an inverted $O(1)$ lookup index mapping ISO-2, ISO-3, English names, and hotel aliases (e.g., `NI` for Nigeria, `UK` for Great Britain, `HK` for China), and a resilient resolver `normalizeForeignCountry(rawInput)`. The resolver is integrated into `src/converter/excelExporter.js` exclusively in the foreign guest export loop writing to `KBTT` Column 6, while keeping `tblt_vn_import.xlsx` 100% untouched.

**Tech Stack:** Node.js, ExcelJS, fast-xml-parser, node:test.

**Spec:** `docs/superpowers/specs/2026-09-13-foreign-guest-country-lookup-mapping-design.md`

## Global Constraints

- Scope Boundary: Apply country normalization ONLY to foreign guests (`foreignGuests` / `dklt_nc_ngoai_*.xlsx`), strictly leaving Vietnamese guest exports (`tblt_vn_import_*.xlsx`) unchanged (`VNM - Viet Nam`).
- Template Parity: All canonical records in `countryMap.js` must match 100% of the 205 entries in Column A of Sheet `Lookup` in `brief/dklt nc ngoài.xlsx`.
- Zero External Dependencies: Implement mapping without external npm packages to preserve offline performance and lightweight packaging.
- Backward Compatibility: Return raw trimmed input as graceful fallback for unmapped values.

---

### Task 1: Create `src/converter/countryMap.js` and Unit Tests

**Files:**
- Create: `src/converter/countryMap.js`
- Create: `tests/countryMap.test.js`

**Interfaces:**
- Consumes: `brief/dklt nc ngoài.xlsx` (for test parity verification)
- Produces:
  - `LOOKUP_COUNTRY_LIST`: Array of 205 objects `{ code: string, name: string, display: string }`
  - `COUNTRY_INDEX`: Map<string, string>
  - `normalizeForeignCountry(rawInput: string): string`

- [ ] **Step 1: Write the failing test in `tests/countryMap.test.js`**

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const ExcelJS = require('exceljs');
const {
  LOOKUP_COUNTRY_LIST,
  COUNTRY_INDEX,
  normalizeForeignCountry
} = require('../src/converter/countryMap');

test('countryMap: validates 100% parity with brief/dklt nc ngoài.xlsx Lookup sheet', async () => {
  const templatePath = path.resolve(__dirname, '../brief/dklt nc ngoài.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet('Lookup');
  assert.ok(ws, 'Lookup sheet must exist in foreign template');

  const templateCountries = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const val = ws.getRow(r).getCell(1).value;
    if (val) templateCountries.push(String(val).trim());
  }

  assert.equal(LOOKUP_COUNTRY_LIST.length, 205, 'Must contain exactly 205 countries');
  assert.equal(templateCountries.length, 205, 'Template must contain exactly 205 countries');

  for (let i = 0; i < 205; i++) {
    assert.equal(
      LOOKUP_COUNTRY_LIST[i].display,
      templateCountries[i],
      `Mismatch at index ${i}: expected ${templateCountries[i]}, got ${LOOKUP_COUNTRY_LIST[i].display}`
    );
  }
});

test('countryMap: resolves ISO-2 codes correctly', () => {
  assert.equal(normalizeForeignCountry('TW'), 'TWN - Taiwan');
  assert.equal(normalizeForeignCountry('tw'), 'TWN - Taiwan');
  assert.equal(normalizeForeignCountry('US'), 'USA - United States of America');
  assert.equal(normalizeForeignCountry('KR'), 'KOR - Korea (South)');
  assert.equal(normalizeForeignCountry('JP'), 'JPN - Japan');
  assert.equal(normalizeForeignCountry('CN'), 'CHN - China');
  assert.equal(normalizeForeignCountry('TH'), 'THA - Thailand');
  assert.equal(normalizeForeignCountry('DE'), 'D - Germany');
  assert.equal(normalizeForeignCountry('GB'), 'GBR - United Kingdom of Great Britain and Northern Ireland');
  assert.equal(normalizeForeignCountry('FR'), 'FRA - France');
  assert.equal(normalizeForeignCountry('AU'), 'AUS - Australia');
  assert.equal(normalizeForeignCountry('SG'), 'SGP - Singapore');
  assert.equal(normalizeForeignCountry('VN'), 'VNM - Viet Nam');
});

test('countryMap: resolves hotel PMS aliases and practical edge cases', () => {
  assert.equal(normalizeForeignCountry('NI'), 'NGA - Nigeria');
  assert.equal(normalizeForeignCountry('NG'), 'NGA - Nigeria');
  assert.equal(normalizeForeignCountry('UK'), 'GBR - United Kingdom of Great Britain and Northern Ireland');
  assert.equal(normalizeForeignCountry('D'), 'D - Germany');
  assert.equal(normalizeForeignCountry('DEU'), 'D - Germany');
  assert.equal(normalizeForeignCountry('HK'), 'CHN - China');
  assert.equal(normalizeForeignCountry('HKG'), 'CHN - China');
  assert.equal(normalizeForeignCountry('HONG KONG'), 'CHN - China');
  assert.equal(normalizeForeignCountry('MACAU'), 'CHN - China');
  assert.equal(normalizeForeignCountry('SCOTLAND'), 'SC- - Scotland');
  assert.equal(normalizeForeignCountry('ENGLAND'), 'GBR - United Kingdom of Great Britain and Northern Ireland');
  assert.equal(normalizeForeignCountry('GREAT BRITAIN'), 'GBR - United Kingdom of Great Britain and Northern Ireland');
  assert.equal(normalizeForeignCountry('SOUTH KOREA'), 'KOR - Korea (South)');
  assert.equal(normalizeForeignCountry('NORTH KOREA'), 'PRK - Korea Democratic Peoples Republic of');
  assert.equal(normalizeForeignCountry('LAOS'), 'LAO - Lao Peoples Democratic Republic');
  assert.equal(normalizeForeignCountry('HOLLAND'), 'NLD - Netherland');
});

test('countryMap: resolves ISO-3 codes and full names', () => {
  assert.equal(normalizeForeignCountry('TWN'), 'TWN - Taiwan');
  assert.equal(normalizeForeignCountry('USA'), 'USA - United States of America');
  assert.equal(normalizeForeignCountry('Taiwan'), 'TWN - Taiwan');
  assert.equal(normalizeForeignCountry('germany'), 'D - Germany');
  assert.equal(normalizeForeignCountry('TWN - Taiwan'), 'TWN - Taiwan');
});

test('countryMap: defensive fallback for empty and unknown values', () => {
  assert.equal(normalizeForeignCountry(''), '');
  assert.equal(normalizeForeignCountry(null), '');
  assert.equal(normalizeForeignCountry(undefined), '');
  assert.equal(normalizeForeignCountry('   '), '');
  assert.equal(normalizeForeignCountry('UNKNOWN_COUNTRY_XYZ'), 'UNKNOWN_COUNTRY_XYZ');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/countryMap.test.js`
Expected: FAIL with "Cannot find module '../src/converter/countryMap'"

- [ ] **Step 3: Implement `src/converter/countryMap.js`**

Create `src/converter/countryMap.js` containing:
- Complete `RAW_LOOKUP_COUNTRY_STRINGS` (all 205 official items from the template).
- Comprehensive `ISO2_TO_CODE` mapping table covering standard ISO-2 codes for all 205 countries.
- Custom hotel aliases (`NI` -> `NGA - Nigeria`, `UK` -> `GBR`, `HK`/`MO` -> `CHN`, `SCOTLAND` -> `SC-`, etc.).
- Fast `COUNTRY_INDEX` hash map initialization.
- `normalizeForeignCountry(rawInput)` implementation.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/countryMap.test.js`
Expected: All 5 test cases PASS.

- [ ] **Step 5: Commit**

```bash
git add src/converter/countryMap.js tests/countryMap.test.js
git commit -m "feat(countryMap): add 205-country Lookup mapping module and tests"
```

---

### Task 2: Integrate `countryMap` into `excelExporter.js` and `xmlParser.js`

**Files:**
- Modify: `src/converter/excelExporter.js:80-130`
- Modify: `src/converter/xmlParser.js:1-30, 110-125`
- Test: `tests/excelExporter.test.js`
- Test: `tests/xmlParser.test.js`

**Interfaces:**
- Consumes: `normalizeForeignCountry` from `src/converter/countryMap.js`
- Produces: Normalized Column 6 values in Sheet `KBTT` of `dklt_nc_ngoai_*.xlsx`

- [ ] **Step 1: Write the failing test for foreign export country normalization**

In `tests/excelExporter.test.js`, add test verifying foreign guests with raw nationality codes `TW` and `NI` are exported to Column 6 as `TWN - Taiwan` and `NGA - Nigeria`, while Vietnamese guests retain `VNM - Viet Nam` in Column 5.

- [ ] **Step 2: Run test to verify failure**

Run: `node --test tests/excelExporter.test.js`
Expected: FAIL (guest with nationality `TW` still has `TW` in cell 6).

- [ ] **Step 3: Implement changes in `src/converter/excelExporter.js` and `src/converter/xmlParser.js`**

In `src/converter/excelExporter.js`:
- Import `normalizeForeignCountry` from `./countryMap`.
- In `foreignGuests.forEach`:
  ```javascript
  const rawNat = g.nationalityCode || g.nationality || '';
  row.getCell(6).value = normalizeForeignCountry(rawNat) || 'CHN - China';
  ```
- Keep `vnGuests.forEach` completely unchanged:
  ```javascript
  row.getCell(5).value = g.nationalityCode || 'VNM - Viet Nam';
  ```

In `src/converter/xmlParser.js`:
- Delegate foreign nationality parsing through `normalizeForeignCountry`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/excelExporter.test.js tests/xmlParser.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/converter/excelExporter.js src/converter/xmlParser.js tests/excelExporter.test.js tests/xmlParser.test.js
git commit -m "feat(converter): apply country normalization to foreign guest export"
```

---

### Task 3: Full End-to-End Verification & Regression Testing

**Files:**
- Test: `tests/**/*.test.js`
- Verify: `brief/dklt_nc_ngoai_20260913074930.xlsx` comparison / real export run

- [ ] **Step 1: Run the full automated test suite**

Run: `pnpm test`
Expected: All tests pass (0 failures).

- [ ] **Step 2: Run end-to-end verification script against sample XML**

Execute a test conversion with `brief/police_report2_75766981.XML` or an XML containing `TW` and `NI` guests. Confirm:
- In generated `dklt_nc_ngoai_*.xlsx`:
  - Taiwan guests show `TWN - Taiwan` in Column 6.
  - Nigerian guest shows `NGA - Nigeria` in Column 6.
  - All foreign country values are valid values in Sheet `Lookup`.
- In generated `tblt_vn_import_*.xlsx`:
  - Vietnamese guests show `VNM - Viet Nam` in Column 5.
  - No changes to C06 VN structure.

- [ ] **Step 3: Commit any test adjustments or verification helpers**

```bash
git commit --allow-empty -m "chore(test): verify end-to-end country lookup conversion"
```
