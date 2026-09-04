# Thiết Kế Hệ Thống Tự Động Hóa Release & Đóng Gói Cài Đặt (BWP Convert)

- **Ngày tạo**: 2026-09-05
- **Trạng thái**: Chờ duyệt (Under Review)
- **Tác giả**: Antigravity Pair Programmer & Nora Nguyen

---

## 1. Mục Tiêu & Bối Cảnh

### 1.1. Bối cảnh
Ứng dụng **BWP Convert** là phần mềm máy tính (Electron Desktop App trên Windows) giúp chuyển đổi file XML báo cáo lưu trú từ Opera PMS sang biểu mẫu Excel chuẩn C06 và Quản lý Xuất nhập cảnh. Mã nguồn hiện đã được kết nối với GitHub repository `nguyen-nora/Opera-PMC-Converter`.

### 1.2. Mục tiêu
- **Tự động hóa phát hành (Automated Release)**: Tự động đóng gói và xuất bản bản phát hành trên GitHub mỗi khi gắn tag phiên bản (ví dụ `v1.0.1`) hoặc kích hoạt thủ công từ giao diện GitHub (`workflow_dispatch`).
- **Tạo bộ cài đặt chuẩn Windows (NSIS Installer)**: Tạo file cài đặt Setup (`.exe`) có wizard hướng dẫn, tự động tạo shortcut Desktop & Start Menu.
- **Thân thiện với máy tính trạm/khách sạn**: Cho phép cài đặt bình thường mà **không cần quyền Quản trị viên (Administrator)**, phù hợp với các máy tính lễ tân bị giới hạn quyền IT.
- **Bảo toàn tính toàn vẹn và chất lượng**: Tự động chạy toàn bộ bộ kiểm thử tự động (`pnpm test`) trước khi đóng gói, ngăn chặn phát hành mã nguồn lỗi.

---

## 2. Kiến Trúc Tổng Thể

Hệ thống phân phối và tự động hóa gồm 3 tầng liên kết:

```mermaid
graph TD
    A[Nhà phát triển push tag Git: v1.0.1] -->|Webhook| B[GitHub Actions Runner: windows-latest]
    A2[Kích hoạt thủ công: workflow_dispatch] -->|Web UI| B
    
    subgraph CI_Pipeline [Quy Trình Kiểm Tra & Đóng Gói]
        B --> C[Checkout Code & Cài đặt pnpm / Node.js 20]
        C --> D[Kiểm thử chất lượng: pnpm test]
        D -->|Pass| E[Đóng gói NSIS Installer: pnpm run dist]
        D -->|Fail| F[Dừng khẩn cấp & Báo lỗi, Không Release]
        E --> G[Tạo mã băm bảo mật: SHA-256 Checksum]
    end
    
    subgraph Distribution [Phân Phối & Xuất Bản]
        G --> H[softprops/action-gh-release@v2]
        H --> I[GitHub Release v1.0.1]
        I --> J[Tệp BWP-Convert-Setup-1.0.1.exe]
        I --> K[Tệp checksums.sha256]
    end
    
    subgraph Client_Deployment [Triển Khai Máy Khách Sạn]
        J --> L[Tải về máy lễ tân / kế toán]
        L --> M[Chạy cài đặt Per-User vào %LOCALAPPDATA%]
        M --> N[Tự tạo Shortcut Desktop & Start Menu]
        N --> O[Sử dụng ngay không cần mật khẩu Admin]
    end
```

---

## 3. Thiết Kế Chi Tiết Từng Thành Phần

### 3.1. Cấu hình Đóng gói NSIS (`package.json`)

Nâng cấp trường `"build"` trong `package.json` với các thuộc tính cụ thể:

```json
{
  "build": {
    "appId": "com.bwpconvert.app",
    "productName": "BWP Convert",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": "nsis",
      "icon": "src/images/logo.png",
      "artifactName": "${productName}-Setup-${version}.${ext}"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": "always",
      "createStartMenuShortcut": true,
      "shortcutName": "BWP Convert",
      "uninstallDisplayName": "BWP Convert - Gỡ cài đặt"
    },
    "extraResources": [
      {
        "from": "brief",
        "to": "brief",
        "filter": ["*.xlsx"]
      }
    ]
  }
}
```

