# Đặc Tả Kỹ Thuật: Nâng Cấp UI/UX, Luồng Xử Lý Nền (Worker Thread), Thư Mục Documents & Hoàn Thiện Tính Năng BWP Convert v1.1.0

- **Mã định danh**: SPEC-2026-09-10-UI-UX-WORKER
- **Ngày tạo**: 2026-09-10
- **Trạng thái**: Chờ duyệt (Pending User Review)
- **Phiên bản ứng dụng**: 1.1.0
- **Tác giả**: Nora Convert Team

---

## 1. Mục tiêu & Bối cảnh

### 1.1. Bối cảnh
Phần mềm **BWP Convert** là ứng dụng desktop xây dựng trên nền tảng Electron, phục vụ chuyển đổi tệp XML báo cáo lưu trú từ hệ thống khách sạn Opera PMS sang 2 biểu mẫu Excel chuẩn:
- `tblt_vn_import_*.xlsx` (Mẫu C06 - Dịch vụ công cho công dân Việt Nam).
- `dklt_nc_ngoai_*.xlsx` (Mẫu khai báo tạm trú người nước ngoài cho Quản lý xuất nhập cảnh).

### 1.2. Vấn đề thực tế cần giải quyết
1. **Hiện tượng treo ứng dụng "Not Responding"**:
   - Quá trình chuyển đổi (đọc template Excel lớn, tra cứu 3.324 phường xã, regex bóc tách địa chỉ, sao chép định dạng và ghi file Excel) mất từ 15 đến 45 giây.
   - Hiện tại toàn bộ tác vụ này chạy trực tiếp trên luồng chính (Main process event loop) của Electron, làm nghẽn vòng lặp xử lý thông điệp Windows (message pump). Khi người dùng chuyển cửa sổ (Alt+Tab) hoặc nhấp ra ngoài rồi quay lại, hệ điều hành Windows gắn nhãn ứng dụng là *"Not Responding"* (Chương trình không phản hồi).
2. **Nơi lưu trữ file xuất ra chưa đồng nhất và khó tìm**:
   - Hiện tại file Excel xuất cùng thư mục với file XML nguồn. Người dùng cần tất cả các file xuất ra được gom tập trung vào thư mục riêng của phần mềm trong thư mục **Documents** (`C:\Users\<User>\Documents\BWP Convert`).
3. **Thao tác mở file và mở thư mục chưa trực quan**:
   - Nút *"Mở file"* trước đây thực chất chỉ gọi `shell.showItemInFolder`, không trực tiếp mở file trong Excel. Người dùng cần nút riêng biệt để mở file trực tiếp và nút mở thư mục chứa (highlight file trong File Explorer).
4. **Thiếu thông báo hoàn tất trực quan (Toast Notification)**:
   - Khi chuyển đổi xong, người dùng cần một thông báo Toast hiện ở góc dưới bên phải màn hình trong 5 giây, có thanh đếm thời gian và tự động đóng.
5. **Lỗi khi kéo thả file (Drag & Drop)**:
   - Electron 34 loại bỏ thuộc tính `file.path` trực tiếp trên DOM `File`. Cần xử lý triệt để qua `webUtils.getPathForFile` trên toàn bộ cửa sổ và có cơ chế bắt lỗi thân thiện.
6. **Cập nhật nhận diện thương hiệu & phiên bản**:
   - Nâng cấp phiên bản phần mềm lên **1.1.0** trong `package.json`, giao diện HTML và cấu hình đóng gói. Đảm bảo logo tại `src/images/logo.png` hiển thị đồng bộ từ tiêu đề, icon ứng dụng đến bộ cài đặt.

---

## 2. Thiết kế Kiến trúc & Giải pháp Kỹ thuật

### 2.1. Kiến trúc Đa luồng Xử lý Nền (Background Worker Thread)
- **Nguyên lý**: Sử dụng module chuẩn `worker_threads` của Node.js.
- **Cấu trúc file**:
  - `src/main/worker.js`: Module chuyên trách nhận dữ liệu đầu vào qua `workerData`, thực thi `runConversion(xmlPath, options)` độc lập hoàn toàn với Main process event loop, sau đó gửi kết quả thành công hoặc lỗi qua `parentPort.postMessage()`.
  - `src/main/main.js`: Lắng nghe IPC `convert-file`, khởi tạo `new Worker(path.join(__dirname, 'worker.js'), { workerData: ... })`.
