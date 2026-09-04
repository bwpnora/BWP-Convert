# Tự Động Hóa Release & Đóng Gói Cài Đặt (BWP Convert) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ thống tự động đóng gói bộ cài đặt Windows NSIS (không cần quyền Admin) và tự động xuất bản GitHub Release qua GitHub Actions mỗi khi gắn tag phiên bản.

**Architecture:** Mở rộng cấu hình `electron-builder` trong `package.json` với NSIS assisted installer; thiết lập luồng CI/CD GitHub Actions (`.github/workflows/release.yml`) chạy trên runner `windows-latest`, kiểm thử tự động, build bộ cài đặt, tính toán SHA-256 checksum và xuất bản GitHub Release bằng `softprops/action-gh-release@v2`.

**Tech Stack:** Electron 34, Electron-Builder 25, Node.js 20, pnpm 9/10, GitHub Actions, NSIS.

**Spec:** `docs/superpowers/specs/2026-09-05-automated-release-installer-design.md`

## Global Constraints

- Không làm thay đổi logic lõi xử lý XML/Excel trong `src/converter/`.
- File cài đặt xuất ra phải cài được bình thường trên máy trạm khách sạn mà không bắt buộc quyền Admin (`perMachine: false`).
- Bộ cài đặt phải chứa đầy đủ biểu mẫu gốc trong thư mục `brief/` (`extraResources`).
- Mọi thay đổi đều phải vượt qua bộ kiểm thử tự động `pnpm test`.

---

### Task 1: Cấu hình Electron-Builder NSIS trong `package.json` và Viết Test Xác Thực Cấu Hình

**Files:**
- Create: `tests/packageConfig.test.js`
- Modify: `package.json:21-38`

**Interfaces:**
- Consumes: `package.json`
- Produces: Chuẩn cấu hình đóng gói NSIS với `artifactName: "${productName}-Setup-${version}.${ext}"`, `perMachine: false`, `oneClick: false`.

- [ ] **Step 1: Viết test kiểm tra cấu hình đóng gói trong `tests/packageConfig.test.js`**

```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Cấu hình Package & Electron-Builder NSIS', () => {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  test('Phải có cấu hình build với tên sản phẩm và appId chuẩn', () => {
    assert.strictEqual(pkg.name, 'bwp-convert');
    assert.strictEqual(pkg.build.appId, 'com.bwpconvert.app');
    assert.strictEqual(pkg.build.productName, 'BWP Convert');
  });

  test('Cấu hình NSIS phải cho phép cài không cần quyền Admin và hiển thị Wizard', () => {
    assert.ok(pkg.build.win, 'Phải có mục cấu hình win');
    assert.strictEqual(pkg.build.win.target, 'nsis');
    assert.strictEqual(pkg.build.win.artifactName, '${productName}-Setup-${version}.${ext}');

    const nsis = pkg.build.nsis;
    assert.ok(nsis, 'Phải có mục cấu hình nsis');
    assert.strictEqual(nsis.oneClick, false, 'oneClick phải là false để hiện wizard');
    assert.strictEqual(nsis.perMachine, false, 'perMachine phải là false để không yêu cầu admin');
    assert.strictEqual(nsis.allowToChangeInstallationDirectory, true);
    assert.strictEqual(nsis.createDesktopShortcut, 'always');
    assert.strictEqual(nsis.createStartMenuShortcut, true);
    assert.strictEqual(nsis.shortcutName, 'BWP Convert');
  });

  test('Phải đóng gói kèm extraResources cho brief/*.xlsx', () => {
    const resources = pkg.build.extraResources;
    assert.ok(Array.isArray(resources), 'extraResources phải là mảng');
    const briefRes = resources.find(r => r.from === 'brief' && r.to === 'brief');
    assert.ok(briefRes, 'Phải có extraResources sao chép thư mục brief');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (do chưa có cấu hình NSIS chi tiết)**

Run: `node --test tests/packageConfig.test.js`
Expected: FAIL với lỗi liên quan đến `pkg.build.win.artifactName` hoặc `pkg.build.nsis`.

- [ ] **Step 3: Cập nhật cấu hình `build` trong `package.json`**

```json
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
        "filter": [
          "*.xlsx"
        ]
      }
    ]
  }
