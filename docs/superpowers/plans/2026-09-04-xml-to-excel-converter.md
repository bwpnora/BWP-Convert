# Opera PMS XML to Excel Converter (nora-convert) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, standalone Windows Desktop application (`nora-convert`) using Electron and Node.js to convert Opera PMS police report XML files into two official Excel files (`tblt_vn_import.xlsx` and `dklt nc ngoài.xlsx`) with automated data formatting, classification, and address parsing.

**Architecture:** A modular Node.js core library (`xmlParser`, `addressMatcher`, `excelExporter`, `pipeline`) with independent CLI and unit test suites, wrapped by an Electron Desktop frontend (`main`, `preload`, `renderer`) providing a modern drag-and-drop user interface.

**Tech Stack:** Node.js (v25+), Electron, `fast-xml-parser`, `exceljs`, Node.js native test runner (`node:test`, `node:assert`).

**Spec:** `docs/superpowers/specs/2026-09-04-xml-to-excel-converter-design.md`

## Global Constraints

- Must run on Windows 10/11 x64.
- Must use existing Excel templates in `brief/` as base files, preserving all sheets (`TINH_THANH`, `PHUONG_XA`, `DANH_MUC`, `Lookup`), styles, and validations.
- Vietnamese guests populate `DS_KHACH_VIET_NAM_LUU_TRU` starting at row 5.
- Foreign guests populate `KBTT` starting at row 4.
- Guest names must be uppercase without commas.
- Dates must be standardized (`dd-MM-yyyy` or `dd/MM/yyyy`).
- All guests in XML (`CKIN` and `RS`) are processed.

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `tests/setup.test.js`

**Interfaces:**
- Produces: Project build & test configuration in `package.json`.

- [ ] **Step 1: Create package.json and .gitignore**

Write `package.json` with dependencies (`fast-xml-parser`, `exceljs`, `electron`, `electron-builder`) and scripts:

```json
{
  "name": "nora-convert",
  "version": "1.0.0",
  "description": "Opera PMS XML to Excel Converter for Vietnamese and Foreign Police Stay Reports",
  "main": "src/main/main.js",
  "type": "commonjs",
  "scripts": {
    "start": "electron .",
    "test": "node --test tests/**/*.test.js",
    "convert": "node src/cli.js",
    "dist": "electron-builder --win"
  },
  "dependencies": {
    "exceljs": "^4.4.0",
    "fast-xml-parser": "^4.5.3"
  },
  "devDependencies": {
    "electron": "^34.3.0",
    "electron-builder": "^25.1.8"
  },
  "build": {
    "appId": "com.noraconvert.app",
    "productName": "nora-convert",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": "nsis"
    }
  }
}
```

Write `.gitignore`:
```
node_modules/
dist/
output/
.gemini/
*.log
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: Dependencies installed into `node_modules`.

- [ ] **Step 3: Write sanity test**

Create `tests/setup.test.js`:
```javascript
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

