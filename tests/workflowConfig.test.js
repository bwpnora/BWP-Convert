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
    const content = fs.readFileSync(workflowPath, 'utf8').replace(/\r\n/g, '\n');
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
