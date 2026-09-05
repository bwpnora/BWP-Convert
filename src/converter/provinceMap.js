// src/converter/provinceMap.js
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

const PROVINCE_34_LIST = [
  { matt: '101', name: 'Hà Nội', tentt: 'Hà Nội', display: '101 - TP. Hà Nội' },
  { matt: '103', name: 'Hải Phòng', tentt: 'Hải Phòng', display: '103 - TP. Hải Phòng' },
  { matt: '109', name: 'Hưng Yên', tentt: 'Hưng Yên', display: '109 - Hưng Yên' },
  { matt: '117', name: 'Ninh Bình', tentt: 'Ninh Bình', display: '117 - Ninh Bình' },
  { matt: '203', name: 'Cao Bằng', tentt: 'Cao Bằng', display: '203 - Cao Bằng' },
  { matt: '205', name: 'Lào Cai', tentt: 'Lào Cai', display: '205 - Lào Cai' },
  { matt: '209', name: 'Lạng Sơn', tentt: 'Lạng Sơn', display: '209 - Lạng Sơn' },
  { matt: '211', name: 'Tuyên Quang', tentt: 'Tuyên Quang', display: '211 - Tuyên Quang' },
  { matt: '215', name: 'Thái Nguyên', tentt: 'Thái Nguyên', display: '215 - Thái Nguyên' },
  { matt: '217', name: 'Phú Thọ', tentt: 'Phú Thọ', display: '217 - Phú Thọ' },
  { matt: '223', name: 'Bắc Ninh', tentt: 'Bắc Ninh', display: '223 - Bắc Ninh' },
  { matt: '225', name: 'Quảng Ninh', tentt: 'Quảng Ninh', display: '225 - Quảng Ninh' },
  { matt: '301', name: 'Lai Châu', tentt: 'Lai Châu', display: '301 - Lai Châu' },
  { matt: '302', name: 'Điện Biên', tentt: 'Điện Biên', display: '302 - Điện Biên' },
  { matt: '303', name: 'Sơn La', tentt: 'Sơn La', display: '303 - Sơn La' },
  { matt: '401', name: 'Thanh Hóa', tentt: 'Thanh Hóa', display: '401 - Thanh Hóa' },
  { matt: '403', name: 'Nghệ An', tentt: 'Nghệ An', display: '403 - Nghệ An' },
  { matt: '405', name: 'Hà Tĩnh', tentt: 'Hà Tĩnh', display: '405 - Hà Tĩnh' },
  { matt: '409', name: 'Quảng Trị', tentt: 'Quảng Trị', display: '409 - Quảng Trị' },
  { matt: '411', name: 'Huế', tentt: 'Huế', display: '411 - TP. Huế' },
  { matt: '501', name: 'Đà Nẵng', tentt: 'Đà Nẵng', display: '501 - TP. Đà Nẵng' },
  { matt: '505', name: 'Quảng Ngãi', tentt: 'Quảng Ngãi', display: '505 - Quảng Ngãi' },
  { matt: '511', name: 'Khánh Hòa', tentt: 'Khánh Hòa', display: '511 - Khánh Hòa' },
  { matt: '603', name: 'Gia Lai', tentt: 'Gia Lai', display: '603 - Gia Lai' },
  { matt: '605', name: 'Đắk Lắk', tentt: 'Đắk Lắk', display: '605 - Đắk Lắk' },
  { matt: '701', name: 'Hồ Chí Minh', tentt: 'Hồ Chí Minh', display: '701 - TP. Hồ Chí Minh' },
  { matt: '703', name: 'Lâm Đồng', tentt: 'Lâm Đồng', display: '703 - Lâm Đồng' },
  { matt: '709', name: 'Tây Ninh', tentt: 'Tây Ninh', display: '709 - Tây Ninh' },
  { matt: '713', name: 'Đồng Nai', tentt: 'Đồng Nai', display: '713 - Đồng Nai' },
  { matt: '803', name: 'Đồng Tháp', tentt: 'Đồng Tháp', display: '803 - Đồng Tháp' },
  { matt: '805', name: 'An Giang', tentt: 'An Giang', display: '805 - An Giang' },
  { matt: '809', name: 'Vĩnh Long', tentt: 'Vĩnh Long', display: '809 - Vĩnh Long' },
  { matt: '815', name: 'Cần Thơ', tentt: 'Cần Thơ', display: '815 - TP. Cần Thơ' },
  { matt: '823', name: 'Cà Mau', tentt: 'Cà Mau', display: '823 - Cà Mau' }
];

const PROVINCE_34_MAP = new Map(PROVINCE_34_LIST.map(p => [p.matt, p]));

