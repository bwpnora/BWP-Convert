// src/converter/administrativeMapping.js
// Centralized mapping dictionary for Vietnam administrative reforms (63 -> 34 Provinces and merged Wards/Districts)

const { cleanText } = require('./provinceMap');

// 1. Extra aliases for 63 old provinces / major cities / abbreviations -> 34 new province MATT
const OLD_PROVINCE_EXTRA_ALIASES = [
  // Hue (411)
  { alias: 'hue', matt: '411' },
  { alias: 'tp hue', matt: '411' },
  { alias: 'thanh pho hue', matt: '411' },
  { alias: 'thua thien hue', matt: '411' },
  { alias: 'tth', matt: '411' },

  // Hanoi (101)
  { alias: 'hn', matt: '101' },
  { alias: 'tp hn', matt: '101' },
  { alias: 'thu do ha noi', matt: '101' },

  // TP. Ho Chi Minh (701)
  { alias: 'hcm', matt: '701' },
  { alias: 'tphcm', matt: '701' },
  { alias: 'tp hcm', matt: '701' },
  { alias: 'sg', matt: '701' },
  { alias: 'sai gon', matt: '701' },
  { alias: 'tp ho chi minh', matt: '701' },
  { alias: 'thanh pho ho chi minh', matt: '701' },
  { alias: 'binh duong', matt: '701' },
  { alias: 'ba ria vung tau', matt: '701' },
  { alias: 'brvt', matt: '701' },
  { alias: 'ba ria', matt: '701' },
  { alias: 'vung tau', matt: '701' },

  // Hai Phong (103)
  { alias: 'hai duong', matt: '103' },
  { alias: 'hp', matt: '103' },

  // Ninh Binh (117)
  { alias: 'nam dinh', matt: '117' },
  { alias: 'ha nam', matt: '117' },

  // Bac Ninh (223)
  { alias: 'bac giang', matt: '223' },

  // Quang Tri (409)
  { alias: 'quang binh', matt: '409' },

  // Da Nang (501)
  { alias: 'quang nam', matt: '501' },
  { alias: 'dn', matt: '501' },
  { alias: 'tp da nang', matt: '501' },

  // Quang Ngai (505)
  { alias: 'binh dinh', matt: '505' },
  { alias: 'kon tum', matt: '505' },

  // Khanh Hoa (511)
  { alias: 'ninh thuan', matt: '511' },

  // Dak Lak (605)
  { alias: 'dak nong', matt: '605' },
  { alias: 'phu yen', matt: '605' },

  // Lam Dong (703)
  { alias: 'binh thuan', matt: '703' },

  // Tay Ninh (709)
  { alias: 'long an', matt: '709' },

  // Dong Nai (713)
  { alias: 'binh phuoc', matt: '713' },

  // Vinh Long (809)
  { alias: 'tien giang', matt: '809' },
  { alias: 'ben tre', matt: '809' },
  { alias: 'tra vinh', matt: '809' },

  // Can Tho (815)
  { alias: 'hau giang', matt: '815' },
  { alias: 'soc trang', matt: '815' },

  // Ca Mau (823)
  { alias: 'bac lieu', matt: '823' },
  { alias: 'kien giang', matt: '823' }
];

