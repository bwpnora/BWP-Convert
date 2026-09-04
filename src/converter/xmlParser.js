const { XMLParser } = require('fast-xml-parser');

const COUNTRY_LOOKUP_MAP = {
  'CN': 'CHN - China',
  'CHINA': 'CHN - China',
  'KR': 'KOR - Korea (South)',
  'KOREA (SOUTH)': 'KOR - Korea (South)',
  'KOREA, REPUBLIC OF': 'KOR - Korea (South)',
  'TH': 'THA - Thailand',
  'THAILAND': 'THA - Thailand',
  'US': 'USA - United States of America',
  'USA': 'USA - United States of America',
  'UNITED STATES': 'USA - United States of America',
  'JP': 'JPN - Japan',
  'JAPAN': 'JPN - Japan',
  'VN': 'VNM - Viet Nam',
  'VNM': 'VNM - Viet Nam',
  'VIETNAM': 'VNM - Viet Nam',
  'VIET NAM': 'VNM - Viet Nam'
};

function normalizeName(nameFormula, first, last) {
  let raw = nameFormula || '';
  if (!raw && (first || last)) {
    raw = `${first || ''} ${last || ''}`.trim();
  }
  if (raw.includes(',')) {
    const parts = raw.split(',').map(p => p.trim());
    if (parts.length === 2) {
      raw = `${parts[1]} ${parts[0]}`;
    }
  }
  return raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

function normalizeDate(rawDate, defaultYearPrefix = '20') {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  const match = str.match(/^(\d{2})[-/](\d{2})[-/](\d{2})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${d}/${m}/${defaultYearPrefix}${y}`;
  }
  const match4 = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match4) {
    const [, d, m, y] = match4;
    return `${d}/${m}/${y}`;
  }
  return str;
}

function normalizeGender(g) {
  if (!g) return '';
  const val = String(g).trim().toUpperCase();
  if (val === 'M' || val === 'NAM') return 'M - Nam';
  if (val === 'F' || val === 'NỮ' || val === 'NU') return 'F - Nữ';
  return val;
}

function normalizeCountry(codeOrName) {
  if (!codeOrName) return '';
  const key = String(codeOrName).trim().toUpperCase();
  return COUNTRY_LOOKUP_MAP[key] || codeOrName;
}

function parsePoliceReport(xmlContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
    isArray: (name) => ['G_NATIONALITY', 'G_FIRST', 'Q_ID'].includes(name)
  });

  const parsed = parser.parse(xmlContent);
  const root = parsed.POLICE_REPORT2;
  if (!root) {
    throw new Error('Định dạng XML không hợp lệ (không tìm thấy POLICE_REPORT2)');
  }

  const natGroups = root.LIST_G_NATIONALITY?.G_NATIONALITY || [];
  const vnGuests = [];
  const foreignGuests = [];

  for (const gNat of natGroups) {
    const natCode = (gNat.NATIONALITY || '').trim();
    const natName = (gNat.NATIONALITY_NAME || '').trim();
    const guests = gNat.LIST_G_FIRST?.G_FIRST || [];

    for (const g of guests) {
      const countryDesc = (g.COUNTRY_DESCRIPTION || '').trim();
      const guestCountry = (g.GUEST_COUNTRY || '').trim();

      const qIds = g.LIST_Q_ID?.Q_ID || [];
      const primaryId = qIds[0] || {};
      const idType = (primaryId.ID_TYPE || '').trim().toUpperCase();
      const idNumber = (primaryId.ID_NUMBER || '').trim();

      const fullName = normalizeName(g.NAME_FORMULA, g.FIRST, g.LAST);
      const arrival = normalizeDate(g.TO_CHAR_RGV_TRUNC_ARRIVAL_PMS_);
      const departure = normalizeDate(g.TO_CHAR_RGV_TRUNC_DEPARTURE_PM);
      const dob = normalizeDate(g.BIRTH_DATE);
      const gender = normalizeGender(g.GENDER);
      const room = String(g.ROOM || '').trim();
      const address = [g.ADDRESS1, g.CITY].filter(Boolean).map(s => String(s).trim()).join(', ');
      const visaNumber = (g.VISA_NUMBER || '').trim();
      const visaExp = normalizeDate(g.VISA_EXPIRATION_DATE);
      const status = (g.RESV_STATUS || '').trim();

      const isVNExplicit = ['VN', 'VNM'].includes(natCode.toUpperCase()) ||
                           ['VN', 'VNM'].includes(guestCountry.toUpperCase()) ||
                           countryDesc.toLowerCase().includes('vietnam');

      const isUnknown = natCode.toUpperCase() === 'UNKNOWN' || !natCode;
      const isVnFallback = isUnknown && idType === 'ID';

      const guestObj = {
        name: fullName,
        room,
        arrival,
        departure,
        dob,
        gender,
        idType,
        idNumber,
        address,
        visaNumber,
        visaExp,
        status
      };

      if (isVNExplicit || isVnFallback) {
        guestObj.nationalityCode = 'VNM - Viet Nam';
        guestObj.idTypeDisplay = idType === 'PASSPORT' ? '4 - Hộ chiếu' : '8 - Thẻ Căn Cước';
        vnGuests.push(guestObj);
      } else {
        const rawCountry = natCode && natCode.toUpperCase() !== 'UNKNOWN' ? natCode : (guestCountry || countryDesc || natCode);
        guestObj.nationalityCode = normalizeCountry(rawCountry);
        foreignGuests.push(guestObj);
      }
    }
  }

  return {
    total: vnGuests.length + foreignGuests.length,
    vnGuests,
    foreignGuests
  };
}

module.exports = {
  parsePoliceReport,
  normalizeName,
  normalizeDate,
  normalizeGender,
  normalizeCountry
};