const RAW_PROVINCE_ALIASES = [
  // TP. Ho Chi Minh (701) - Includes BRVT, Binh Duong
  { alias: 'thanh pho ho chi minh', matt: '701' },
  { alias: 'tp ho chi minh', matt: '701' },
  { alias: 'ho chi minh', matt: '701' },
  { alias: 'tp hcm', matt: '701' },
  { alias: 'tphcm', matt: '701' },
  { alias: 'sai gon', matt: '701' },
  { alias: 'saigon', matt: '701' },
  { alias: 'ba ria vung tau', matt: '701' },
  { alias: 'ba ria', matt: '701' },
  { alias: 'vung tau', matt: '701' },
  { alias: 'brvt', matt: '701' },
  { alias: 'binh duong', matt: '701' },
  { alias: 'thu dau mot', matt: '701' },
  { alias: 'di an', matt: '701' },
  { alias: 'thuan an', matt: '701' },
  { alias: 'ben cat', matt: '701' },
  { alias: 'tan uyen', matt: '701' },
  { alias: 'dau tieng', matt: '701' },
  { alias: 'con dao', matt: '701' },

  // Ha Noi (101)
  { alias: 'thanh pho ha noi', matt: '101' },
  { alias: 'tp ha noi', matt: '101' },
  { alias: 'ha noi', matt: '101' },
  { alias: 'ha tay', matt: '101' },

  // Hai Phong (103) - Includes Hai Duong
  { alias: 'thanh pho hai phong', matt: '103' },
  { alias: 'tp hai phong', matt: '103' },
  { alias: 'hai phong', matt: '103' },
  { alias: 'hai duong', matt: '103' },
  { alias: 'chi linh', matt: '103' },

  // Hung Yen (109) - Includes Thai Binh
  { alias: 'hung yen', matt: '109' },
  { alias: 'thai binh', matt: '109' },

  // Ninh Binh (117) - Includes Nam Dinh, Ha Nam
  { alias: 'ninh binh', matt: '117' },
  { alias: 'nam dinh', matt: '117' },
  { alias: 'ha nam', matt: '117' },
  { alias: 'phu ly', matt: '117' },

  // Cao Bang (203)
  { alias: 'cao bang', matt: '203' },

  // Lao Cai (205) - Includes Yen Bai
  { alias: 'lao cai', matt: '205' },
  { alias: 'yen bai', matt: '205' },

  // Lang Son (209)
  { alias: 'lang son', matt: '209' },

  // Tuyen Quang (211) - Includes Ha Giang
  { alias: 'tuyen quang', matt: '211' },
  { alias: 'ha giang', matt: '211' },

  // Thai Nguyen (215) - Includes Bac Kan
  { alias: 'thai nguyen', matt: '215' },
  { alias: 'bac kan', matt: '215' },
  { alias: 'bac can', matt: '215' },

  // Phu Tho (217) - Includes Vinh Phuc, Hoa Binh
  { alias: 'phu tho', matt: '217' },
  { alias: 'vinh phuc', matt: '217' },
  { alias: 'vinh yen', matt: '217' },
  { alias: 'phuc yen', matt: '217' },
  { alias: 'hoa binh', matt: '217' },

  // Bac Ninh (223) - Includes Bac Giang
  { alias: 'bac ninh', matt: '223' },
  { alias: 'bac giang', matt: '223' },

  // Quang Ninh (225)
  { alias: 'quang ninh', matt: '225' },
  { alias: 'ha long', matt: '225' },
  { alias: 'cam pha', matt: '225' },
  { alias: 'uong bi', matt: '225' },
  { alias: 'mong cai', matt: '225' },

  // Lai Chau (301)
  { alias: 'lai chau', matt: '301' },

  // Dien Bien (302)
  { alias: 'dien bien', matt: '302' },
  { alias: 'dien bien phu', matt: '302' },

  // Son La (303)
  { alias: 'son la', matt: '303' },

  // Thanh Hoa (401)
  { alias: 'thanh hoa', matt: '401' },
  { alias: 'sam son', matt: '401' },
  { alias: 'bim son', matt: '401' },

  // Nghe An (403)
  { alias: 'thanh pho vinh', matt: '403' },
  { alias: 'tp vinh', matt: '403' },
  { alias: 'nghe an', matt: '403' },
  { alias: 'cua lo', matt: '403' },

  // Ha Tinh (405)
  { alias: 'ha tinh', matt: '405' },

  // Quang Tri (409) - Includes Quang Binh
  { alias: 'quang tri', matt: '409' },
  { alias: 'dong ha', matt: '409' },
  { alias: 'quang binh', matt: '409' },
  { alias: 'dong hoi', matt: '409' },

  // Hue (411)
  { alias: 'thua thien hue', matt: '411' },
  { alias: 'thanh pho hue', matt: '411' },
  { alias: 'tp hue', matt: '411' },

  // Da Nang (501)
  { alias: 'thanh pho da nang', matt: '501' },
  { alias: 'tp da nang', matt: '501' },
  { alias: 'da nang', matt: '501' },
  { alias: 'quang nam', matt: '501' },

  // Quang Ngai (505) - Includes Kon Tum, Binh Dinh
  { alias: 'quang ngai', matt: '505' },
  { alias: 'kon tum', matt: '505' },
  { alias: 'binh dinh', matt: '505' },
  { alias: 'thanh pho quy nhon', matt: '505' },
  { alias: 'tp quy nhon', matt: '505' },
  { alias: 'quy nhon', matt: '505' },

  // Khanh Hoa (511) - Includes Ninh Thuan
  { alias: 'khanh hoa', matt: '511' },
  { alias: 'nha trang', matt: '511' },
  { alias: 'cam ranh', matt: '511' },
  { alias: 'ninh thuan', matt: '511' },
  { alias: 'phan rang', matt: '511' },

  // Gia Lai (603)
  { alias: 'gia lai', matt: '603' },
  { alias: 'pleiku', matt: '603' },

  // Dak Lak (605) - Includes Dak Nong, Phu Yen
  { alias: 'dak lak', matt: '605' },
  { alias: 'daklak', matt: '605' },
  { alias: 'buon ma thuot', matt: '605' },
  { alias: 'dak nong', matt: '605' },
  { alias: 'phu yen', matt: '605' },
  { alias: 'tuy hoa', matt: '605' },

  // Lam Dong (703) - Includes Binh Thuan
  { alias: 'lam dong', matt: '703' },
  { alias: 'da lat', matt: '703' },
  { alias: 'bao loc', matt: '703' },
  { alias: 'binh thuan', matt: '703' },
  { alias: 'phan thiet', matt: '703' },

  // Tay Ninh (709) - Includes Long An
  { alias: 'tay ninh', matt: '709' },
  { alias: 'long an', matt: '709' },
  { alias: 'tan an', matt: '709' },

  // Dong Nai (713) - Includes Binh Phuoc
  { alias: 'dong nai', matt: '713' },
  { alias: 'bien hoa', matt: '713' },
  { alias: 'long khanh', matt: '713' },
  { alias: 'binh phuoc', matt: '713' },
  { alias: 'dong xoai', matt: '713' },

  // Dong Thap (803)
  { alias: 'dong thap', matt: '803' },
  { alias: 'cao lanh', matt: '803' },
  { alias: 'sa dec', matt: '803' },

  // An Giang (805)
  { alias: 'an giang', matt: '805' },
  { alias: 'long xuyen', matt: '805' },
  { alias: 'chau doc', matt: '805' },

  // Vinh Long (809) - Includes Tien Giang, Ben Tre, Tra Vinh
  { alias: 'vinh long', matt: '809' },
  { alias: 'tien giang', matt: '809' },
  { alias: 'my tho', matt: '809' },
  { alias: 'ben tre', matt: '809' },
  { alias: 'tra vinh', matt: '809' },

  // Can Tho (815) - Includes Hau Giang, Soc Trang
  { alias: 'can tho', matt: '815' },
  { alias: 'hau giang', matt: '815' },
  { alias: 'vi thanh', matt: '815' },
  { alias: 'soc trang', matt: '815' },

  // Ca Mau (823) - Includes Bac Lieu, Kien Giang
  { alias: 'ca mau', matt: '823' },
  { alias: 'bac lieu', matt: '823' },
  { alias: 'kien giang', matt: '823' },
  { alias: 'rach gia', matt: '823' },
  { alias: 'phu quoc', matt: '823' },
  { alias: 'ha tien', matt: '823' }
];

