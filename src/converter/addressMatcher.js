const ExcelJS = require('exceljs');

function cleanText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const KNOWN_PROVINCES = [
  { matt: '101', name: 'Hà Nội', display: '101 - TP. Hà Nội' },
  { matt: '103', name: 'Hải Phòng', display: '103 - TP. Hải Phòng' },
  { matt: '109', name: 'Hưng Yên', display: '109 - Hưng Yên' },
  { matt: '111', name: 'Hà Nam', display: '111 - Hà Nam' },
  { matt: '113', name: 'Nam Định', display: '113 - Nam Định' },
  { matt: '115', name: 'Thái Bình', display: '115 - Thái Bình' },
  { matt: '117', name: 'Ninh Bình', display: '117 - Ninh Bình' },
  { matt: '201', name: 'Bắc Kạn', display: '201 - Bắc Kạn' },
  { matt: '203', name: 'Cao Bằng', display: '203 - Cao Bằng' },
  { matt: '205', name: 'Lào Cai', display: '205 - Lào Cai' },
  { matt: '207', name: 'Yên Bái', display: '207 - Yên Bái' },
  { matt: '209', name: 'Lạng Sơn', display: '209 - Lạng Sơn' },
  { matt: '211', name: 'Tuyên Quang', display: '211 - Tuyên Quang' },
  { matt: '215', name: 'Thái Nguyên', display: '215 - Thái Nguyên' },
  { matt: '217', name: 'Phú Thọ', display: '217 - Phú Thọ' },
  { matt: '221', name: 'Bắc Giang', display: '221 - Bắc Giang' },
  { matt: '223', name: 'Bắc Ninh', display: '223 - Bắc Ninh' },
  { matt: '225', name: 'Quảng Ninh', display: '225 - Quảng Ninh' },
  { matt: '301', name: 'Lai Châu', display: '301 - Lai Châu' },
  { matt: '302', name: 'Điện Biên', display: '302 - Điện Biên' },
  { matt: '303', name: 'Sơn La', display: '303 - Sơn La' },
  { matt: '305', name: 'Hòa Bình', display: '305 - Hòa Bình' },
  { matt: '401', name: 'Thanh Hóa', display: '401 - Thanh Hóa' },
  { matt: '403', name: 'Nghệ An', display: '403 - Nghệ An' },
  { matt: '405', name: 'Hà Tĩnh', display: '405 - Hà Tĩnh' },
  { matt: '407', name: 'Quảng Bình', display: '407 - Quảng Bình' },
  { matt: '409', name: 'Quảng Trị', display: '409 - Quảng Trị' },
  { matt: '411', name: 'Huế', display: '411 - TP. Huế' },
  { matt: '501', name: 'Đà Nẵng', display: '501 - TP. Đà Nẵng' },
  { matt: '503', name: 'Quảng Nam', display: '503 - Quảng Nam' },
  { matt: '505', name: 'Quảng Ngãi', display: '505 - Quảng Ngãi' },
  { matt: '507', name: 'Bình Định', display: '507 - Bình Định' },
  { matt: '509', name: 'Phú Yên', display: '509 - Phú Yên' },
  { matt: '511', name: 'Khánh Hòa', display: '511 - Khánh Hòa' },
  { matt: '601', name: 'Kon Tum', display: '601 - Kon Tum' },
  { matt: '603', name: 'Gia Lai', display: '603 - Gia Lai' },
  { matt: '605', name: 'Đắk Lắk', display: '605 - Đắk Lắk' },
  { matt: '607', name: 'Đắk Nông', display: '607 - Đắk Nông' },
  { matt: '701', name: 'Hồ Chí Minh', display: '701 - TP. Hồ Chí Minh' },
  { matt: '703', name: 'Lâm Đồng', display: '703 - Lâm Đồng' },
  { matt: '705', name: 'Ninh Thuận', display: '705 - Ninh Thuận' },
  { matt: '707', name: 'Bình Thuận', display: '707 - Bình Thuận' },
  { matt: '709', name: 'Tây Ninh', display: '709 - Tây Ninh' },
  { matt: '711', name: 'Bình Dương', display: '711 - Bình Dương' },
  { matt: '713', name: 'Đồng Nai', display: '713 - Đồng Nai' },
  { matt: '715', name: 'Bình Phước', display: '715 - Bình Phước' },
  { matt: '717', name: 'Bà Rịa - Vũng Tàu', display: '717 - Bà Rịa - Vũng Tàu' },
  { matt: '801', name: 'Long An', display: '801 - Long An' },
  { matt: '803', name: 'Đồng Tháp', display: '803 - Đồng Tháp' },
  { matt: '805', name: 'An Giang', display: '805 - An Giang' },
  { matt: '807', name: 'Tiền Giang', display: '807 - Tiền Giang' },
  { matt: '809', name: 'Vĩnh Long', display: '809 - Vĩnh Long' },
  { matt: '811', name: 'Bến Tre', display: '811 - Bến Tre' },
  { matt: '813', name: 'Kiên Giang', display: '813 - Kiên Giang' },
  { matt: '815', name: 'Cần Thơ', display: '815 - TP. Cần Thơ' },
  { matt: '817', name: 'Hậu Giang', display: '817 - Hậu Giang' },
  { matt: '819', name: 'Trà Vinh', display: '819 - Trà Vinh' },
  { matt: '821', name: 'Sóc Trăng', display: '821 - Sóc Trăng' },
  { matt: '823', name: 'Cà Mau', display: '823 - Cà Mau' },
  { matt: '825', name: 'Bạc Liêu', display: '825 - Bạc Liêu' }
];