- **Lợi ích**:
  - Luồng giao diện (Renderer) và luồng chính (Main Process) luôn duy trì tốc độ phản hồi 60 FPS.
  - Windows message pump xử lý mượt mà sự kiện chuyển cửa sổ, thu nhỏ/phóng to, không bao giờ xuất hiện trạng thái *"Not Responding"*.
  - Tương thích 100% với việc đóng gói bằng `electron-builder` trên Windows.

### 2.2. Kiến trúc Thư mục Lưu trữ Tập trung (Documents Storage)
- **Đường dẫn thư mục**:
  - Lấy đường dẫn Documents chuẩn của hệ thống: `const documentsDir = app.getPath('documents');`
  - Thư mục chuyên dụng: `const outputDir = path.join(documentsDir, 'BWP Convert');`
- **Khởi tạo & Phòng vệ**:
  - Trước khi worker bắt đầu ghi file, kiểm tra và tự động tạo thư mục bằng `fs.mkdirSync(outputDir, { recursive: true })`.
  - Nếu gặp lỗi phân quyền đặc biệt trên Windows, tự động fallback về thư mục của file XML nguồn và thông báo rõ trong kết quả trả về.

### 2.3. Hợp đồng Giao tiếp IPC & Preload Bridge (`src/preload/preload.js`)
Mở rộng các API giao tiếp an toàn qua `contextBridge`:
- `convertFile(filePath)`: Gửi yêu cầu chuyển đổi xuống Main Process (chạy worker nền).
- `openFile(filePath)`: Gọi `shell.openPath(filePath)` để mở trực tiếp file bằng Microsoft Excel hoặc ứng dụng bảng tính mặc định.
- `openFolder(filePath)`: Gọi `shell.showItemInFolder(filePath)` để mở Windows Explorer và chọn sẵn file đó.
- `openOutputDir()`: Gọi `shell.openPath(outputDir)` để mở thư mục `Documents\BWP Convert`.
- `getPathForFile(file)`: Sử dụng an toàn `webUtils.getPathForFile(file)` để lấy đường dẫn thực trên ổ đĩa từ sự kiện kéo-thả.

### 2.4. Thiết kế Giao diện Người dùng (UI/UX)

#### A. Nút Thao Tác Kép trên Kết Quả (Dual Action Buttons)
Trên mỗi thẻ kết quả (Khách Việt Nam C06 và Khách Nước Ngoài QLXNC):
1. 📄 **Nút "Mở file"** (`btn btn-sm btn-primary`):
   - Icon văn bản / Excel.
   - Nhấn vào: Mở trực tiếp tệp `.xlsx` bằng phần mềm Excel của máy tính.
2. 📁 **Nút "Mở thư mục"** (`btn btn-sm btn-outline`):
   - Icon thư mục.
   - Nhấn vào: Mở File Explorer trỏ thẳng vào tệp tương ứng.
3. **Thanh tác vụ dưới cùng**:
   - 📂 **Nút "Mở thư mục BWP Convert"** (`btn btn-secondary`): Mở trực tiếp thư mục `Documents\BWP Convert`.
   - 🔄 **Nút "Chuyển đổi tệp khác"** (`btn btn-primary`): Trở về màn hình kéo thả ban đầu.

#### B. Thông Báo Toast Hoàn Tất (Bottom-Right Toast Notification)
- **Vị trí**: Cố định tại góc dưới cùng bên phải (`position: fixed; bottom: 24px; right: 24px; z-index: 9999;`).
- **Hình thức**:
  - Thiết kế card hiện đại, viền xanh lá thành công (`var(--success)`).
  - Biểu tượng checkmark xanh lá, tiêu đề *"Chuyển đổi hoàn tất thành công!"*.
  - Nội dung phụ: *"Đã lưu các tệp Excel vào thư mục Documents\BWP Convert"*.
  - Nút đóng `×` ở góc thẻ.
  - Thanh tiến trình đếm ngược 5 giây (`toast-progress`) mỏng ở cạnh dưới của Toast.
- **Hành vi**:
  - Xuất hiện với hiệu ứng trượt nhẹ từ dưới lên và mờ dần (slide-up + fade-in).
  - Tự động biến mất sau đúng **5 giây**.
  - Người dùng có thể nhấn `×` để đóng ngay lập tức.
  - Không tự ý kích hoạt hành động mở file/thư mục khi nhấn vào vùng trống của banner.

