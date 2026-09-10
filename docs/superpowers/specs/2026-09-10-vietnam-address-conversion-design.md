# Đặc Tả Kỹ Thuật: Chuẩn Hóa Chuyển Đổi Địa Chỉ Cũ - Mới (63 -> 34 Tỉnh Thành) & Khắc Phục Lỗi Kéo - Thả File

- **Mã định danh**: SPEC-2026-09-10-ADDR-CONV
- **Ngày tạo**: 2026-09-10
- **Trạng thái**: Đã phê duyệt (Approved)
- **Tác giả**: Nora Convert Team

---

## 1. Mục tiêu & Bối cảnh

### 1.1. Bối cảnh
Phần mềm **BWP Convert (Nora Convert)** chuyển đổi dữ liệu lưu trú từ phần mềm khách sạn Opera PMS (định dạng XML) sang mẫu Excel báo cáo Công an:
- `tblt_vn_import.xlsx` (Danh sách thông báo lưu trú công dân Việt Nam).
- `dklt nc ngoài.xlsx` (Khai báo tạm trú người nước ngoài).

### 1.2. Vấn đề cần giải quyết
1. **Thay đổi địa giới hành chính Việt Nam**:
   - Hệ thống Công an sử dụng mô hình hành chính mới: **34 Tỉnh/Thành phố** (Sheet `TINH_THANH`) và **3.324 Phường/Xã/Đặc khu sáp nhập** (Sheet `PHUONG_XA`).
   - Dữ liệu XML từ Opera PMS chứa địa chỉ theo chuẩn hành chính cũ (63 tỉnh/thành, các quận/huyện cũ như Q1, Q5, Tân Bình, Bình Dương, Tiền Giang; các phường cũ bị sáp nhập như Nguyễn Thái Bình, Phạm Ngũ Lão, Hàng Bông...).
   - Hiện tại, một số địa chỉ phường cũ hoặc chỉ có quận bị để trống cột Phường/Xã mới hoặc nhận diện sai.
2. **Yêu cầu đối chiếu 2 cột Địa chỉ Cũ và Mới**:
   - Cần thể hiện rõ ràng Địa chỉ Cũ (nguyên bản từ PMS) và Địa chỉ Mới (sau khi chuẩn hóa hành chính) để tiện đối soát mà không làm hỏng cấu trúc 19 cột cố định của mẫu Excel Công an.
3. **Lỗi Kéo - Thả (Drag & Drop) tệp XML**:
   - Trên phiên bản Electron 34+, Chromium không còn cấp quyền đọc trực tiếp thuộc tính `file.path` trên sự kiện drop, gây ra lỗi: *"Không thể lấy đường dẫn tệp trên hệ thống. Vui lòng sử dụng nút 'Chọn file từ máy tính'"*.

---

## 2. Thiết kế Kiến trúc & Giải pháp Kỹ thuật

### 2.1. Module Ánh xạ Hành chính (`src/converter/administrativeMapping.js`)
Tách riêng dữ liệu từ điển ánh xạ để quản lý tập trung và dễ mở rộng:
- **63 Tỉnh/Thành cũ -> 34 Tỉnh/Thành mới**:
  - Bổ sung các alias viết tắt và tên địa phương: `HUE` (411), `HN` / `Hà Nội` (101), `SG` / `TP.HCM` / `Bình Dương` / `Bà Rịa Vũng Tàu` (701), `Hải Dương` (103), `Nam Định` / `Hà Nam` (117), `Bắc Giang` (223), `Quảng Bình` (409), `Quảng Nam` (501), `Bình Định` / `Kon Tum` (505), `Ninh Thuận` (511), `Đắk Nông` / `Phú Yên` (605), `Bình Thuận` (703), `Long An` (709), `Bình Phước` (713), `Tiền Giang` / `Bến Tre` / `Trà Vinh` (809), `Hậu Giang` / `Sóc Trăng` (815), `Bạc Liêu` / `Kiên Giang` (823).