const RAW_ALIASES = [
  // TP. Hồ Chí Minh
  { alias: 'thành phố hồ chí minh', matt: '701' },
  { alias: 'thanh pho ho chi minh', matt: '701' },
  { alias: 'tp hồ chí minh', matt: '701' },
  { alias: 'tp ho chi minh', matt: '701' },
  { alias: 'hồ chí minh', matt: '701' },
  { alias: 'ho chi minh', matt: '701' },
  { alias: 'tp hcm', matt: '701' },
  { alias: 'tphcm', matt: '701' },
  { alias: 'tp hcmc', matt: '701' },
  { alias: 'hcmc', matt: '701' },
  { alias: 'hcm', matt: '701' },
  { alias: 'sài gòn', matt: '701' },
  { alias: 'sai gon', matt: '701' },
  { alias: 'saigon', matt: '701' },

  // TP. Hà Nội
  { alias: 'thành phố hà nội', matt: '101' },
  { alias: 'thanh pho ha noi', matt: '101' },
  { alias: 'tp hà nội', matt: '101' },
  { alias: 'tp ha noi', matt: '101' },
  { alias: 'hà nội', matt: '101' },
  { alias: 'ha noi', matt: '101' },

  // TP. Đà Nẵng
  { alias: 'thành phố đà nẵng', matt: '501' },
  { alias: 'thanh pho da nang', matt: '501' },
  { alias: 'tp đà nẵng', matt: '501' },
  { alias: 'tp da nang', matt: '501' },
  { alias: 'đà nẵng', matt: '501' },
  { alias: 'da nang', matt: '501' },

  // Bà Rịa - Vũng Tàu
  { alias: 'bà rịa vũng tàu', matt: '717' },
  { alias: 'ba ria vung tau', matt: '717' },
  { alias: 'bà rịa', matt: '717' },
  { alias: 'ba ria', matt: '717' },
  { alias: 'vũng tàu', matt: '717' },
  { alias: 'vung tau', matt: '717' },
  { alias: 'brvt', matt: '717' },

  // Bình Dương
  { alias: 'bình dương', matt: '711' },
  { alias: 'binh duong', matt: '711' },

  // Cần Thơ
  { alias: 'thành phố cần thơ', matt: '815' },
  { alias: 'thanh pho can tho', matt: '815' },
  { alias: 'tp cần thơ', matt: '815' },
  { alias: 'tp can tho', matt: '815' },
  { alias: 'cần thơ', matt: '815' },
  { alias: 'can tho', matt: '815' },

  // Hải Phòng
  { alias: 'thành phố hải phòng', matt: '103' },
  { alias: 'thanh pho hai phong', matt: '103' },
  { alias: 'tp hải phòng', matt: '103' },
  { alias: 'tp hai phong', matt: '103' },
  { alias: 'hải phòng', matt: '103' },
  { alias: 'hai phong', matt: '103' },

  // Thừa Thiên Huế / TP. Huế
  { alias: 'thừa thiên huế', matt: '411' },
  { alias: 'thua thien hue', matt: '411' },
  { alias: 'tp huế', matt: '411' },
  { alias: 'tp hue', matt: '411' },

  // Khánh Hòa / Nha Trang
  { alias: 'khánh hòa', matt: '511' },
  { alias: 'khanh hoa', matt: '511' },
  { alias: 'nha trang', matt: '511' },

  // Lâm Đồng / Đà Lạt
  { alias: 'lâm đồng', matt: '703' },
  { alias: 'lam dong', matt: '703' },
  { alias: 'đà lạt', matt: '703' },
  { alias: 'da lat', matt: '703' },

  // Quảng Ninh / Hạ Long
  { alias: 'quảng ninh', matt: '225' },
  { alias: 'quang ninh', matt: '225' },
  { alias: 'hạ long', matt: '225' },
  { alias: 'ha long', matt: '225' },

  // Bình Định / Quy Nhơn
  { alias: 'bình định', matt: '507' },
  { alias: 'binh dinh', matt: '507' },
  { alias: 'quy nhơn', matt: '507' },
  { alias: 'quy nhon', matt: '507' },

  // Đắk Lắk / Buôn Ma Thuột
  { alias: 'đắk lắk', matt: '605' },
  { alias: 'dak lak', matt: '605' },
  { alias: 'daklak', matt: '605' },
  { alias: 'buôn ma thuột', matt: '605' },
  { alias: 'buon ma thuot', matt: '605' },

  // Bình Thuận / Phan Thiết
  { alias: 'bình thuận', matt: '707' },
  { alias: 'binh thuan', matt: '707' },
  { alias: 'phan thiết', matt: '707' },
  { alias: 'phan thiet', matt: '707' }
];

