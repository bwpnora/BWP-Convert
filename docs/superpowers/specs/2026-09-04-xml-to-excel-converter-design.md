# Design Spec: Opera PMS XML to Excel Converter (nora-convert)

**Date**: 2026-09-04  
**Status**: Validated & Approved  
**Author**: Nora & Antigravity  

---

## 1. Overview & Business Context

In the Vietnamese hospitality industry, accommodation establishments must report guest stay information to two government portals:
1. **C06 Public Services Portal (Báo cáo lưu trú khách Việt Nam)**: Requires batch import using an Excel template (`tblt_vn_import.xlsx`), populating the `DS_KHACH_VIET_NAM_LUU_TRU` sheet along with standard lookup codes defined in sheets `DANH_MUC`, `TINH_THANH`, and `PHUONG_XA`.
2. **Immigration Department Portal (Khai báo tạm trú người nước ngoài - QLXNC)**: Requires batch import using an Excel template (`dklt nc ngoài.xlsx`), populating the `KBTT` sheet with normalized 3-character country codes and formats defined in sheet `Lookup`.

Hotel Property Management Systems (specifically **Opera PMS / Oracle Reports**) export daily police reports in XML format (`police_report2_*.xml`). Manually keying or copying data into both spreadsheets is time-consuming, prone to human error, and fails validation if codes do not match the official schemas.

**Goal**: Build a lightweight, fluid Windows Desktop application (`nora-convert`) that allows users to drag & drop a PMS XML report file, click "Convert", and immediately produce two fully formatted, validated Excel files ready for direct portal upload.

---

## 2. Technology Stack & Architecture

- **Runtime Environment**: Node.js (v25+) & Electron (Desktop GUI).
- **Core Libraries**:
  - `fast-xml-parser`: High-performance, zero-native-dependency XML parsing.
  - `exceljs`: Robust Excel read/write library preserving existing template sheets, cell styles, fonts, named ranges, and data validations.
- **Packaging**: `electron-builder` to generate a standalone Windows x64 executable (`nora-convert.exe`).

### Module Breakdown

```
c:\Code\nora-convert\
├── brief/                           # Template and sample files
│   ├── police_report2_75766981.XML  # Source sample XML
│   ├── tblt_vn_import.xlsx          # Vietnamese guest template
│   └── dklt nc ngoài.xlsx          # Foreign guest template
├── src/
│   ├── main/
│   │   └── main.js                  # Electron main process (lifecycle, IPC, window)
│   ├── preload/
│   │   └── preload.js               # Secure IPC contextBridge
│   ├── renderer/
│   │   ├── index.html               # Clean, modern drag & drop UI
│   │   ├── styles.css               # Lightweight, sleek styling
│   │   └── app.js                   # UI event handling & IPC invocation
│   └── converter/
│       ├── xmlParser.js             # Parses XML into standardized Guest objects
│       ├── addressMatcher.js        # Matches raw address against TINH_THANH / PHUONG_XA
│       ├── excelExporter.js         # Clones templates & populates data rows
│       └── index.js                 # High-level pipeline coordinator
├── package.json
└── docs/superpowers/specs/
    └── 2026-09-04-xml-to-excel-converter-design.md
```

---

## 3. Data Processing & Mapping Specifications

### 3.1 XML Parsing (`xmlParser.js`)
- Root: `<POLICE_REPORT2>`
- Hierarchy: `<LIST_G_NATIONALITY>` -> `<G_NATIONALITY>` -> `<LIST_G_FIRST>` -> `<G_FIRST>`
- Extract fields per guest:
  - `name`: `<NAME_FORMULA>` (or `<FIRST>` + `<LAST>`)
  - `room`: `<ROOM>`
  - `arrival`: `<TO_CHAR_RGV_TRUNC_ARRIVAL_PMS_>` (format `DD-MM-YY`)
  - `departure`: `<TO_CHAR_RGV_TRUNC_DEPARTURE_PM>` (format `DD-MM-YY`)
  - `dob`: `<BIRTH_DATE>`
  - `gender`: `<GENDER>` (`M` / `F`)
  - `nationality`: `<NATIONALITY>`, `<NATIONALITY_NAME>`, `<COUNTRY_DESCRIPTION>`, `<GUEST_COUNTRY>`
  - `id_type`: `<LIST_Q_ID> -> <Q_ID> -> <ID_TYPE>`
  - `id_number`: `<LIST_Q_ID> -> <Q_ID> -> <ID_NUMBER>`
  - `address`: `<ADDRESS1>`, `<CITY>`
  - `visa_number`: `<VISA_NUMBER>`
  - `visa_exp`: `<VISA_EXPIRATION_DATE>`
  - `resv_status`: `<RESV_STATUS>` (`CKIN`, `RS`)