- **Phường cũ sáp nhập -> Phường mới tương ứng**:
  - TP. Hồ Chí Minh (`701`):
    - *Nguyễn Thái Bình, Phạm Ngũ Lão, Bến Nghé, Cô Giang, Cầu Kho...* -> `701926743 - Phường Bến Thành` / `701927393 - Phường Cầu Ông Lãnh`.
    - *Đa Kao, Tân Định* -> `701927396 - Phường Tân Định`.
    - *Phường 1, 2, 3, 4, 5 (Q5)* -> `701926748 - Phường Chợ Quán` / `701926752 - Phường Chợ Lớn`.
    - *Các phường thuộc Tân Bình, Phú Nhuận, Bình Thạnh* -> `Phường Tân Bình`, `Phường Gia Định`, `Phường Phú Nhuận`...
  - TP. Hà Nội (`101`):
    - *Hàng Bông, Hàng Trống, Cửa Đông, Tràng Tiền...* -> `101900070 - Phường Hoàn Kiếm`.
    - *Mỹ Đình 1, Mỹ Đình 2, Mễ Trì* -> `101900592 - Phường Từ Liêm`.
    - *Văn Miếu, Quốc Tử Giám* -> `101900196 - Phường Văn Miếu - Quốc Tử Giám`.
- **Quận/Huyện cũ -> Phường trung tâm đại diện (District Fallback)**:
  - Khi địa chỉ chỉ có Quận hoặc phường cũ chưa có trong từ điển:
    - `Q1` -> `701926743 - Phường Bến Thành`
    - `Q5` -> `701926752 - Phường Chợ Lớn`
    - `Tân Bình` -> `701927004 - Phường Tân Bình`
    - `Củ Chi` -> `701927553 - Xã Củ Chi`
    - `Hoàn Kiếm` -> `101900070 - Phường Hoàn Kiếm`
    - `Biên Hòa` -> `713926068 - Phường Biên Hòa`
    - `Buôn Ma Thuột` -> `605924133 - Phường Buôn Ma Thuột`...

### 2.2. Luồng Xử lý Bóc tách Địa chỉ (`src/converter/addressMatcher.js`)
1. **Làm sạch chuỗi (Sanitize)**: Chuẩn hóa khoảng trắng, bỏ dấu tiếng Việt để tìm kiếm không phụ thuộc dấu.
2. **Khớp Tỉnh/Thành (Level 1)**: Tìm theo ranh giới từ (word boundary) trong bảng 63 -> 34 tỉnh. Lấy mã `MATT` mới.
3. **Khớp Phường/Xã (Level 2)**:
   - Ưu tiên 1: Khớp trực tiếp với 3.324 phường/xã của tỉnh đó từ Sheet `PHUONG_XA`.
   - Ưu tiên 2: Khớp qua từ điển Phường cũ sáp nhập (`OLD_WARD_TO_NEW_WARD_MAP`).
   - Ưu tiên 3: Fallback qua từ điển Quận cũ (`OLD_DISTRICT_FALLBACK_MAP`).
   - Ưu tiên 4: Reverse lookup toàn quốc đối với các địa danh đặc trưng cấp xã/huyện.
4. **Bóc tách Địa chỉ chi tiết - Cột 13 (Level 3)**:
   - Loại bỏ các cụm tỉnh và phường mới đã nhận diện.
   - Nếu áp dụng District Fallback: bảo toàn cụm từ Quận cũ trong Địa chỉ chi tiết (ví dụ: `59 Phạm Ngũ Lão, Q1`).
   - Bảo toàn số nhà, tên đường, tên ngõ/ngách, lô/block (`Lô H`, `TDP 6`, `Ấp Cia Ran B`...).
   - Dọn sạch dấu phẩy và ký tự nối thừa ở đầu/cuối chuỗi.