```

- [ ] **Step 4: Chạy lại test xác nhận vượt qua**

Run: `node --test tests/packageConfig.test.js`
Expected: PASS toàn bộ 3 test cases.

- [ ] **Step 5: Commit thay đổi**

```bash
git add package.json tests/packageConfig.test.js
git commit -m "feat(build): configure electron-builder NSIS assisted installer without admin requirement"
```

---

### Task 2: Thiết Lập GitHub Actions Workflow (`.github/workflows/release.yml`) và Test Xác Thực

**Files:**
- Create: `.github/workflows/release.yml`
- Create: `tests/workflowConfig.test.js`

**Interfaces:**
- Consumes: Trigger Git tags (`v*`) hoặc `workflow_dispatch`
- Produces: GitHub Release tự động đính kèm `dist/*.exe` và `dist/checksums.sha256`.

- [ ] **Step 1: Viết test kiểm tra sự tồn tại và cấu trúc workflow trong `tests/workflowConfig.test.js`**

```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Cấu hình GitHub Actions Workflow Release', () => {
  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'release.yml');

  test('File workflow release.yml phải tồn tại', () => {
    assert.ok(fs.existsSync(workflowPath), 'File .github/workflows/release.yml phải tồn tại');
  });

  test('Workflow phải có đủ triggers và steps theo Spec', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    assert.ok(content.includes("tags:\n      - 'v*'"), 'Phải trigger trên git tag v*');
    assert.ok(content.includes('workflow_dispatch:'), 'Phải hỗ trợ trigger thủ công');
    assert.ok(content.includes('runs-on: windows-latest'), 'Phải chạy trên windows-latest');
    assert.ok(content.includes('contents: write'), 'Phải có quyền contents: write');
    assert.ok(content.includes('pnpm test'), 'Phải chạy test tự động trước khi build');
    assert.ok(content.includes('pnpm run dist'), 'Phải chạy electron-builder dist');
    assert.ok(content.includes('softprops/action-gh-release@v2'), 'Phải dùng action-gh-release@v2');
    assert.ok(content.includes('checksums.sha256'), 'Phải tạo và đính kèm checksums SHA256');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (do chưa có file workflow)**

Run: `node --test tests/workflowConfig.test.js`
Expected: FAIL với "File .github/workflows/release.yml phải tồn tại".

- [ ] **Step 3: Tạo file `.github/workflows/release.yml`**

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

- [ ] **Step 4: Chạy lại test xác nhận vượt qua**

Run: `node --test tests/workflowConfig.test.js`
Expected: PASS toàn bộ test cases.

- [ ] **Step 5: Commit thay đổi**

```bash
git add .github/workflows/release.yml tests/workflowConfig.test.js
git commit -m "ci: add GitHub Actions workflow for automated build and release"
```

---

### Task 3: Cập Nhật Tài Liệu `README.md` Với Hướng Dẫn Tải & Cài Đặt

**Files:**
- Modify: `README.md`
- Test: `pnpm test`

**Interfaces:**
- Cung cấp hướng dẫn rõ ràng cho người dùng cuối và kỹ thuật viên về cách tải bộ cài đặt, cài đặt không cần Admin và quy trình kích hoạt release.

- [ ] **Step 1: Cập nhật `README.md`**

Thêm huy hiệu Release badge và mục hướng dẫn cài đặt cho máy tính khác:
```markdown
[![Release](https://img.shields.io/github/v/release/nguyen-nora/Opera-PMC-Converter?label=B%E1%BA%A3n%20m%E1%BB%9Bi%20nh%E1%BA%A5t&color=2ea44f)](https://github.com/nguyen-nora/Opera-PMC-Converter/releases)
```
Và mục:
```markdown
## 💾 Tải Về & Cài Đặt Trên Các Máy Khác (Không Cần Quyền Admin)

1. Truy cập trang phát hành: [**GitHub Releases**](https://github.com/nguyen-nora/Opera-PMC-Converter/releases).
2. Tải file cài đặt phiên bản mới nhất: `BWP-Convert-Setup-*.exe`.
3. Nhấp đúp chuột để chạy file cài đặt:
   - Ứng dụng được cấu hình tối ưu cho máy trạm khách sạn: **không cần quyền Quản trị viên (Administrator)**.
   - Trình cài đặt sẽ tự động tạo biểu tượng ngoài màn hình Desktop và Start Menu.
4. Mở ứng dụng từ Desktop và kéo thả file XML để sử dụng ngay.
```

- [ ] **Step 2: Chạy toàn bộ test suite để đảm bảo không có xung đột**

Run: `pnpm test`
Expected: PASS toàn bộ các test files.

- [ ] **Step 3: Commit thay đổi**

```bash
git add README.md
git commit -m "docs: add release badge and client installation instructions to README"
```

---

### Task 4: Kiểm Thử Đóng Gói Cục Bộ (Dry-run Verification) & Toàn Bộ Hệ Thống

**Files:**
- None (Verification task)

- [ ] **Step 1: Chạy toàn bộ test suite**

Run: `pnpm test`
Expected: PASS 100%.

- [ ] **Step 2: Chạy thử lệnh đóng gói `pnpm run dist` trên môi trường cục bộ**

Run: `pnpm run dist`
Expected: `electron-builder` tạo thành công file `dist/BWP-Convert-Setup-1.0.0.exe` mà không gặp lỗi cấu hình NSIS.

- [ ] **Step 3: Kiểm tra sự tồn tại và kích thước file `.exe` trong thư mục `dist/`**

Run: `Test-Path dist/BWP-Convert-Setup-1.0.0.exe`
Expected: `True`.
