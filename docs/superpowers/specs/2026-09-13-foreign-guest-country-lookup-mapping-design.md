# Đặc Tả Kỹ Thuật: Tự Động Chuẩn Hóa Mã Quốc Tịch Khách Nước Ngoài Khớp Danh Mục Sheet 'LookUp'

- **Mã định danh**: SPEC-2026-09-13-COUNTRY-MAP
- **Ngày tạo**: 2026-09-13
- **Trạng thái**: Đã phê duyệt (Approved)
- **Tác giả**: Nora Convert Team

---

## 1. Mục Tiêu & Bối Cảnh

### 1.1. Bối cảnh
Phần mềm **BWP Convert (Nora Convert)** xử lý chuyển đổi dữ liệu lưu trú từ phần mềm khách sạn Opera PMS (file XML) xuất sang 2 biểu mẫu Excel:
1. `tblt_vn_import_*.xlsx` (Cổng Dịch vụ công C06 Bộ Công an - dành cho công dân Việt Nam).
2. `dklt_nc_ngoai_*.xlsx` (Mẫu khai báo tạm trú Cục Quản lý xuất nhập cảnh - dành cho khách nước ngoài).

Trong biểu mẫu mẫu chuẩn `brief/dklt nc ngoài.xlsx`, sheet đầu tiên có tên là **`Lookup`** chứa danh mục chuẩn gồm **205 quốc gia** (Cột A, dòng 1 đến 205), được định dạng theo cấu trúc:
`<MÃ_QUỐC_GIA> - <TÊN_QUỐC_GIA>`
Ví dụ:
- `TWN - Taiwan`
- `USA - United States of America`
- `KOR - Korea (South)`
- `CHN - China`
- `THA - Thailand`
- `NGA - Nigeria`
- `D - Germany` (Mã đặc thù của Cục Quản lý XNK)
- `SC- - Scotland` (Mã đặc thù)
- `GBR - United Kingdom of Great Britain and Northern Ireland`
- `VNM - Viet Nam`

### 1.2. Vấn đề thực tế phát hiện
1. **Dữ liệu xuất chưa được chuẩn hóa toàn diện**:
   - File kết quả `brief/dklt_nc_ngoai_20260913074930.xlsx` cho thấy các khách mang quốc tịch Đài Loan vẫn giữ mã thô `TW` (dòng 5–22) thay vì `TWN - Taiwan`.
   - Khách có tên `ACHIKE DOMINIQUE CHUKWUDI` (dòng 4) mang mã quốc tịch `NI` chưa được chuyển đổi.
2. **Nguyên nhân**:
   - Module `src/converter/xmlParser.js` hiện tại chỉ chứa bảng tra tĩnh `COUNTRY_LOOKUP_MAP` gồm 6 quốc gia cơ bản (`CN`, `KR`, `TH`, `US`, `JP`, `VN`). Bất kỳ quốc gia nào ngoài 6 mã này đều bị trả về mã thô ban đầu.
3. **Phạm vi áp dụng (Scope Boundary)**:
   - **Chỉ áp dụng cho biểu mẫu khách nước ngoài (`dklt nc ngoài.xlsx` / `dklt_nc_ngoai_*.xlsx`)**, ghi vào Cột 6 (`MÃ QUỐC TỊCH`) của Sheet `KBTT`.
   - **Tuyệt đối không thay đổi logic xuất của biểu mẫu khách Việt Nam (`tblt_vn_import_*.xlsx`)**. Biểu mẫu Việt Nam bảo toàn quy chuẩn C06 hiện tại (`VNM - Viet Nam`).

---

## 2. Thiết Kế Kiến Trúc & Giải Pháp Kỹ Thuật

### 2.1. Module Quản Lý Danh Mục Quốc Tịch (`src/converter/countryMap.js`)
Tách riêng module `src/converter/countryMap.js` tương tự như thiết kế kiến trúc của `provinceMap.js` và `administrativeMapping.js`:

1. **Danh mục chuẩn 205 quốc gia (`LOOKUP_COUNTRY_LIST`)**:
   - Chứa đầy đủ 205 bản ghi tương ứng 100% với danh mục Sheet `Lookup` trong biểu mẫu mẫu `brief/dklt nc ngoài.xlsx`.
   - Mỗi bản ghi có cấu trúc: `{ code, name, display }`.
     - `display`: Chuỗi hiển thị chuẩn xác (ví dụ: `'TWN - Taiwan'`, `'D - Germany'`).
2. **Chỉ mục tra cứu ngược nhanh $O(1)$ (`COUNTRY_INDEX`)**:
   Khởi tạo một `Map` tra cứu không phân biệt hoa thường, hỗ trợ:
   - **Mã hiển thị chuẩn**: Khớp trực tiếp nếu dữ liệu đã chuẩn (ví dụ: `TWN - TAIWAN` -> `TWN - Taiwan`).
   - **Mã ISO 3166-1 alpha-2 (2 chữ cái)**:
     - `TW` -> `TWN - Taiwan`
     - `US` -> `USA - United States of America`
     - `KR` -> `KOR - Korea (South)`
     - `CN` -> `CHN - China`
     - `JP` -> `JPN - Japan`
     - `TH` -> `THA - Thailand`
     - `DE` -> `D - Germany`
     - `GB` -> `GBR - United Kingdom of Great Britain and Northern Ireland`
     - `FR`, `AU`, `CA`, `IT`, `ES`, `SG`, `MY`, `ID`, `PH`, `IN`, `RU`... (toàn bộ 205 quốc gia).
   - **Mã ISO 3166-1 alpha-3 (3 chữ cái)**:
     - `TWN` -> `TWN - Taiwan`, `USA`, `KOR`, `JPN`, `CHN`, `THA`, `DEU` -> `D - Germany`...
   - **Tên tiếng Anh quốc gia**:
     - `TAIWAN` -> `TWN - Taiwan`
     - `GERMANY` -> `D - Germany`
     - `UNITED STATES` -> `USA - United States of America`
     - `SOUTH KOREA` / `KOREA` -> `KOR - Korea (South)`
   - **Biệt danh PMS khách sạn & Trường hợp đặc thù**:
     - `NI` -> `NGA - Nigeria` (Khớp ngữ cảnh khách sạn & tên khách Nigeria)
     - `NG` -> `NGA - Nigeria`
     - `UK` -> `GBR - United Kingdom of Great Britain and Northern Ireland`
     - `ENGLAND` / `GREAT BRITAIN` -> `GBR - United Kingdom of Great Britain and Northern Ireland`
     - `SCOTLAND` -> `SC- - Scotland`
     - `D` -> `D - Germany`
     - `HK` / `HKG` / `HONG KONG` -> `CHN - China` (Hồng Kông báo cáo theo diện Trung Quốc trên biểu mẫu Cục XNK)
     - `MO` / `MAC` / `MACAU` / `MACAO` -> `CHN - China`
     - `RUSSIA` / `RUSSIAN FEDERATION` -> `RUS - Russia`
     - `NORTH KOREA` -> `PRK - Korea Democratic Peoples Republic of`
     - `LAOS` -> `LAO - Lao Peoples Democratic Republic`
     - `BRUNEI` -> `BRN - Bruney`
     - `HOLLAND` / `NETHERLANDS` -> `NLD - Netherland`
     - `CZECHIA` -> `CZE - Czech Republic`
     - `UAE` -> `ARE - United Arab Emirates`

### 2.2. Hàm Chuẩn Hóa Quốc Tịch (`normalizeForeignCountry`)
```javascript
function normalizeForeignCountry(rawInput) {
  if (!rawInput) return '';
  const cleaned = String(rawInput).trim().toUpperCase();

  // 1. Tra cứu trực tiếp trong Index O(1)
  if (COUNTRY_INDEX.has(cleaned)) {
    return COUNTRY_INDEX.get(cleaned);
  }

  // 2. Làm sạch dấu câu / khoảng trắng đặc biệt (ví dụ: "Korea, Republic of")
  const simplified = cleaned.replace(/[,\.\(\)\-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (COUNTRY_INDEX.has(simplified)) {
    return COUNTRY_INDEX.get(simplified);
  }

  // 3. Fallback an toàn: Trả về chuỗi gốc đã trim nếu chưa có trong danh mục
  return String(rawInput).trim();
}
```