### 2.3. Cấu trúc File Excel Xuất Ra (`src/converter/excelExporter.js`)
Tuân thủ nghiêm ngặt 19 cột của mẫu `tblt_vn_import.xlsx`:
- **Cột 11 (`TỈNH/ THÀNH PHỐ`)**: Giá trị `g.provinceDisplay` (Ví dụ: `701 - TP. Hồ Chí Minh`).
- **Cột 12 (`PHƯỜNG/ XÃ/ ĐẶC KHU`)**: Giá trị `g.wardDisplay` (Ví dụ: `701926743 - Phường Bến Thành`).
- **Cột 13 (`ĐỊA CHỈ CHI TIẾT`)**: Giá trị `g.addressDetail` (Địa chỉ chi tiết mới tinh gọn).
- **Cột 19 (`GHI CHÚ`)**: Giá trị `g.rawAddress` (Địa chỉ cũ nguyên bản từ Opera PMS).
- Giữ định dạng font `Calibri`, size `11`, `italic: false` cho toàn bộ các dòng dữ liệu.

### 2.4. Giao diện Người dùng & Sửa lỗi Kéo - Thả
1. **Sửa lỗi Kéo - Thả file**:
   - `src/preload/preload.js`: Bổ sung `getPathForFile: (file) => webUtils.getPathForFile(file)` thông qua `contextBridge`.
   - `src/renderer/app.js`: Tại sự kiện `drop`, sử dụng `window.api.getPathForFile(file) || file.path`.
2. **Bảng đối chiếu Địa chỉ Cũ ⟷ Mới trên UI**:
   - Tại màn hình kết quả chuyển đổi (`resultsSection`), bổ sung bảng preview:
     - Tên khách & Phòng.
     - Địa chỉ cũ (gốc từ PMS).
     - Địa chỉ mới (sau chuẩn hóa hành chính).
     - Huy hiệu trạng thái (Chính xác / Fallback theo Quận / Trống).
   - Có nút thu gọn/mở rộng trực quan.

---

## 3. Kế hoạch Kiểm thử & Tiêu chuẩn Nghiệm thu

### 3.1. Kiểm thử Đơn vị Tự động (Unit Tests)
- `tests/addressMatcher.test.js`:
  - Khớp địa chỉ cũ TP.HCM (Q1, Tân Bình, Củ Chi, P14 Q11, Bình Dương sáp nhập về 701...).
  - Khớp địa chỉ cũ Hà Nội (Hoàn Kiếm, Nam Từ Liêm, Times City, Gia Lâm...).
  - Khớp địa chỉ các tỉnh khác (Huế, Cà Mau, Tiền Giang, Đắk Lắk, Đồng Nai...).
  - Đảm bảo bảo toàn số nhà, ngõ ngách, tên lô/block.
- `tests/excelExporter.test.js`:
  - Kiểm tra file Excel xuất ra có đúng Cột 11, 12, 13 (Địa chỉ mới) và Cột 19 (Địa chỉ cũ).
- `tests/pipeline.test.js`:
  - Kiểm tra toàn bộ luồng convert từ XML `police_report2_75766981.XML` ra 2 file Excel đạt 100% tỷ lệ thành công.

### 3.2. Tiêu chuẩn Nghiệm thu (Acceptance Criteria)
1. Kéo - thả file XML vào khung giao diện hoạt động bình thường, không còn lỗi lấy đường dẫn.
2. Địa chỉ cũ được chuẩn hóa tự động sang 34 tỉnh và 3.324 phường/xã mới.
3. Không để mất số nhà, ngõ/ngách hay tên đường trong Cột 13.
4. Cột 19 ghi đầy đủ địa chỉ cũ nguyên bản.
5. Giao diện hiển thị bảng đối chiếu 2 cột Cũ ⟷ Mới rõ ràng, trực quan.
6. 100% bài kiểm tra tự động (`npm test`) vượt qua thành công.