### 3.2 Guest Classification (Routing)
- All records in XML (`CKIN` and `RS`) are included as requested.
- **Vietnamese Guest Route** -> `tblt_vn_import.xlsx`:
  - If `<NATIONALITY>` or `<GUEST_COUNTRY>` in `['VN', 'VNM']` or `<COUNTRY_DESCRIPTION>` == `'Vietnam'`.
  - OR if `<NATIONALITY>` is `'Unknown'` / empty AND (`<ID_TYPE>` is `'ID'` or `<LIST_Q_ID>` is empty).
- **Foreign Guest Route** -> `dklt nc ngoài.xlsx`:
  - All other guests (explicit non-VN nationality, or `<ID_TYPE>` == `'PASSPORT'`).

### 3.3 Target File 1: Vietnamese Guests (`tblt_vn_import.xlsx`)
- Target Sheet: `DS_KHACH_VIET_NAM_LUU_TRU`
- Retain Rows 1 to 4 intact (Title, Headers, Format Descriptions, and Example Row).
- Purge any existing data rows from Row 5 onward.
- Populate data from Row 5:
  1. `STT`: Auto-increment integer starting at 1.
  2. `HỌ TÊN (*)`: Full name in UPPERCASE, commas removed, normalized word order (e.g. `NAM THANH PHAM` or `TRAN KHAC MY HANG`).
  3. `NGÀY SINH (*)`: Formatted `dd/MM/yyyy`. If masked (`XX/XX/XX`) or missing, preserve available characters or leave blank.
  4. `GIỚI TÍNH (*)`: Mapped from `<GENDER>`: `M` -> `M - Nam`, `F` -> `F - Nữ`.
  5. `QUỐC TỊCH (*)`: Constant `VNM - Viet Nam` (from sheet `DANH_MUC`).
  6. `LOẠI GIẤY TỜ (*)`: If `<ID_TYPE>` is `'PASSPORT'` -> `4 - Hộ chiếu`; otherwise default to `8 - Thẻ Căn Cước` (from sheet `DANH_MUC`).
  7. `TÊN GIẤY TỜ`: Blank.
  8. `SỐ GIẤY TỜ (*)`: Value of `<ID_NUMBER>`.
  9. `SỐ ĐIỆN THOẠI`: Blank.
  10. `NƠI CƯ TRÚ HIỆN NAY`: Blank.
  11. `TỈNH/ THÀNH PHỐ`: Auto-matched against sheet `TINH_THANH` display string (e.g. `701 - TP. Hồ Chí Minh`); blank if no match.
  12. `PHƯỜNG/ XÃ/ ĐẶC KHU`: Auto-matched against sheet `PHUONG_XA` display string if matched; blank otherwise.
  13. `ĐỊA CHỈ CHI TIẾT`: Concatenation of `<ADDRESS1>` and `<CITY>`.
  14. `NGÀY ĐẾN (*)`: Normalized `dd-MM-yyyy` (e.g. `30-08-2026`).
  15. `NGÀY ĐI DỰ KIẾN (*)`: Normalized `dd-MM-yyyy` (e.g. `02-09-2026`).
  16. `SỐ PHÒNG/ KHOA`: Value of `<ROOM>`.
  17. `LÝ DO CƯ TRÚ (*)`: Default `1 - Du lịch` (from sheet `DANH_MUC`).
  18. `NHẬP LÝ DO`: Blank.
  19. `GHI CHÚ`: Blank.
- Retain intact all other sheets: `TINH_THANH`, `PHUONG_XA`, `DANH_MUC`.

