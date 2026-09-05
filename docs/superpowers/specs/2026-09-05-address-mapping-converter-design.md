# Design Spec: Automated Vietnam Address Mapping & Dual-Address Converter (63 -> 34 Provinces)

## 1. Overview & Context

In Vietnam's administrative reorganization, the standard residence registration template (`tblt_vn_import.xlsx`) for hotel guests uses a consolidated model of **34 provinces/cities** (Sheet `TINH_THANH`) and **3,324 wards/communes/special zones** (Sheet `PHUONG_XA`), instead of the former 63 provinces.

Additionally, guests' profile addresses stored in hotel PMS systems (such as Oracle Opera PMS) are often recorded in old formats (e.g. including former provinces like *Bà Rịa - Vũng Tàu*, *Bình Dương*, *Hải Dương*, *Nam Định*, *Hà Nam*, *Bắc Giang*, or former districts like *Quận 1*, *Quận Tân Bình*, *Huyện Củ Chi*, *Huyện Gia Lâm*).

This design provides an automated, offline, deterministic address mapping and conversion engine that:
1. Translates historical/current free-text addresses into the new 34 provinces and 3,324 wards standard.
2. Extracts clean detailed house/street information into **Column 13 (ĐỊA CHỈ CHI TIẾT)**.
3. Preserves the full original historical address in **Column 19 (GHI CHÚ)** for 100% auditability and cross-checking without breaking the 19-column police submission format.

---

## 2. Requirements & Constraints

### 2.1 Excel Template Compatibility
- **Preserve Strict 19 Columns**: The exported Excel file (`tblt_vn_import_YYYYMMDDHHmmss.xlsx`) must retain exactly the 19 standard columns in `DS_KHACH_VIET_NAM_LUU_TRU` to ensure seamless upload to Public Security software without column-shift errors:
  - **Column 11 (`TỈNH/ THÀNH PHỐ`)**: Dropdown code matching `TINH_THANH` (e.g., `701 - TP. Hồ Chí Minh`, `101 - TP. Hà Nội`).
  - **Column 12 (`PHƯỜNG/ XÃ/ ĐẶC KHU`)**: Dropdown code matching `PHUONG_XA` under that province (e.g., `701926542 - Phường Phước Thắng`, `101900565 - Xã Gia Lâm`). If no ward is identified with high confidence, leave blank so staff can select manually.
  - **Column 13 (`ĐỊA CHỈ CHI TIẾT`)**: Cleaned house number, street name, and hamlet (with province and ward names excised).
  - **Column 19 (`GHI CHÚ`)**: Complete original address string extracted from Opera PMS (`ADDRESS1` + `CITY`).

### 2.2 Security & Performance
- **100% Offline**: No PII (guest name, ID, address) transmitted over internet APIs.
- **Fast Execution**: In-memory parsing executing in `< 50ms` for hundreds of guests.

---

## 3. Administrative Mapping Architecture

### 3.1 63-to-34 Province Consolidation Table
An indexed dictionary maps all historical 63 provinces (with accents, unaccented, abbreviations, and major affiliated towns/cities) to the target 34 provinces:

| Target Province (34) | Consolidated Former Provinces / Cities / Major Towns |
| :--- | :--- |
| **701 - TP. Hồ Chí Minh** | Bà Rịa - Vũng Tàu (*Bà Rịa, Vũng Tàu, Phú Mỹ, Long Điền, Côn Đảo*), Bình Dương (*Thủ Dầu Một, Dĩ An, Thuận An, Bến Cát, Tân Uyên, Dầu Tiếng*), TP. Hồ Chí Minh (*Sài Gòn, HCMC*) |
| **101 - TP. Hà Nội** | TP. Hà Nội (*Hà Nội, HN, Hà Tây cũ*) |
| **103 - TP. Hải Phòng** | TP. Hải Phòng, Hải Dương (*Chí Linh*) |
| **109 - Hưng Yên** | Hưng Yên, Thái Bình |
| **117 - Ninh Bình** | Ninh Bình, Nam Định, Hà Nam (*Phủ Lý*) |
| **203 - Cao Bằng** | Cao Bằng |
| **205 - Lào Cai** | Lào Cai, Yên Bái |
| **209 - Lạng Sơn** | Lạng Sơn |
| **211 - Tuyên Quang** | Tuyên Quang, Hà Giang |
| **215 - Thái Nguyên** | Thái Nguyên, Bắc Kạn |
| **217 - Phú Thọ** | Phú Thọ, Vĩnh Phúc (*Vĩnh Yên, Phúc Yên*), Hòa Bình |
| **223 - Bắc Ninh** | Bắc Ninh, Bắc Giang |
| **225 - Quảng Ninh** | Quảng Ninh (*Hạ Long, Cẩm Phả, Uông Bí, Móng Cái*) |
| **301 - Lai Châu** | Lai Châu |
| **302 - Điện Biên** | Điện Biên (*Điện Biên Phủ*) |
| **303 - Sơn La** | Sơn La |
| **401 - Thanh Hóa** | Thanh Hóa (*Sầm Sơn, Bỉm Sơn*) |
| **403 - Nghệ An** | Nghệ An (*Vinh, Cửa Lò, Thái Hòa*) |
| **405 - Hà Tĩnh** | Hà Tĩnh (*Hồng Lĩnh, Kỳ Anh*) |
| **409 - Quảng Trị** | Quảng Trị (*Đông Hà*), Quảng Bình (*Đồng Hới*) |
| **411 - TP. Huế** | Thừa Thiên Huế, TP. Huế |
| **501 - TP. Đà Nẵng** | TP. Đà Nẵng |
| **505 - Quảng Ngãi** | Quảng Ngãi, Kon Tum |
| **511 - Khánh Hòa** | Khánh Hòa (*Nha Trang, Cam Ranh*), Ninh Thuận (*Phan Rang*) |
| **603 - Gia Lai** | Gia Lai (*Pleiku*) |
| **605 - Đắk Lắk** | Đắk Lắk (*Buôn Ma Thuột*), Đắk Nông (*Gia Nghĩa*), Phú Yên (*Tuy Hòa*) |
| **703 - Lâm Đồng** | Lâm Đồng (*Đà Lạt, Bảo Lộc*), Bình Thuận (*Phan Thiết, La Gi*) |
| **709 - Tây Ninh** | Tây Ninh, Long An (*Tân An*) |
| **713 - Đồng Nai** | Đồng Nai (*Biên Hòa, Long Khánh*), Bình Phước (*Đồng Xoài*) |
| **803 - Đồng Tháp** | Đồng Tháp (*Cao Lãnh, Sa Đéc, Hồng Ngự*) |
| **805 - An Giang** | An Giang (*Long Xuyên, Châu Đốc*) |
| **809 - Vĩnh Long** | Vĩnh Long, Tiền Giang (*Mỹ Tho*), Bến Tre, Trà Vinh |
| **815 - TP. Cần Thơ** | TP. Cần Thơ, Hậu Giang (*Vị Thanh, Ngã Bảy*), Sóc Trăng |
| **823 - Cà Mau** | Cà Mau, Bạc Liêu, Kiên Giang (*Rạch Giá, Phú Quốc, Hà Tiên*) |

### 3.2 District & Commune Hierarchy
- Former district names converted into wards/communes in the 3,324 dataset are explicitly indexed (e.g. `Xã Gia Lâm`, `Xã Củ Chi`, `Xã Hóc Môn`, `Phường Tân Bình`, `Phường Bình Thạnh`, `Phường Gò Vấp`, `Phường Phú Nhuận`, `Phường Dĩ An`, `Phường Thủ Dầu Một`, `Phường Bà Rịa`, `Phường Vũng Tàu`).
- Distinctive wards are matched to resolve ambiguous or omitted province information.

---

## 4. Parsing & Extraction Algorithm

### Step 1: Text Normalization
- Given raw address $A_{raw}$, produce normalized token string $A_{norm}$ (lowercase, decomposed accents stripped, normalized whitespace).
- Keep word boundary tracking to identify substring replacement ranges inside $A_{raw}$.

