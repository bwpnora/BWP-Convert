// Nora Convert - Renderer App Logic
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropzoneSection = document.getElementById('dropzone-section');
  const loadingSection = document.getElementById('loading-section');
  const resultsSection = document.getElementById('results-section');
  const errorSection = document.getElementById('error-section');

  const dropzone = document.getElementById('dropzone');
  const browseBtn = document.getElementById('browse-btn');

  const loadingTitle = document.getElementById('loading-title');
  const loadingFileName = document.getElementById('loading-file-name');

  const resultsSource = document.getElementById('results-source');
  const statTotal = document.getElementById('stat-total');
  const statVn = document.getElementById('stat-vn');
  const statForeign = document.getElementById('stat-foreign');

  const vnFileName = document.getElementById('vn-file-name');
  const vnFilePath = document.getElementById('vn-file-path');
  const foreignFileName = document.getElementById('foreign-file-name');
  const foreignFilePath = document.getElementById('foreign-file-path');

  const openVnBtn = document.getElementById('open-vn-btn');
  const openForeignBtn = document.getElementById('open-foreign-btn');
  const openFolderBtn = document.getElementById('open-folder-btn');
  const resetBtn = document.getElementById('reset-btn');

  const errorMessage = document.getElementById('error-message');
  const errorRetryBtn = document.getElementById('error-retry-btn');

  let currentConversion = null;

  // View Switcher Helper
  function showView(viewName) {
    dropzoneSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    errorSection.classList.add('hidden');

    switch (viewName) {
      case 'dropzone':
        dropzoneSection.classList.remove('hidden');
        break;
      case 'loading':
        loadingSection.classList.remove('hidden');
        break;
      case 'results':
        resultsSection.classList.remove('hidden');
        break;
      case 'error':
        errorSection.classList.remove('hidden');
        break;
    }
  }

  // Get base name from path
  function getBasename(fullPath) {
    if (!fullPath) return '';
    return fullPath.split(/[\\/]/).pop();
  }

  // Reset to initial state
  function resetToInitial() {
    currentConversion = null;
    showView('dropzone');
  }

  // Show error screen
  function showError(msg) {
    errorMessage.textContent = msg || 'Đã xảy ra lỗi không xác định trong quá trình xử lý.';
    showView('error');
  }

  // Process conversion
  async function processFile(filePath) {
    if (!filePath) return;

    if (!window.api || typeof window.api.convertFile !== 'function') {
      showError('Giao diện không thể kết nối với dịch vụ chuyển đổi nền tảng (window.api).');
      return;
    }

    const filename = getBasename(filePath);
    loadingTitle.textContent = 'Đang chuyển đổi dữ liệu...';
    loadingFileName.textContent = filename;
    showView('loading');

    try {
      const result = await window.api.convertFile(filePath);

      if (!result || !result.success) {
        showError(result?.error || 'Chuyển đổi thất bại. Vui lòng kiểm tra định dạng file XML.');
        return;
      }

      currentConversion = result;

      // Populate results
      resultsSource.textContent = `Tệp nguồn: ${filename}`;
      statTotal.textContent = result.totalCount ?? (result.vnCount + result.foreignCount);
      statVn.textContent = result.vnCount ?? 0;
      statForeign.textContent = result.foreignCount ?? 0;

      vnFileName.textContent = result.vnFileName || getBasename(result.vnFilePath);
      vnFilePath.textContent = result.vnFilePath || '';

      foreignFileName.textContent = result.foreignFileName || getBasename(result.foreignFilePath);
      foreignFilePath.textContent = result.foreignFilePath || '';

      showView('results');
    } catch (err) {
      showError(err.message || 'Lỗi ngoại lệ khi gọi dịch vụ chuyển đổi.');
    }
  }

  // Open file dialog
  async function handleBrowseClick(e) {
    if (e) e.stopPropagation();
    if (!window.api || typeof window.api.selectFile !== 'function') {
      showError('Không thể mở hộp thoại chọn file.');
      return;
    }
    const selectedPath = await window.api.selectFile();
    if (selectedPath) {
      processFile(selectedPath);
    }
  }

  // Drag and drop event listeners
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, preventDefaults, false);
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.remove('drag-over');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;

    const file = dt.files[0];
    const path = (window.api && typeof window.api.getPathForFile === 'function')
      ? window.api.getPathForFile(file)
      : (file ? file.path : '');

    if (!path) {
      showError('Không thể lấy đường dẫn tệp trên hệ thống. Vui lòng sử dụng nút "Chọn file từ máy tính".');
      return;
    }

    if (!path.toLowerCase().endsWith('.xml')) {
      showError(`Tệp đã chọn (${file.name}) không có đuôi định dạng .xml.`);
      return;
    }

    processFile(path);
  });

  // Dropzone click & keyboard trigger
  dropzone.addEventListener('click', handleBrowseClick);
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBrowseClick();
    }
  });

  browseBtn.addEventListener('click', handleBrowseClick);

  // Results actions
  openVnBtn.addEventListener('click', () => {
    if (currentConversion?.vnFilePath && window.api?.openFolder) {
      window.api.openFolder(currentConversion.vnFilePath);
    }
  });

  openForeignBtn.addEventListener('click', () => {
    if (currentConversion?.foreignFilePath && window.api?.openFolder) {
      window.api.openFolder(currentConversion.foreignFilePath);
    }
  });

  openFolderBtn.addEventListener('click', () => {
    const target = currentConversion?.vnFilePath || currentConversion?.foreignFilePath;
    if (target && window.api?.openFolder) {
      window.api.openFolder(target);
    }
  });

  resetBtn.addEventListener('click', resetToInitial);
  errorRetryBtn.addEventListener('click', resetToInitial);
});