// 2. Merged Wards Dictionary: maps old ward names to consolidated new ward in Sheet PHUONG_XA
const MERGED_WARDS_BY_PROVINCE = {
  // TP. Ho Chi Minh (701)
  '701': [
    // District 1 old wards
    {
      aliases: ['nguyen thai binh', 'ben nghe', 'pham ngu lao', 'co giang', 'cau kho', 'nguyen cu trinh'],
      ward: { ma: '701926743', ten: 'Phường Bến Thành', matt: '701', display: '701926743 - Phường Bến Thành' }
    },
    {
      aliases: ['cau ong lanh'],
      ward: { ma: '701927393', ten: 'Phường Cầu Ông Lãnh', matt: '701', display: '701927393 - Phường Cầu Ông Lãnh' }
    },
    {
      aliases: ['da kao', 'tan dinh'],
      ward: { ma: '701927396', ten: 'Phường Tân Định', matt: '701', display: '701927396 - Phường Tân Định' }
    },
    // District 3 old wards
    {
      aliases: ['ban co', 'phuong ban co', 'phuong 1', 'phuong 2', 'phuong 3', 'phuong 4', 'phuong 5'],
      ward: { ma: '701926880', ten: 'Phường Bàn Cờ', matt: '701', display: '701926880 - Phường Bàn Cờ' }
    },
    {
      aliases: ['xuan hoa', 'phuong 6', 'phuong 7', 'phuong 8'],
      ward: { ma: '701927214', ten: 'Phường Xuân Hòa', matt: '701', display: '701927214 - Phường Xuân Hòa' }
    },
    {
      aliases: ['nhieu loc', 'phuong 9', 'phuong 10', 'phuong 11', 'phuong 12', 'phuong 13', 'phuong 14'],
      ward: { ma: '701927217', ten: 'Phường Nhiêu Lộc', matt: '701', display: '701927217 - Phường Nhiêu Lộc' }
    },
    // District 5 old wards
    {
      aliases: ['cho quan', 'phuong 1 q5', 'phuong 2 q5', 'phuong 3 q5', 'phuong 4 q5'],
      ward: { ma: '701926748', ten: 'Phường Chợ Quán', matt: '701', display: '701926748 - Phường Chợ Lớn' }
    },
    {
      aliases: ['an dong', 'phuong 5 q5', 'phuong 6 q5', 'phuong 7 q5', 'phuong 8 q5', 'phuong 9 q5'],
      ward: { ma: '701926750', ten: 'Phường An Đông', matt: '701', display: '701926750 - Phường An Đông' }
    },
    {
      aliases: ['cho lon', 'phuong 10 q5', 'phuong 11 q5', 'phuong 12 q5', 'phuong 13 q5', 'phuong 14 q5', 'phuong 15 q5'],
      ward: { ma: '701926752', ten: 'Phường Chợ Lớn', matt: '701', display: '701926752 - Phường Chợ Lớn' }
    },
    // District 11 old wards
    {
      aliases: ['binh thoi', 'phuong 14 q11', 'p14 q11', 'phuong 14', 'p14', 'phuong 11', 'phuong 13'],
      ward: { ma: '701927232', ten: 'Phường Bình Thới', matt: '701', display: '701927232 - Phường Bình Thới' }
    },
    // Tan Binh old wards
    {
      aliases: ['bay hien', 'phuong 11 tan binh', 'phuong 12 tan binh'],
      ward: { ma: '701927001', ten: 'Phường Bảy Hiền', matt: '701', display: '701927001 - Phường Bảy Hiền' }
    },
    {
      aliases: ['tan son', 'phuong 15 tan binh'],
      ward: { ma: '701927007', ten: 'Phường Tân Sơn', matt: '701', display: '701927007 - Phường Tân Sơn' }
    }
  ],

  // TP. Ha Noi (101)
  '101': [
    {
      aliases: ['hang bong', 'hang trong', 'cua dong', 'trang tien', 'dong xuan', 'hang ma', 'hang bac', 'hang buom', 'hang dao', 'hang gai', 'ly thai to', 'phan chu trinh'],
      ward: { ma: '101900070', ten: 'Phường Hoàn Kiếm', matt: '101', display: '101900070 - Phường Hoàn Kiếm' }
    },
    {
      aliases: ['my dinh 1', 'my dinh 2', 'me tri', 'my dinh', 'nam tu liem', 'bac tu liem', 'cau dien', 'tay mo', 'dai mo'],
      ward: { ma: '101900592', ten: 'Phường Từ Liêm', matt: '101', display: '101900592 - Phường Từ Liêm' }
    },
    {
      aliases: ['van mieu', 'quoc tu giam', 'van mieu quoc tu giam'],
      ward: { ma: '101900196', ten: 'Phường Văn Miếu - Quốc Tử Giám', matt: '101', display: '101900196 - Phường Văn Miếu - Quốc Tử Giám' }
    }
  ]
};