async function initAddressMatcher(templateVnPath) {
  const provincesMap = new Map();

  // Prepopulate with known provinces
  for (const kp of KNOWN_PROVINCES) {
    provincesMap.set(kp.matt, {
      matt: kp.matt,
      tentt: kp.name,
      display: kp.display,
      cleanTentt: cleanText(kp.name)
    });
  }

  const wardsByMatt = new Map();

  if (templateVnPath) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(templateVnPath);

      const tinhThanhSheet = wb.getWorksheet('TINH_THANH');
      if (tinhThanhSheet) {
        tinhThanhSheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const matt = String(row.getCell(1).value || '').trim();
            const tentt = String(row.getCell(2).value || '').trim();
            const display = String(row.getCell(3).value || '').trim();
            if (matt && display) {
              provincesMap.set(matt, {
                matt,
                tentt: tentt || display,
                display,
                cleanTentt: cleanText(tentt || display)
              });
            }
          }
        });
      }

      const phuongXaSheet = wb.getWorksheet('PHUONG_XA');
      if (phuongXaSheet) {
        phuongXaSheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const ma = String(row.getCell(1).value || '').trim();
            const ten = String(row.getCell(2).value || '').trim();
            const matt = String(row.getCell(3).value || '').trim();
            const display = String(row.getCell(4).value || '').trim();
            if (ma && ten && display) {
              if (!wardsByMatt.has(matt)) {
                wardsByMatt.set(matt, []);
              }
              const cleanTen = cleanText(ten);
              const baseTen = cleanTen.replace(/^(phuong|xa|thi tran|dac khu)\s+/, '');
              wardsByMatt.get(matt).push({
                ma,
                ten,
                matt,
                display,
                cleanTen,
                paddedCleanTen: ` ${cleanTen} `,
                baseTen,
                paddedBaseTen: ` ${baseTen} `,
                baseLength: baseTen.length
              });
            }
          }
        });

        for (const [, list] of wardsByMatt.entries()) {
          list.sort((a, b) => b.cleanTen.length - a.cleanTen.length);
        }
      }
    } catch {
      // If template file cannot be loaded, fallback to KNOWN_PROVINCES
    }
  }

  // Build searchable terms list
  const searchTermsMap = new Map();

  function addSearchTerm(key, matt, display) {
    const cleanKey = cleanText(key);
    if (!cleanKey || cleanKey.length < 2) return;
    if (!searchTermsMap.has(cleanKey) || searchTermsMap.get(cleanKey).key.length < cleanKey.length) {
      searchTermsMap.set(cleanKey, {
        key: cleanKey,
        paddedKey: ` ${cleanKey} `,
        matt,
        display
      });
    }
  }

  // 1. Add from provincesMap
  for (const p of provincesMap.values()) {
    addSearchTerm(p.tentt, p.matt, p.display);
    addSearchTerm(p.cleanTentt, p.matt, p.display);
    const baseName = p.cleanTentt.replace(/^(tp|tinh|thanh pho)\s+/, '');
    if (baseName.length >= 2) {
      addSearchTerm(baseName, p.matt, p.display);
    }
  }

  // 2. Add from RAW_ALIASES
  for (const a of RAW_ALIASES) {
    const prov = provincesMap.get(a.matt);
    const display = prov ? prov.display : `${a.matt} - ${a.alias}`;
    addSearchTerm(a.alias, a.matt, display);
  }

  // Sort search terms by key length descending (longer, more specific names match first)
  const sortedSearchTerms = Array.from(searchTermsMap.values()).sort(
    (a, b) => b.key.length - a.key.length
  );

  function matchAddress(addressStr) {
    if (!addressStr) return { provinceDisplay: '', wardDisplay: '' };
    const cleanAddr = cleanText(addressStr);
    if (!cleanAddr) return { provinceDisplay: '', wardDisplay: '' };

    const paddedAddr = ` ${cleanAddr} `;

    let matchedMatt = '';
    let provinceDisplay = '';

    for (const term of sortedSearchTerms) {
      if (paddedAddr.includes(term.paddedKey)) {
        matchedMatt = term.matt;
        provinceDisplay = term.display;
        break;
      }
    }

    let wardDisplay = '';
    if (matchedMatt && wardsByMatt.has(matchedMatt)) {
      const wards = wardsByMatt.get(matchedMatt);
      for (const w of wards) {
        if (w.paddedCleanTen && paddedAddr.includes(w.paddedCleanTen)) {
          wardDisplay = w.display;
          break;
        }
        if (w.paddedBaseTen && w.baseLength >= 3 && paddedAddr.includes(w.paddedBaseTen)) {
          wardDisplay = w.display;
          break;
        }
      }
    }

    return { provinceDisplay, wardDisplay };
  }

  return { matchAddress };
}

module.exports = {
  cleanText,
  initAddressMatcher
};