test('brief template files and XML sample exist', () => {
  assert.ok(fs.existsSync('brief/police_report2_75766981.XML'), 'Sample XML must exist');
  assert.ok(fs.existsSync('brief/tblt_vn_import.xlsx'), 'VN template must exist');
  assert.ok(fs.existsSync('brief/dklt nc ngoài.xlsx'), 'Foreign template must exist');
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with 1 passing test.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore tests/setup.test.js
git commit -m "chore: setup project dependencies and initial test"
```

---

### Task 2: XML Parser Module

**Files:**
- Create: `src/converter/xmlParser.js`
- Create: `tests/xmlParser.test.js`

**Interfaces:**
- Produces: `parsePoliceReport(xmlContent: string) => { vnGuests: Array<Guest>, foreignGuests: Array<Guest>, total: number }`

- [ ] **Step 1: Write failing test for XML parsing**

Create `tests/xmlParser.test.js`:
```javascript
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { parsePoliceReport } = require('../src/converter/xmlParser');

test('parsePoliceReport extracts all 45 guests and categorizes VN vs Foreign', () => {
  const xmlData = fs.readFileSync('brief/police_report2_75766981.XML', 'utf-8');
  const result = parsePoliceReport(xmlData);

  assert.strictEqual(result.total, 45, 'Total guests should be 45');
  assert.strictEqual(result.vnGuests.length, 33, 'Total VN guests should be 33');
  assert.strictEqual(result.foreignGuests.length, 12, 'Total Foreign guests should be 12');

  // Verify first foreign guest: YANG WEIBAO
  const firstForeign = result.foreignGuests.find(g => g.name.includes('YANG WEIBAO'));
  assert.ok(firstForeign, 'YANG WEIBAO must be found in foreign guests');
  assert.strictEqual(firstForeign.room, '2710');
  assert.strictEqual(firstForeign.gender, 'M - Nam');
  assert.strictEqual(firstForeign.nationalityCode, 'CHN - China');

  // Verify first VN guest: TRAN HUU BINH
  const firstVn = result.vnGuests.find(g => g.name.includes('TRAN HUU BINH'));
  assert.ok(firstVn, 'TRAN HUU BINH must be found in VN guests');
  assert.strictEqual(firstVn.room, '2303');
  assert.strictEqual(firstVn.gender, 'M - Nam');
  assert.strictEqual(firstVn.nationalityCode, 'VNM - Viet Nam');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xmlParser.test.js`
Expected: FAIL with "Cannot find module '../src/converter/xmlParser'".

- [ ] **Step 3: Implement xmlParser.js**

Create `src/converter/xmlParser.js`:
```javascript
const { XMLParser } = require('fast-xml-parser');

const COUNTRY_LOOKUP_MAP = {
  'CN': 'CHN - China',
  'CHINA': 'CHN - China',
  'KR': 'KOR - Korea (South)',
  'KOREA (SOUTH)': 'KOR - Korea (South)',
  'KOREA, REPUBLIC OF': 'KOR - Korea (South)',
  'TH': 'THA - Thailand',
  'THAILAND': 'THA - Thailand',
  'US': 'USA - United States of America',
  'USA': 'USA - United States of America',
  'UNITED STATES': 'USA - United States of America',
  'JP': 'JPN - Japan',
  'JAPAN': 'JPN - Japan',
  'VN': 'VNM - Viet Nam',
  'VNM': 'VNM - Viet Nam',
  'VIETNAM': 'VNM - Viet Nam',
  'VIET NAM': 'VNM - Viet Nam'
};

function normalizeName(nameFormula, first, last) {
  let raw = nameFormula || '';
  if (!raw && (first || last)) {
    raw = `${first || ''} ${last || ''}`.trim();
  }
  if (raw.includes(',')) {
    const parts = raw.split(',').map(p => p.trim());
    if (parts.length === 2) {
      raw = `${parts[1]} ${parts[0]}`;
    }
  }
  return raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

function normalizeDate(rawDate, defaultYearPrefix = '20') {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  const match = str.match(/^(\d{2})[-/](\d{2})[-/](\d{2})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${d}/${m}/${defaultYearPrefix}${y}`;
  }
  const match4 = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match4) {
    const [, d, m, y] = match4;
    return `${d}/${m}/${y}`;
  }
  return str;
}

function normalizeGender(g) {
  if (!g) return '';
  const val = String(g).trim().toUpperCase();
  if (val === 'M' || val === 'NAM') return 'M - Nam';
  if (val === 'F' || val === 'NỮ' || val === 'NU') return 'F - Nữ';
  return val;
}

function normalizeCountry(codeOrName) {
  if (!codeOrName) return '';
  const key = String(codeOrName).trim().toUpperCase();
  return COUNTRY_LOOKUP_MAP[key] || codeOrName;
}

function parsePoliceReport(xmlContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
    isArray: (name) => ['G_NATIONALITY', 'G_FIRST', 'Q_ID'].includes(name)
  });

  const parsed = parser.parse(xmlContent);
  const root = parsed.POLICE_REPORT2;
  if (!root) {
    throw new Error('Định dạng XML không hợp lệ (không tìm thấy POLICE_REPORT2)');
  }

  const natGroups = root.LIST_G_NATIONALITY?.G_NATIONALITY || [];
  const vnGuests = [];
  const foreignGuests = [];

  for (const gNat of natGroups) {
    const natCode = (gNat.NATIONALITY || '').trim();
    const natName = (gNat.NATIONALITY_NAME || '').trim();
    const guests = gNat.LIST_G_FIRST?.G_FIRST || [];

    for (const g of guests) {
      const countryDesc = (g.COUNTRY_DESCRIPTION || '').trim();
      const guestCountry = (g.GUEST_COUNTRY || '').trim();

      const qIds = g.LIST_Q_ID?.Q_ID || [];
      const primaryId = qIds[0] || {};
      const idType = (primaryId.ID_TYPE || '').trim().toUpperCase();
      const idNumber = (primaryId.ID_NUMBER || '').trim();

      const fullName = normalizeName(g.NAME_FORMULA, g.FIRST, g.LAST);
      const arrival = normalizeDate(g.TO_CHAR_RGV_TRUNC_ARRIVAL_PMS_);
      const departure = normalizeDate(g.TO_CHAR_RGV_TRUNC_DEPARTURE_PM);
      const dob = normalizeDate(g.BIRTH_DATE);
      const gender = normalizeGender(g.GENDER);
      const room = String(g.ROOM || '').trim();
      const address = [g.ADDRESS1, g.CITY].filter(Boolean).map(s => String(s).trim()).join(', ');
      const visaNumber = (g.VISA_NUMBER || '').trim();
      const visaExp = normalizeDate(g.VISA_EXPIRATION_DATE);
      const status = (g.RESV_STATUS || '').trim();

      const isVNExplicit = ['VN', 'VNM'].includes(natCode.toUpperCase()) ||
                           ['VN', 'VNM'].includes(guestCountry.toUpperCase()) ||
                           countryDesc.toLowerCase().includes('vietnam');

      const isUnknown = natCode.toUpperCase() === 'UNKNOWN' || !natCode;
      const isVnFallback = isUnknown && (idType === 'ID' || !idType || qIds.length === 0);

      const guestObj = {
        name: fullName,
        room,
        arrival,
        departure,
        dob,
        gender,
        idType,
        idNumber,
        address,
        visaNumber,
        visaExp,
        status
      };

      if (isVNExplicit || isVnFallback) {
        guestObj.nationalityCode = 'VNM - Viet Nam';
        guestObj.idTypeDisplay = idType === 'PASSPORT' ? '4 - Hộ chiếu' : '8 - Thẻ Căn Cước';
        vnGuests.push(guestObj);
      } else {
        const rawCountry = natCode || guestCountry || countryDesc;
        guestObj.nationalityCode = normalizeCountry(rawCountry);
        foreignGuests.push(guestObj);
      }
    }
  }

  return {
    total: vnGuests.length + foreignGuests.length,
    vnGuests,
    foreignGuests
  };
}

module.exports = {
  parsePoliceReport,
  normalizeName,
  normalizeDate,
  normalizeGender,
  normalizeCountry
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xmlParser.test.js`
Expected: PASS (All 45 guests extracted, 33 VN and 12 Foreign).

- [ ] **Step 5: Commit**

```bash
git add src/converter/xmlParser.js tests/xmlParser.test.js
git commit -m "feat: implement XML parser for Opera PMS police report"
```

---

### Task 3: Address & Administrative Division Matcher Module

**Files:**
- Create: `src/converter/addressMatcher.js`
- Create: `tests/addressMatcher.test.js`

**Interfaces:**
- Produces: `initAddressMatcher(templateVnPath: string) => Promise<{ matchAddress: (addressStr: string) => { provinceDisplay: string, wardDisplay: string } }>`

- [ ] **Step 1: Write failing test for addressMatcher**

Create `tests/addressMatcher.test.js`:
```javascript
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/addressMatcher.test.js`
Expected: FAIL with "Cannot find module '../src/converter/addressMatcher'".

- [ ] **Step 3: Implement addressMatcher.js**

Create `src/converter/addressMatcher.js`:
```javascript
const ExcelJS = require('exceljs');

function cleanText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function initAddressMatcher(templateVnPath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templateVnPath);

  const provinces = [];
  const tinhThanhSheet = wb.getWorksheet('TINH_THANH');
  if (tinhThanhSheet) {
    tinhThanhSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const matt = String(row.getCell(1).value || '').trim();
        const tentt = String(row.getCell(2).value || '').trim();
        const display = String(row.getCell(3).value || '').trim();
        if (matt && tentt && display) {
          provinces.push({
            matt,
            tentt,
            display,
            cleanTentt: cleanText(tentt)
          });
        }
      }
    });
  }

  const aliasMap = [
    { alias: cleanText('hồ chí minh'), matt: '701' },
    { alias: cleanText('tp hcm'), matt: '701' },
    { alias: cleanText('tphcm'), matt: '701' },
    { alias: cleanText('sài gòn'), matt: '701' },
    { alias: cleanText('saigon'), matt: '701' },
    { alias: cleanText('hà nội'), matt: '101' },
    { alias: cleanText('ha noi'), matt: '101' },
    { alias: cleanText('bà rịa'), matt: '717' },
    { alias: cleanText('vũng tàu'), matt: '717' }
  ];

  function matchAddress(addressStr) {
    if (!addressStr) return { provinceDisplay: '', wardDisplay: '' };
    const cleanAddr = cleanText(addressStr);

    for (const { alias, matt } of aliasMap) {
      if (cleanAddr.includes(alias)) {
        const found = provinces.find(p => p.matt === matt);
        if (found) {
          return { provinceDisplay: found.display, wardDisplay: '' };
        }
      }
    }

    for (const p of provinces) {
      if (cleanAddr.includes(p.cleanTentt)) {
        return { provinceDisplay: p.display, wardDisplay: '' };
      }
    }

    return { provinceDisplay: '', wardDisplay: '' };
  }

  return { matchAddress };
}

module.exports = { initAddressMatcher };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/addressMatcher.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/converter/addressMatcher.js tests/addressMatcher.test.js
git commit -m "feat: implement address matcher for C06 administrative divisions"
```

---

### Task 4: Excel Exporter Module

**Files:**
- Create: `src/converter/excelExporter.js`
- Create: `tests/excelExporter.test.js`

**Interfaces:**
- Produces: `exportToExcel({ vnGuests, foreignGuests, vnTemplatePath, foreignTemplatePath, outputDir, timestamp }) => Promise<{ vnFilePath, foreignFilePath }>`

- [ ] **Step 1: Write failing test for excelExporter**

Create `tests/excelExporter.test.js`:
```javascript
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { exportToExcel } = require('../src/converter/excelExporter');

test('exportToExcel creates both files preserving template sheets and correct rows', async () => {
  const sampleVnGuests = [
    {
      name: 'NGUYEN VAN A',
      dob: '01/01/1990',
      gender: 'M - Nam',
      nationalityCode: 'VNM - Viet Nam',
      idTypeDisplay: '8 - Thẻ Căn Cước',
      idNumber: '012345678901',
      provinceDisplay: '701 - TP. Hồ Chí Minh',
      wardDisplay: '',
      address: '123 Nguyen Trai, Q1, TP. HCM',
      arrival: '30-08-2026',
      departure: '02-09-2026',
      room: '101'
    }
  ];

  const sampleForeignGuests = [
    {
      name: 'JOHN DOE',
      dob: '15/05/1985',
      gender: 'M - Nam',
      nationalityCode: 'USA - United States of America',
      idNumber: 'A12345678',
      room: '202',
      arrival: '30/08/2026',
      departure: '02/09/2026',
      visaExp: '02/09/2026'
    }
  ];

  const outputDir = 'dist/test-output';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const result = await exportToExcel({
    vnGuests: sampleVnGuests,
    foreignGuests: sampleForeignGuests,
    vnTemplatePath: 'brief/tblt_vn_import.xlsx',
    foreignTemplatePath: 'brief/dklt nc ngoài.xlsx',
    outputDir,
    timestamp: 'test'
  });

  assert.ok(fs.existsSync(result.vnFilePath), 'VN output file must exist');
  assert.ok(fs.existsSync(result.foreignFilePath), 'Foreign output file must exist');

  const wbVn = new ExcelJS.Workbook();
  await wbVn.xlsx.readFile(result.vnFilePath);
  assert.ok(wbVn.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU'), 'VN sheet must exist');
  assert.ok(wbVn.getWorksheet('TINH_THANH'), 'TINH_THANH sheet must be preserved');
  assert.ok(wbVn.getWorksheet('DANH_MUC'), 'DANH_MUC sheet must be preserved');

  const wsVn = wbVn.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU');
  assert.strictEqual(wsVn.getCell('B5').value, 'NGUYEN VAN A');
  assert.strictEqual(wsVn.getCell('E5').value, 'VNM - Viet Nam');
  assert.strictEqual(wsVn.getCell('K5').value, '701 - TP. Hồ Chí Minh');

  const wbFg = new ExcelJS.Workbook();
  await wbFg.xlsx.readFile(result.foreignFilePath);
  assert.ok(wbFg.getWorksheet('KBTT'), 'KBTT sheet must exist');
  assert.ok(wbFg.getWorksheet('Lookup'), 'Lookup sheet must be preserved');

  const wsFg = wbFg.getWorksheet('KBTT');
  assert.strictEqual(wsFg.getCell('B4').value, 'JOHN DOE');
  assert.strictEqual(wsFg.getCell('F4').value, 'USA - United States of America');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/excelExporter.test.js`
Expected: FAIL with "Cannot find module '../src/converter/excelExporter'".

- [ ] **Step 3: Implement excelExporter.js**

Create `src/converter/excelExporter.js`:
```javascript
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function exportToExcel({
  vnGuests,
  foreignGuests,
  vnTemplatePath,
  foreignTemplatePath,
  outputDir,
  timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
}) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const vnFileName = `tblt_vn_import_${timestamp}.xlsx`;
  const foreignFileName = `dklt_nc_ngoai_${timestamp}.xlsx`;
  const vnFilePath = path.join(outputDir, vnFileName);
  const foreignFilePath = path.join(outputDir, foreignFileName);

  // 1. Export Vietnamese Guests
  const wbVn = new ExcelJS.Workbook();
  await wbVn.xlsx.readFile(vnTemplatePath);
  const wsVn = wbVn.getWorksheet('DS_KHACH_VIET_NAM_LUU_TRU');

  while (wsVn.rowCount >= 5) {
    wsVn.spliceRows(5, 1);
  }

  vnGuests.forEach((g, idx) => {
    const rowNum = 5 + idx;
    const row = wsVn.getRow(rowNum);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = g.name;
    row.getCell(3).value = g.dob;
    row.getCell(4).value = g.gender || 'M - Nam';
    row.getCell(5).value = g.nationalityCode || 'VNM - Viet Nam';
    row.getCell(6).value = g.idTypeDisplay || '8 - Thẻ Căn Cước';
    row.getCell(7).value = '';
    row.getCell(8).value = g.idNumber || '';
    row.getCell(9).value = '';
    row.getCell(10).value = '';
    row.getCell(11).value = g.provinceDisplay || '';
    row.getCell(12).value = g.wardDisplay || '';
    row.getCell(13).value = g.address || '';
    row.getCell(14).value = g.arrival || '';
    row.getCell(15).value = g.departure || '';
    row.getCell(16).value = g.room || '';
    row.getCell(17).value = '1 - Du lịch';
    row.getCell(18).value = '';
    row.getCell(19).value = '';
    row.commit();
  });

  await wbVn.xlsx.writeFile(vnFilePath);

  // 2. Export Foreign Guests
  const wbFg = new ExcelJS.Workbook();
  await wbFg.xlsx.readFile(foreignTemplatePath);
  const wsFg = wbFg.getWorksheet('KBTT');

  while (wsFg.rowCount >= 4) {
    wsFg.spliceRows(4, 1);
  }

  foreignGuests.forEach((g, idx) => {
    const rowNum = 4 + idx;
    const row = wsFg.getRow(rowNum);
    row.getCell(1).value = '';
    row.getCell(2).value = g.name;
    row.getCell(3).value = g.dob;
    row.getCell(4).value = 'D - Ngày';
    row.getCell(5).value = g.gender || 'M - Nam';
    row.getCell(6).value = g.nationalityCode || 'CHN - China';
    row.getCell(7).value = g.idNumber || '';
    row.getCell(8).value = g.room || '';
    row.getCell(9).value = g.arrival || '';
    row.getCell(10).value = g.departure || '';
    row.getCell(11).value = g.departure || '';
    row.getCell(12).value = g.visaExp || g.departure || '';
    row.commit();
  });

  await wbFg.xlsx.writeFile(foreignFilePath);

  return { vnFilePath, foreignFilePath, vnFileName, foreignFileName };
}

module.exports = { exportToExcel };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/excelExporter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/converter/excelExporter.js tests/excelExporter.test.js
git commit -m "feat: implement Excel exporter for VN and foreign police templates"
```

---

### Task 5: Pipeline Integration & CLI Interface

**Files:**
- Create: `src/converter/index.js`
- Create: `src/cli.js`
- Create: `tests/pipeline.test.js`

**Interfaces:**
- Produces: `runConversion(xmlPath, options) => Promise<{ vnCount, foreignCount, vnFilePath, foreignFilePath }>`

- [ ] **Step 1: Write failing test for full pipeline**

Create `tests/pipeline.test.js`:
```javascript
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { runConversion } = require('../src/converter/index');

test('runConversion processes brief sample XML and returns output file details', async () => {
  const result = await runConversion('brief/police_report2_75766981.XML', {
    outputDir: 'dist/pipeline-output'
  });

  assert.strictEqual(result.vnCount, 33);
  assert.strictEqual(result.foreignCount, 12);
  assert.ok(fs.existsSync(result.vnFilePath));
  assert.ok(fs.existsSync(result.foreignFilePath));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/pipeline.test.js`
Expected: FAIL with "Cannot find module '../src/converter/index'".

- [ ] **Step 3: Implement index.js and cli.js**

Create `src/converter/index.js`:
```javascript
const fs = require('fs');
const path = require('path');
const { parsePoliceReport } = require('./xmlParser');
const { initAddressMatcher } = require('./addressMatcher');
const { exportToExcel } = require('./excelExporter');

async function runConversion(xmlPath, options = {}) {
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  const baseDir = path.resolve(__dirname, '../../');
  const vnTemplatePath = options.vnTemplatePath || path.join(baseDir, 'brief/tblt_vn_import.xlsx');
  const foreignTemplatePath = options.foreignTemplatePath || path.join(baseDir, 'brief/dklt nc ngoài.xlsx');
  const outputDir = options.outputDir || path.dirname(xmlPath);

  const { vnGuests, foreignGuests } = parsePoliceReport(xmlContent);

  const matcher = await initAddressMatcher(vnTemplatePath);
  for (const g of vnGuests) {
    const { provinceDisplay, wardDisplay } = matcher.matchAddress(g.address);
    g.provinceDisplay = provinceDisplay;
    g.wardDisplay = wardDisplay;
  }

  const exportResult = await exportToExcel({
    vnGuests,
    foreignGuests,
    vnTemplatePath,
    foreignTemplatePath,
    outputDir
  });

  return {
    vnCount: vnGuests.length,
    foreignCount: foreignGuests.length,
    totalCount: vnGuests.length + foreignGuests.length,
    ...exportResult
  };
}

module.exports = { runConversion };
```

Create `src/cli.js`:
```javascript
const path = require('path');
const { runConversion } = require('./converter/index');

async function main() {
  const args = process.argv.slice(2);
  const xmlPath = args[0] || 'brief/police_report2_75766981.XML';

  console.log(`Bắt đầu chuyển đổi: ${xmlPath}`);
  const result = await runConversion(xmlPath);

  console.log('--- KẾT QUẢ CHUYỂN ĐỔI ---');
  console.log(`✅ Khách Việt Nam: ${result.vnCount} -> ${result.vnFilePath}`);
  console.log(`✅ Khách Nước ngoài: ${result.foreignCount} -> ${result.foreignFilePath}`);
  console.log('Hoàn thành xuất sắc!');
}

main().catch(err => {
  console.error('Lỗi khi chuyển đổi:', err.message);
  process.exit(1);
});
```

- [ ] **Step 4: Run test and CLI to verify**

Run: `node --test tests/pipeline.test.js`
Expected: PASS.

Run: `npm run convert -- brief/police_report2_75766981.XML`
Expected: Outputs summary with 32 VN guests and 13 Foreign guests.

- [ ] **Step 5: Commit**

```bash
git add src/converter/index.js src/cli.js tests/pipeline.test.js
git commit -m "feat: implement conversion pipeline and CLI runner"
```

---

### Task 6: Electron Desktop GUI Application

**Files:**
- Create: `src/main/main.js`
- Create: `src/preload/preload.js`
- Create: `src/renderer/index.html`
- Create: `src/renderer/styles.css`
- Create: `src/renderer/app.js`

- [ ] **Step 1: Implement Main Process (`src/main/main.js`)**

Create `src/main/main.js` managing window creation, IPC events (`convert-file`, `open-folder`, `select-file`).

- [ ] **Step 2: Implement Preload Bridge (`src/preload/preload.js`)**

Create `src/preload/preload.js` exposing safe `window.api` via contextBridge.

- [ ] **Step 3: Implement Renderer HTML, CSS & JS**

Create `src/renderer/index.html`, `src/renderer/styles.css`, and `src/renderer/app.js` with modern dropzone UI, error boundary, and open folder button.

- [ ] **Step 4: Commit**

```bash
git add src/main/main.js src/preload/preload.js src/renderer/index.html src/renderer/styles.css src/renderer/app.js
git commit -m "feat: implement Electron GUI with drag-and-drop support"
```

---

### Task 7: End-to-End Build & Validation

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Test conversion via CLI**

Run: `npm run convert -- brief/police_report2_75766981.XML`
Expected: Generates valid Excel files with 32 VN and 13 Foreign guests.

- [ ] **Step 3: Verify output Excel files validity**

Write and run validation test `tests/verifyOutputs.test.js`.

- [ ] **Step 4: Commit and finalize**

```bash
git add tests/verifyOutputs.test.js package.json
git commit -m "test: add end-to-end output validation tests"
```