### Step 2: Province Resolution (Top-Down)
- Scan $A_{norm}$ against `VIETNAM_PROVINCE_MAPPING` sorted by key length descending.
- Upon matching, determine `targetMatt` (e.g. `701`) and `provinceDisplay` (e.g. `701 - TP. Hồ Chí Minh`). Record the slice range $R_{prov}$.

### Step 3: Ward / Commune Resolution
- If province is identified: scan exclusively within the wards of `targetMatt`:
  1. Exact ward match (e.g., `Phường Long Hương`, `Xã Gia Lâm`).
  2. Base ward match without prefix (e.g. `Long Hương`, `Gia Lâm`), respecting word boundaries to prevent false positives on short words.
- If province is NOT yet identified (Reverse Lookup):
  - Scan across unique distinctive ward names in all 34 provinces. If found, deduce both ward and its parent province.
- If no ward is identified: set `wardDisplay = ''`.

### Step 4: Extraction of Detailed Address (Column 13)
- Remove matched province slice $R_{prov}$ and ward slice $R_{ward}$ from $A_{raw}$.
- Strip common trailing administrative keywords if left behind (e.g. `TP.HCM`, `Quận 1`, `Tỉnh ...`).
- Trim leading/trailing punctuation (`,`, `-`, `.`) and redundant spaces.
- If the remaining string is non-empty, use it as `addressDetail`. If empty (e.g. the input was only a province name), fall back to $A_{raw}$.

### Step 5: Column 19 (GHI CHÚ) Preservation
- Populate Column 19 with $A_{raw}$ untouched.

---

## 5. Component Changes

### 5.1 `src/converter/addressMatcher.js`
- Expand province dictionary to full 63-to-34 province matrix and alias dictionary.
- Improve ward matching with word-boundary awareness and reverse lookup.
- Add `extractDetailedAddress(rawAddress, matchedProvince, matchedWard)`.
- Return `{ provinceDisplay, wardDisplay, addressDetail, rawAddress }`.

### 5.2 `src/converter/excelExporter.js`
- Write:
  - Column 11: `g.provinceDisplay || ''`
  - Column 12: `g.wardDisplay || ''`
  - Column 13: `g.addressDetail || g.address || ''`
  - Column 19: `g.rawAddress || g.address || ''`

### 5.3 `src/converter/index.js`
- Pass both `addressDetail` and `rawAddress` into `exportToExcel`.
- Collect conversion metrics for province and ward match counts.

---

## 6. Verification Plan

### 6.1 Unit Tests (`tests/addressMatcher.test.js`)
- Test all consolidation clusters:
  - Bà Rịa - Vũng Tàu / Bình Dương $\rightarrow$ TP. Hồ Chí Minh (`701`).
  - Hải Dương $\rightarrow$ Hải Phòng (`103`).
  - Nam Định, Hà Nam $\rightarrow$ Ninh Bình (`117`).
  - Thái Bình $\rightarrow$ Hưng Yên (`109`).
  - Vĩnh Phúc, Hòa Bình $\rightarrow$ Phú Thọ (`217`).
- Test detailed address extraction:
  - `2549D CMT8, Phuoc Trung, TP Ba Ria` $\rightarrow$ Detail: `2549D CMT8`, Province: `701 - TP. Hồ Chí Minh`.
  - `Ngõ 3/6A, Xã Gia Lâm, TP. Hà Nội` $\rightarrow$ Detail: `Ngõ 3/6A`, Province: `101 - TP. Hà Nội`, Ward: `101900565 - Xã Gia Lâm`.
  - `defaultaddress .` $\rightarrow$ Province: `''`, Ward: `''`, Detail: `defaultaddress .`.

### 6.2 Integration Tests (`tests/excelExporter.test.js`, `tests/pipeline.test.js`)
- Verify exported file has valid strings in Columns 11, 12, 13, and 19.
- Ensure AutoFilter and styles are intact and file opens cleanly in Excel.
