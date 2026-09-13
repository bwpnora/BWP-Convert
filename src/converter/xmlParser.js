const { XMLParser } = require('fast-xml-parser');

const COUNTRY_LOOKUP_MAP = {
  'CN': 'CHN - China',
  'CHN': 'CHN - China',
  'CHINA': 'CHN - China',
  'KR': 'KOR - Korea (South)',
  'KOR': 'KOR - Korea (South)',
  'KOREA (SOUTH)': 'KOR - Korea (South)',
  'KOREA, REPUBLIC OF': 'KOR - Korea (South)',
  'TH': 'THA - Thailand',
  'THA': 'THA - Thailand',
  'THAILAND': 'THA - Thailand',
  'US': 'USA - United States of America',
  'USA': 'USA - United States of America',
  'UNITED STATES': 'USA - United States of America',
  'JP': 'JPN - Japan',
  'JPN': 'JPN - Japan',
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
  return raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

function normalizeDate(rawDate, defaultYearPrefix = '20', separator = '/') {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  const matchIso = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (matchIso) {
    const [, y, m, d] = matchIso;
    return `${d}${separator}${m}${separator}${y}`;
  }
  const match = str.match(/^(\d{2})[-/](\d{2})[-/](\d{2})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${d}${separator}${m}${separator}${defaultYearPrefix}${y}`;
  }
  const match4 = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match4) {
    const [, d, m, y] = match4;
    return `${d}${separator}${m}${separator}${y}`;
  }
  return str;
}

function normalizeBirthDate(rawDate, idNumber = '', separator = '/') {
  if (!rawDate) return '';
  const str = String(rawDate).trim();

  const matchIso = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (matchIso) {
    const [, y, m, d] = matchIso;
    return `${d}${separator}${m}${separator}${y}`;
  }

  const match4 = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match4) {
    const [, d, m, y] = match4;
    return `${d}${separator}${m}${separator}${y}`;
  }

  const match2 = str.match(/^(\d{2})[-/](\d{2})[-/](\d{2})$/);
  if (match2) {
    const [, d, m, y] = match2;
    let yearPrefix = '19';
    const cleanId = String(idNumber || '').trim();
    const numY = parseInt(y, 10);
    const currentYear = new Date().getFullYear();

    if (/^\d{12}$/.test(cleanId) && cleanId.slice(4, 6) === y) {
      const centuryCode = cleanId[3];
      if (['0', '1'].includes(centuryCode)) {
        yearPrefix = '19';
      } else if (['2', '3'].includes(centuryCode)) {
        yearPrefix = '20';
      } else if (['8', '9'].includes(centuryCode)) {
        yearPrefix = '18';
      } else if (['4', '5'].includes(centuryCode)) {
        yearPrefix = '21';
      }
    } else {
      if (2000 + numY > currentYear) {
        yearPrefix = '19';
      } else {
        yearPrefix = '20';
      }
    }

    return `${d}${separator}${m}${separator}${yearPrefix}${y}`;
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

const { normalizeForeignCountry } = require('./countryMap');

function normalizeCountry(codeOrName) {
  if (!codeOrName) return '';
  return normalizeForeignCountry(codeOrName);
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
      const dob = normalizeBirthDate(g.BIRTH_DATE, idNumber, '/');
      const gender = normalizeGender(g.GENDER);
      const room = String(g.ROOM || '').trim();
      const address = [g.ADDRESS1, g.CITY].filter(Boolean).map(s => String(s).trim()).join(', ');
      const visaNumber = (g.VISA_NUMBER || '').trim();
      const visaExp = normalizeDate(g.VISA_EXPIRATION_DATE, '20', '/');
      const status = (g.RESV_STATUS || '').trim();

      const isVNExplicit = ['VN', 'VNM'].includes(natCode.toUpperCase()) ||
                           ['VN', 'VNM'].includes(guestCountry.toUpperCase()) ||
                           countryDesc.toLowerCase().includes('vietnam');

      const isForeignExplicit = (natCode && !['VN', 'VNM', 'UNKNOWN'].includes(natCode.toUpperCase())) ||
                                (guestCountry && !['VN', 'VNM'].includes(guestCountry.toUpperCase())) ||
                                (countryDesc && !['vietnam'].includes(countryDesc.toLowerCase()));

      const isUnknown = (natCode.toUpperCase() === 'UNKNOWN' || !natCode) && !isForeignExplicit;
      const isVnFallback = isUnknown && (idType === 'ID' || !idType || qIds.length === 0);

      const guestObj = {
        name: fullName,
        room,
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
        guestObj.arrival = normalizeDate(g.TO_CHAR_RGV_TRUNC_ARRIVAL_PMS_, '20', '/');
        guestObj.departure = normalizeDate(g.TO_CHAR_RGV_TRUNC_DEPARTURE_PM, '20', '/');
        guestObj.nationalityCode = 'VNM - Viet Nam';
        guestObj.idTypeDisplay = idType === 'PASSPORT' ? '4 - Hộ chiếu' : '8 - Thẻ Căn Cước';
        vnGuests.push(guestObj);
      } else {
        guestObj.arrival = normalizeDate(g.TO_CHAR_RGV_TRUNC_ARRIVAL_PMS_, '20', '/');
        guestObj.departure = normalizeDate(g.TO_CHAR_RGV_TRUNC_DEPARTURE_PM, '20', '/');
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
  normalizeBirthDate,
  normalizeGender,
  normalizeCountry,
  COUNTRY_LOOKUP_MAP
};