// 3. District Fallback Dictionary: maps old district names to representative new ward
const DISTRICT_FALLBACK_BY_PROVINCE = {
  '701': [
    { aliases: ['quan 1', 'q 1', 'q1', 'district 1'], ward: { ma: '701926743', ten: 'Phường Bến Thành', display: '701926743 - Phường Bến Thành' } },
    { aliases: ['quan 3', 'q 3', 'q3', 'district 3'], ward: { ma: '701926880', ten: 'Phường Bàn Cờ', display: '701926880 - Phường Bàn Cờ' } },
    { aliases: ['quan 4', 'q 4', 'q4', 'district 4'], ward: { ma: '701927399', ten: 'Phường Xóm Chiếu', display: '701927399 - Phường Xóm Chiếu' } },
    { aliases: ['quan 5', 'q 5', 'q5', 'district 5'], ward: { ma: '701926752', ten: 'Phường Chợ Lớn', display: '701926752 - Phường Chợ Lớn' } },
    { aliases: ['quan 6', 'q 6', 'q6', 'district 6'], ward: { ma: '701926755', ten: 'Phường Bình Tây', display: '701926755 - Phường Bình Tây' } },
    { aliases: ['quan 7', 'q 7', 'q7', 'district 7'], ward: { ma: '701927429', ten: 'Phường Tân Thuận', display: '701927429 - Phường Tân Thuận' } },
    { aliases: ['quan 8', 'q 8', 'q8', 'district 8'], ward: { ma: '701927447', ten: 'Phường Chánh Hưng', display: '701927447 - Phường Chánh Hưng' } },
    { aliases: ['quan 10', 'q 10', 'q10', 'district 10'], ward: { ma: '701927220', ten: 'Phường Hòa Hưng', display: '701927220 - Phường Hòa Hưng' } },
    { aliases: ['quan 11', 'q 11', 'q11', 'district 11'], ward: { ma: '701927232', ten: 'Phường Bình Thới', display: '701927232 - Phường Bình Thới' } },
    { aliases: ['quan 12', 'q 12', 'q12', 'district 12'], ward: { ma: '701926782', ten: 'Phường Tân Thới Hiệp', display: '701926782 - Phường Tân Thới Hiệp' } },
    { aliases: ['tan binh', 'q tan binh', 'quan tan binh'], ward: { ma: '701927004', ten: 'Phường Tân Bình', display: '701927004 - Phường Tân Bình' } },
    { aliases: ['tan phu', 'q tan phu', 'quan tan phu'], ward: { ma: '701927031', ten: 'Phường Tân Phú', display: '701927031 - Phường Tân Phú' } },
    { aliases: ['binh thanh', 'q binh thanh', 'quan binh thanh'], ward: { ma: '701926839', ten: 'Phường Bình Thạnh', display: '701926839 - Phường Bình Thạnh' } },
    { aliases: ['go vap', 'q go vap', 'quan go vap'], ward: { ma: '701926824', ten: 'Phường Gò Vấp', display: '701926824 - Phường Gò Vấp' } },
    { aliases: ['phu nhuan', 'q phu nhuan', 'quan phu nhuan'], ward: { ma: '701926851', ten: 'Phường Phú Nhuận', display: '701926851 - Phường Phú Nhuận' } },
    { aliases: ['binh tan', 'q binh tan', 'quan binh tan'], ward: { ma: '701927067', ten: 'Phường Bình Tân', display: '701927067 - Phường Bình Tân' } },
    { aliases: ['thu duc', 'tp thu duc', 'quan thu duc', 'quan 2', 'q2', 'quan 9', 'q9'], ward: { ma: '701926806', ten: 'Phường Thủ Đức', display: '701926806 - Phường Thủ Đức' } },
    { aliases: ['cu chi', 'huyen cu chi', 'h cu chi'], ward: { ma: '701927553', ten: 'Xã Củ Chi', display: '701927553 - Xã Củ Chi' } },
    { aliases: ['hoc mon', 'huyen hoc mon', 'h hoc mon'], ward: { ma: '701927559', ten: 'Xã Hóc Môn', display: '701927559 - Xã Hóc Môn' } },
    { aliases: ['binh chanh', 'huyen binh chanh', 'h binh chanh'], ward: { ma: '701927508', ten: 'Xã Bình Chánh', display: '701927508 - Xã Bình Chánh' } },
    { aliases: ['nha be', 'huyen nha be', 'h nha be'], ward: { ma: '701927622', ten: 'Xã Nhà Bè', display: '701927622 - Xã Nhà Bè' } },
    { aliases: ['can gio', 'huyen can gio', 'h can gio'], ward: { ma: '701927640', ten: 'Xã Cần Giờ', display: '701927640 - Xã Cần Giờ' } },
    // Binh Duong districts merged into 701
    { aliases: ['thu dau mot', 'tp thu dau mot'], ward: { ma: '701925766', ten: 'Phường Thủ Dầu Một', display: '701925766 - Phường Thủ Dầu Một' } },
    { aliases: ['di an', 'tp di an'], ward: { ma: '701925826', ten: 'Phường Dĩ An', display: '701925826 - Phường Dĩ An' } },
    { aliases: ['thuan an', 'tp thuan an'], ward: { ma: '701925814', ten: 'Phường Thuận An', display: '701925814 - Phường Thuận An' } },
    { aliases: ['ben cat', 'tx ben cat'], ward: { ma: '701925790', ten: 'Phường Bến Cát', display: '701925790 - Phường Bến Cát' } },
    { aliases: ['tan uyen', 'tx tan uyen'], ward: { ma: '701925841', ten: 'Phường Tân Uyên', display: '701925841 - Phường Tân Uyên' } },
    // Ba Ria Vung Tau districts merged into 701
    { aliases: ['vung tau', 'tp vung tau'], ward: { ma: '701926533', ten: 'Phường Vũng Tàu', display: '701926533 - Phường Vũng Tàu' } },
    { aliases: ['ba ria', 'tp ba ria'], ward: { ma: '701926563', ten: 'Phường Bà Rịa', display: '701926563 - Phường Bà Rịa' } },
    { aliases: ['con dao', 'huyen con dao'], ward: { ma: '701926732', ten: 'Đặc khu Côn Đảo', display: '701926732 - Đặc khu Côn Đảo' } }
  ],

  '101': [
    { aliases: ['hoan kiem', 'quan hoan kiem', 'q hoan kiem'], ward: { ma: '101900070', ten: 'Phường Hoàn Kiếm', display: '101900070 - Phường Hoàn Kiếm' } },
    { aliases: ['ba dinh', 'quan ba dinh', 'q ba dinh'], ward: { ma: '101900004', ten: 'Phường Ba Đình', display: '101900004 - Phường Ba Đình' } },
    { aliases: ['dong da', 'quan dong da', 'q dong da'], ward: { ma: '101900235', ten: 'Phường Đống Đa', display: '101900235 - Phường Đống Đa' } },
    { aliases: ['hai ba trung', 'quan hai ba trung', 'q hai ba trung'], ward: { ma: '101900256', ten: 'Phường Hai Bà Trưng', display: '101900256 - Phường Hai Bà Trưng' } },
    { aliases: ['cau giay', 'quan cau giay', 'q cau giay'], ward: { ma: '101900167', ten: 'Phường Cầu Giấy', display: '101900167 - Phường Cầu Giấy' } },
    { aliases: ['tay ho', 'quan tay ho', 'q tay ho'], ward: { ma: '101900103', ten: 'Phường Tây Hồ', display: '101900103 - Phường Tây Hồ' } },
    { aliases: ['tu liem', 'nam tu liem', 'bac tu liem', 'quan nam tu liem', 'quan bac tu liem'], ward: { ma: '101900592', ten: 'Phường Từ Liêm', display: '101900592 - Phường Từ Liêm' } },
    { aliases: ['gia lam', 'huyen gia lam', 'h gia lam'], ward: { ma: '101900565', ten: 'Xã Gia Lâm', display: '101900565 - Xã Gia Lâm' } }
  ]
};