* **`oneClick: false`**: Không cài ngầm một cách thụ động, mà mở trình hướng dẫn trực quan để người dùng an tâm theo dõi tiến trình.
* **`perMachine: false`**: Thiết lập phạm vi cài đặt mặc định cho người dùng hiện tại (Current User). Bộ cài sẽ không bật cảnh báo UAC (User Account Control) yêu cầu mật khẩu Admin của IT khách sạn.
* **`allowToChangeInstallationDirectory: true`**: Người dùng có thể tùy chọn ổ đĩa hoặc thư mục cài đặt nếu cần.
* **`createDesktopShortcut: "always"`**: Đảm bảo biểu tượng luôn xuất hiện ngoài màn hình chính để lễ tân mở nhanh.
* **`extraResources`**: Tự động chép 2 file biểu mẫu gốc (`tblt_vn_import.xlsx` và `dklt nc ngoài.xlsx`) vào thư mục tài nguyên ứng dụng để đảm bảo chạy độc lập trên máy mới.

### 3.2. Cấu hình Luồng CI/CD (`.github/workflows/release.yml`)

Tạo file workflow tự động hóa hoàn chỉnh trên máy ảo Windows sạch của GitHub:

```yaml
name: Build & Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  release:
    name: Build & Publish Release
    runs-on: windows-latest
    timeout-minutes: 25

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run automated test suite
        run: pnpm test

      - name: Build Windows installer
        run: pnpm run dist
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Generate SHA-256 Checksums
        shell: pwsh
        run: |
          Get-ChildItem -Path dist/*.exe | ForEach-Object {
            $hash = (Get-FileHash -Path $_.FullName -Algorithm SHA256).Hash.ToLower()
            "$hash  $($_.Name)" | Out-File -FilePath dist/checksums.sha256 -Append -Encoding ascii
          }
          Get-Content dist/checksums.sha256

      - name: Publish GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            dist/*.exe
            dist/checksums.sha256
          draft: false
          prerelease: false
          generate_release_notes: true
```

---

## 4. Quy Trình Vận Hành (Operational Workflow)

### 4.1. Quy trình phát hành bản cập nhật mới
1. Cập nhật version trong `package.json` (ví dụ: `"version": "1.0.1"`).
2. Commit thay đổi và tạo git tag:
   ```powershell
   git add package.json
   git commit -m "chore: bump version to v1.0.1"
   git tag v1.0.1
   git push origin master --tags
   ```
3. Theo dõi tiến trình tự động đóng gói tại tab **Actions** trên GitHub repository.
4. Sau 3-5 phút, tải bộ cài đặt tại mục **Releases**:
   `https://github.com/nguyen-nora/Opera-PMC-Converter/releases`

### 4.2. Hướng dẫn cài đặt cho máy tính trạm khách sạn
1. Tải file `BWP-Convert-Setup-*.exe`.
2. Chạy file cài đặt, nhấn **Next** theo hướng dẫn màn hình.
3. Ứng dụng sẽ tự cài đặt và mở biểu tượng **BWP Convert** ngoài Desktop.

---

## 5. Xử Lý Lỗi & Phòng Ngừa Rủi Ro (Error Handling & Edge Cases)

| Rủi ro / Tình huống | Phương án giải quyết |
| :--- | :--- |
| **Mã nguồn bị lỗi logic trước khi release** | Bước `pnpm test` sẽ chặn đứng quy trình build ngay lập tức nếu bất kỳ test nào fail. |
| **Máy trạm khách sạn không có quyền Admin** | Cấu hình `perMachine: false` cài vào `%LOCALAPPDATA%`, hoàn toàn không kích hoạt UAC nhắc quyền Admin. |
| **Mạng chập chờn khi tải file cài đặt** | Cung cấp file `checksums.sha256` trên Release để xác thực tính toàn vẹn nếu file cài đặt bị hỏng do mạng. |
| **File mẫu Excel bị thất lạc** | `extraResources` trong Electron-Builder sao chép nguyên vẹn thư mục `brief/*.xlsx` vào gói cài đặt. |

---

## 6. Kế Hoạch Xác Minh (Verification Plan)

1. **Kiểm tra cấu hình cục bộ (Local Dry-run)**:
   - Kiểm tra `pnpm test` chạy thành công 100%.
   - Chạy thử `pnpm run dist` trên máy hiện tại để kiểm tra cấu hình NSIS mới sinh ra file `BWP-Convert-Setup-*.exe` hợp lệ.
2. **Kiểm tra cú pháp Workflow**:
   - Kiểm tra cú pháp YAML của `.github/workflows/release.yml`.
3. **Cập nhật tài liệu**:
   - Cập nhật `README.md` với đường dẫn tải bản cài đặt Release.
