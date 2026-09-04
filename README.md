# BWP Convert 🏨🇻🇳

**BWP Convert** là phần mềm Desktop chuyên dụng trên Windows giúp tự động chuyển đổi file XML báo cáo lưu trú xuất từ hệ thống quản trị khách sạn **Opera PMS** (`police_report2_*.xml`) sang 2 biểu mẫu Excel khai báo lưu trú chuẩn theo quy định của cơ quan Công an:

1. **`tblt_vn_import_*.xlsx`**: Biểu mẫu Cổng Dịch vụ công C06 Bộ Công an (dành cho khách Việt Nam).
2. **`dklt_nc_ngoai_*.xlsx`**: Biểu mẫu Cục Quản lý xuất nhập cảnh (dành cho khách Nước ngoài).

---

## 🌟 Tính Năng Nổi Bật

- ⚡ **Phân luồng khách thông minh**: Tự động nhận diện và phân tách chính xác khách Việt Nam và khách Nước ngoài (kể cả các bản ghi có quốc tịch `UNKNOWN` trong Opera PMS dựa trên số hộ chiếu và mã quốc gia phụ).
- 🏷️ **Bảo toàn thứ tự Họ và Tên**: Giữ nguyên định dạng họ tên khách sạn `HỌ TÊN`, loại bỏ dấu phẩy nhưng tuyệt đối không đảo ngược thứ tự tên họ kiểu phương Tây.
- 📅 **Chuẩn hóa ngày tháng theo quy chuẩn từng biểu mẫu**:
  - Khách Việt Nam: định dạng `dd-MM-yyyy` (dấu gạch ngang).
  - Khách Nước ngoài: định dạng `dd/MM/yyyy` (dấu gạch chéo).
- 🗺️ **Tự động đối soát địa giới hành chính C06**: Tự động phân tích địa chỉ thô của khách, nhận diện tỉnh/thành phố và tự động điền mã hiển thị chính thức của C06 (ví dụ: `701 - TP. Hồ Chí Minh`, `101 - TP. Hà Nội`,...) với bộ từ điển biệt danh (TPHCM, Sài Gòn, Hà Nội, Bà Rịa, Vũng Tàu,...).
- 📊 **Bảo toàn 100% biểu mẫu Excel gốc**: Giữ nguyên mọi công thức, named ranges, styles, định dạng và các sheet phụ (`TINH_THANH`, `DANH_MUC`, `PHUONG_XA`, `Lookup`).
- 🛡️ **Tương thích hoàn hảo với Microsoft Excel**:
  - Đồng bộ phạm vi bảng (`Table1`) và bộ lọc AutoFilter khớp chính xác với số dòng thực tế, loại bỏ hoàn toàn lỗi *"Removed Records: AutoFilter from /xl/tables/table1.xml"*.
  - Dữ liệu khách được định dạng chữ đứng rõ ràng, chỉ giữ in nghiêng ở các dòng hướng dẫn/ví dụ của biểu mẫu.
- 🖥️ **Giao diện Desktop hiện đại**: Kéo & thả file XML trực tiếp vào phần mềm, hiển thị thống kê tức thì và có nút mở ngay thư mục chứa file kết quả trong Windows Explorer.
- 💻 **Tích hợp CLI linh hoạt**: Có thể chạy tự động hóa qua dòng lệnh dòng lệnh (scripting / batch automation).

---

## 🚀 Cài Đặt & Khởi Chạy

### Yêu cầu hệ thống
- **Node.js**: Phiên bản 18+ trở lên.
- **pnpm**: Phiên bản 9+ hoặc 10+ (được khuyến nghị).

### 1. Cài đặt thư viện
```powershell
pnpm install
```
*(Cấu hình `pnpm.onlyBuiltDependencies` trong `package.json` sẽ tự động tải binary Electron về máy).*

### 2. Khởi chạy ứng dụng Desktop (GUI)
```powershell
pnpm start
```
- Kéo thả file XML báo cáo lưu trú từ Opera PMS vào ô chuyển đổi.
- Nhấn **"Mở thư mục chứa file"** để xem và sử dụng ngay các file Excel đã tạo.

### 3. Chạy chuyển đổi bằng dòng lệnh (CLI)
```powershell
# Chạy với file XML mặc định trong thư mục brief:
pnpm run convert

# Hoặc truyền đường dẫn file XML cụ thể và thư mục lưu:
pnpm run convert -- "D:\OperaReports\police_report2_20260904.XML" "D:\BaoCaoCongAn"
```

### 4. Chạy bộ kiểm thử tự động
```powershell
pnpm test
```

### 5. Đóng gói file cài đặt Windows (.exe)
```powershell
pnpm run dist
```
File cài đặt NSIS (`.exe`) sẽ được tạo trong thư mục `dist/`.

---

## 📁 Cấu Trúc Dự Án

```text
nora-convert/
├── brief/                               # File mẫu Opera PMS XML & Excel biểu mẫu gốc
│   ├── police_report2_75766981.XML      # File XML mẫu xuất từ Opera PMS
│   ├── tblt_vn_import.xlsx              # Biểu mẫu C06 (Khách Việt Nam)
│   └── dklt nc ngoài.xlsx               # Biểu mẫu Quản lý xuất nhập cảnh (Khách Nước ngoài)
├── src/
│   ├── converter/                       # Core engine chuyển đổi
│   │   ├── xmlParser.js                 # Phân tích cú pháp XML, chuẩn hóa họ tên & ngày
│   │   ├── addressMatcher.js            # Đối soát địa giới hành chính C06
│   │   ├── excelExporter.js             # Xuất file Excel bảo toàn định dạng & sửa lỗi Table1
│   │   └── index.js                     # Pipeline điều phối chuyển đổi trung tâm
│   ├── main/                            # Electron Main Process (quản lý cửa sổ, IPC)
│   │   └── main.js
│   ├── preload/                         # Preload Bridge an toàn (contextBridge)
│   │   └── preload.js
│   ├── renderer/                        # Giao diện người dùng (HTML, CSS, JS)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── cli.js                           # Runner giao diện dòng lệnh
├── tests/                               # Bộ kiểm thử tự động (Unit & Integration tests)
│   ├── setup.test.js
│   ├── xmlParser.test.js
│   ├── addressMatcher.test.js
│   ├── excelExporter.test.js
│   ├── pipeline.test.js
│   ├── gui.test.js
│   └── verifyOutputs.test.js
├── package.json
└── README.md
```

---

## 📄 Bản Quyền

Copyright @ 2026 - Website by IT Leon. All rights reserved.