// Flatten all province aliases sorted by length descending
const ALL_PROVINCE_ALIASES = OLD_PROVINCE_EXTRA_ALIASES
  .map(a => ({
    alias: cleanText(a.alias),
    paddedAlias: ` ${cleanText(a.alias)} `,
    matt: a.matt,
    rawAlias: a.alias
  }))
  .sort((a, b) => b.alias.length - a.alias.length);

function lookupMergedWard(matt, cleanWardName) {
  if (!matt || !cleanWardName) return null;
  const list = MERGED_WARDS_BY_PROVINCE[matt];
  if (!list) return null;

  const target = cleanText(cleanWardName);
  for (const item of list) {
    for (const alias of item.aliases) {
      const cleanAlias = cleanText(alias);
      if (target === cleanAlias || target.includes(cleanAlias)) {
        return item.ward;
      }
    }
  }
  return null;
}

function lookupDistrictFallback(matt, cleanDistrictName) {
  if (!matt || !cleanDistrictName) return null;
  const list = DISTRICT_FALLBACK_BY_PROVINCE[matt];
  if (!list) return null;

  const target = cleanText(cleanDistrictName);
  for (const item of list) {
    for (const alias of item.aliases) {
      const cleanAlias = cleanText(alias);
      if (target === cleanAlias || target.includes(cleanAlias)) {
        return item.ward;
      }
    }
  }
  return null;
}

module.exports = {
  OLD_PROVINCE_EXTRA_ALIASES,
  ALL_PROVINCE_ALIASES,
  MERGED_WARDS_BY_PROVINCE,
  DISTRICT_FALLBACK_BY_PROVINCE,
  lookupMergedWard,
  lookupDistrictFallback
};