// Sort aliases descending by length for priority matching
const SORTED_ALIASES = RAW_PROVINCE_ALIASES
  .map(a => ({
    alias: cleanText(a.alias),
    paddedAlias: ` ${cleanText(a.alias)} `,
    matt: a.matt,
    rawAlias: a.alias
  }))
  .sort((a, b) => b.alias.length - a.alias.length);

const PROVINCE_63_TO_34_ALIASES = SORTED_ALIASES;

function matchProvinceFromText(cleanAddressStr) {
  if (!cleanAddressStr) return null;
  const cleaned = cleanText(cleanAddressStr);
  if (!cleaned) return null;
  const padded = ` ${cleaned} `;

  for (const item of SORTED_ALIASES) {
    if (padded.includes(item.paddedAlias)) {
      const prov = PROVINCE_34_MAP.get(item.matt);
      return {
        matt: item.matt,
        display: prov ? prov.display : `${item.matt} - ${item.alias}`,
        matchedAlias: item.alias,
        rawAlias: item.rawAlias
      };
    }
  }

  return null;
}

module.exports = {
  cleanText,
  PROVINCE_34_LIST,
  PROVINCE_34_MAP,
  SORTED_ALIASES,
  PROVINCE_63_TO_34_ALIASES,
  matchProvinceFromText
};