#### C. Khắc Phục Triệt Để Kéo - Thả File (Drag & Drop)
- Bắt sự kiện kéo-thả trên phạm vi toàn cửa sổ và vùng dropzone.
- Đảm bảo khi file kéo vào cửa sổ, vùng dropzone chuyển sang trạng thái `drag-over` nổi bật.
- Sử dụng `webUtils.getPathForFile(file)` để lấy đường dẫn tệp.
- Kiểm tra phần mở rộng `.xml` không phân biệt hoa thường.
- Nếu không thể lấy đường dẫn (ví dụ kéo từ file nén chưa giải nén), hiển thị thông báo hướng dẫn rõ ràng.

#### D. Nâng Cấp Phiên Bản 1.1.0 & Logo Thương Hiệu
- Cập nhật `package.json`:
  ```json
  "version": "1.1.0"
  ```
- Cập nhật badge trong `src/renderer/index.html`:
  ```html
  <div class="version-badge">v1.1.0</div>
  ```
- Đảm bảo logo `src/images/logo.png` được hiển thị sắc nét tại header và cấu hình icon cửa sổ / NSIS.

---

## 3. Danh Sách Tệp Thay Đổi

| STT | Tệp tin | Thao tác | Mục đích |
|---|---|---|---|
| 1 | `package.json` | Cập nhật | Nâng version lên `1.1.0` |
| 2 | `src/main/worker.js` | Tạo mới | Worker thread thực thi `runConversion` độc lập |
| 3 | `src/main/main.js` | Cập nhật | Tích hợp Worker thread, thư mục Documents, IPC mở file / mở thư mục |
| 4 | `src/preload/preload.js` | Cập nhật | Expose `openFile`, `openFolder`, `openOutputDir`, `getPathForFile` |
| 5 | `src/renderer/index.html` | Cập nhật | Version badge `v1.1.0`, bổ sung nút Mở file/Mở thư mục, khung Toast container |
| 6 | `src/renderer/styles.css` | Cập nhật | CSS cho Toast notification, animation 5s, layout nút kép |
| 7 | `src/renderer/app.js` | Cập nhật | Logic hiển thị Toast 5s, xử lý nút kép, cải tiến Drag-and-drop |
| 8 | `tests/gui.test.js` | Cập nhật | Bổ sung unit tests cho worker, IPC hợp đồng mới, toast, version 1.1.0 |

---

## 4. Kế Hoạch Kiểm Thử & Xác Minh (Verification Plan)

### 4.1. Kiểm thử Tự động (Automated Tests)
- Chạy toàn bộ test suite hiện có: `pnpm test`.
- Thêm kiểm thử trong `tests/gui.test.js`:
  1. Kiểm tra tồn tại của `src/main/worker.js`.
  2. Kiểm tra `package.json` có version `1.1.0`.
  3. Kiểm tra `index.html` chứa version `v1.1.0` và cấu trúc Toast, nút kép.
  4. Kiểm tra `preload.js` cung cấp đầy đủ các API hợp đồng (`openFile`, `openFolder`, `openOutputDir`, `getPathForFile`).
  5. Kiểm tra logic tạo thư mục `Documents\BWP Convert`.

### 4.2. Kiểm thử Thực tế (Manual Verification)
1. **Kiểm tra Worker & Không bị Not Responding**:
   - Chạy ứng dụng bằng `npm start`.
   - Chọn file `brief/police_report2_75766981.XML`.
   - Trong quá trình chuyển đổi, chuyển đổi qua lại giữa các cửa sổ (Alt+Tab, click ra ngoài), kiểm tra ứng dụng phản hồi mượt mà, không bị hiện chữ "(Not Responding)".
2. **Kiểm tra Thư mục Documents**:
   - Kiểm tra thư mục `C:\Users\<User>\Documents\BWP Convert` được tự động tạo và chứa 2 tệp kết quả.
3. **Kiểm tra Nút Kép**:
   - Nhấn "Mở file": Excel được khởi động và mở tệp.
   - Nhấn "Mở thư mục": File Explorer mở ra với tệp được highlight.
   - Nhấn "Mở thư mục BWP Convert": File Explorer mở đúng thư mục `Documents\BWP Convert`.
4. **Kiểm tra Toast Notification**:
   - Quan sát Toast xuất hiện ở góc dưới bên phải ngay khi chuyển đổi xong.
   - Thanh đếm thời gian chạy đều trong 5 giây và Toast tự động biến mất.
   - Thử nghiệm nhấn nút `×` để đóng Toast ngay lập tức.
5. **Kiểm tra Kéo - Thả File**:
   - Kéo file XML từ File Explorer thả vào cửa sổ, kiểm tra nhận file và tiến hành chuyển đổi bình thường.