---

## 3. Tích Hợp Vào Quy Trình Chuyển Đổi

### 3.1. Xuất file Excel Khách Nước Ngoài (`src/converter/excelExporter.js`)
Trong vòng lặp ghi dữ liệu khách nước ngoài (`foreignGuests.forEach`, dòng 100-125):
- Cột 6 (`MÃ QUỐC TỊCH`):
  ```javascript
  const rawNat = g.nationalityCode || g.nationality || '';
  row.getCell(6).value = normalizeForeignCountry(rawNat) || 'CHN - China';
  ```

### 3.2. Bảo Vệ File Excel Khách Việt Nam (`tblt_vn_import_*.xlsx`)
- Tuyệt đối không gọi `normalizeForeignCountry` trong luồng ghi khách Việt Nam (`vnGuests.forEach`).
- Giữ nguyên cấu trúc:
  ```javascript
  row.getCell(5).value = g.nationalityCode || 'VNM - Viet Nam';
  ```

### 3.3. Tối Ưu Hóa Parser (`src/converter/xmlParser.js`)
- Tái sử dụng `normalizeForeignCountry` khi gán mã quốc tịch cho khách nước ngoài trong hàm `parsePoliceReport`.

---

## 4. Kế Hoạch Kiểm Thử & Xác Minh (Verification Plan)

### 4.1. Bộ Kiểm Thử Tự Động Mới (`tests/countryMap.test.js`)
1. **Kiểm tra Đồng bộ với Biểu mẫu Excel Mẫu (Template Parity)**:
   - Dùng `ExcelJS` đọc sheet `Lookup` của `brief/dklt nc ngoài.xlsx`.
   - Đối chiếu 205 dòng ở Cột A với `LOOKUP_COUNTRY_LIST` trong mã nguồn. Xác nhận độ khớp 100%.
2. **Kiểm tra Độ chính xác Mã ISO & Alias**:
   - `TW` -> `TWN - Taiwan`
   - `NI` -> `NGA - Nigeria`
   - `US` -> `USA - United States of America`
   - `DE` / `D` / `DEU` -> `D - Germany`
   - `UK` / `GB` / `ENGLAND` -> `GBR - United Kingdom of Great Britain and Northern Ireland`
   - `HK` / `HONG KONG` -> `CHN - China`
   - `KR` / `SOUTH KOREA` -> `KOR - Korea (South)`
   - `JP` -> `JPN - Japan`
   - `TH` -> `THA - Thailand`
3. **Kiểm tra Tính Phòng thủ & Fallback**:
   - Giá trị rỗng, `null`, `undefined`.
   - Chuỗi có khoảng trắng thừa, chữ hoa/chữ thường.
   - Chuỗi không tồn tại trong từ điển (trả về chuỗi gốc an toàn).
4. **Kiểm tra Xuất File Cuối Cùng (End-to-End Export)**:
   - Chạy hàm xuất Excel với danh sách khách chứa `TW` và `NI`.
   - Xác nhận file `dklt_nc_ngoai_*.xlsx` có Cột 6 tương ứng là `TWN - Taiwan` và `NGA - Nigeria`.
   - Xác nhận file `tblt_vn_import_*.xlsx` không bị ảnh hưởng.

### 4.2. Kiểm Thử Hồi Quy (Regression Testing)
- Chạy toàn bộ 42 bài kiểm thử hiện có bằng lệnh:
  ```powershell
  pnpm test
  ```
- Đảm bảo toàn bộ 42 bài kiểm thử cũ cùng các bài kiểm thử mới đều đạt kết quả PASS (100%).