### 3.4 Target File 2: Foreign Guests (`dklt nc ngoài.xlsx`)
- Target Sheet: `KBTT`
- Retain Rows 1 to 3 intact (Title, Headers, and Example Row).
- Purge any existing data rows from Row 4 onward.
- Populate data from Row 4:
  1. `STT`: Blank (matches standard format in rows 4-9 of template).
  2. `HỌ TÊN`: Full name in UPPERCASE, commas removed.
  3. `NGÀY SINH`: Formatted `dd/MM/yyyy`.
  4. `NGÀY SINH ĐÚNG ĐẾN`: Default `D - Ngày` (from sheet `Lookup`).
  5. `GIỚI TÍNH`: Mapped from `<GENDER>`: `M` -> `M - Nam`, `F` -> `F - Nữ` (from sheet `Lookup`).
  6. `MÃ QUỐC TỊCH`: Normalized from 2-letter code to sheet `Lookup` entry (e.g. `CN` -> `CHN - China`, `KR` -> `KOR - Korea (South)`, `TH` -> `THA - Thailand`, `US` -> `USA - United States of America`).
  7. `SỐ HỘ CHIẾU`: Value of `<ID_NUMBER>`.
  8. `SỐ PHÒNG`: Value of `<ROOM>`.
  9. `NGÀY ĐẾN`: Formatted `dd/MM/yyyy` (e.g. `30/08/2026`).
  10. `THỜI GIAN DỰ KIẾN TẠM TRÚ TẠI CSLT`: Departure date `dd/MM/yyyy`.
  11. `NGÀY TRẢ PHÒNG`: Departure date `dd/MM/yyyy`.
  12. `THỜI HẠN ĐƯỢC PHÉP TẠM TRÚ TẠI VIỆT NAM`: Value of `<VISA_EXPIRATION_DATE>`; if empty, defaults to departure date.
- Retain intact sheet `Lookup`.

---

## 4. Address Matching Engine (`addressMatcher.js`)

- Loads `TINH_THANH` (35 provinces) and `PHUONG_XA` (3,324 units) into an in-memory normalized hash map on initialization.
- Normalization: strip accents / lowercase / remove common prefixes (`TP.`, `Tỉnh`, `Thành phố`, `Quận`, `Huyện`, `Thị xã`, `Phường`, `Xã`).
- Traversal: Matches the address string from right to left (province first, then ward).
- Fallback: If no confident match is found, columns 11 and 12 are left blank while preserving the full address in column 13 (`ĐỊA CHỈ CHI TIẾT`), fully conforming to portal requirements.

---

## 5. UI Design & User Experience

- **Window Dimensions**: 700 x 520 px, centered, clean modern card layout.
- **States**:
  1. *Idle / Ready*: Dropzone with dashed border: *"Kéo thả file .xml vào đây hoặc click để chọn file"*.
  2. *File Selected*: Displays filename, size, and primary button *"Bắt đầu chuyển đổi"*.
  3. *Processing*: Progress spinner / bar (*"Đang xử lý dữ liệu..."*).
  4. *Complete*: Green status summary showing:
     - Khách Việt Nam: `X` khách -> `tblt_vn_import.xlsx`
     - Khách Nước ngoài: `Y` khách -> `dklt nc ngoài.xlsx`
     - Action buttons: *"Mở thư mục chứa file"* (reveals in Windows Explorer) and *"Chuyển đổi file khác"*.
  5. *Error*: Clear message banner with resolution guidance.

---

## 6. Verification & Testing Strategy

1. **Unit & Integration Tests**:
   - `test/parser.test.js`: Verify parsing of `police_report2_75766981.XML` yields 45 total guests (32 VN, 13 Foreign).
   - `test/addressMatcher.test.js`: Test matching for various Vietnamese address formats.
   - `test/exporter.test.js`: Verify exported `.xlsx` files preserve template structure, formulas, dropdowns, and contain expected row counts and cell values.
2. **Automated Verification CLI**:
   - CLI script `npm run convert -- <path-to-xml>` to test conversion end-to-end without launching GUI.
3. **End-to-End GUI Test**:
   - Launch Electron app via `npm start`, test drag-and-drop flow, verify output files open cleanly in Excel without repair warnings.
