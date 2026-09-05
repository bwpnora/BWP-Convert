const ExcelJS = require('exceljs');
const { cleanText, matchProvinceFromText, PROVINCE_34_MAP } = require('./provinceMap');

const VOWEL_MAP = {
  a: '[aàáảãạăằắẳẵặâầấẩẫậ]',
  e: '[eèéẻẽẹêềếểễệ]',
  i: '[iìíỉĩị]',
  o: '[oòóỏõọôồốổỗộơờớởỡợ]',
  u: '[uùúủũụưừứửữự]',
  y: '[yỳýỷỹỵ]',
  d: '[dđ]'
};

function makeDiacriticRegexPattern(text) {
  const clean = cleanText(text);
  if (!clean) return '';
  return clean
    .split('')
    .map(ch => {
      if (VOWEL_MAP[ch]) return VOWEL_MAP[ch] + '[.]?';
      if (/\s/.test(ch)) return '[\\s.,/–-]+';
      return ch.replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&') + '[.]?';
    })
    .join('');
}

function extractDetailedAddress(rawAddress, matchedProvAlias, matchedWardTen) {
  if (!rawAddress) return '';
  if (!matchedProvAlias && !matchedWardTen) {
    return rawAddress;
  }
  let detail = rawAddress;

  // Helper to remove matched pattern case-insensitively and diacritic-insensitively
  function removeFragment(str, frag) {
    if (!frag || frag.length < 2) return str;
    const cleanFrag = cleanText(frag);
    const diacriticPat = makeDiacriticRegexPattern(cleanFrag);

    const escapedFrag = frag.replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&');
    const escapedCleanFrag = cleanFrag.replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&');

    const patterns = [escapedFrag, escapedCleanFrag];
    if (diacriticPat && diacriticPat !== escapedCleanFrag && diacriticPat !== escapedFrag) {
      patterns.push(diacriticPat);
    }

    const regex = new RegExp(`(^|[-.,\\s/–])(${patterns.join('|')})([-.,\\s/–]|$)`, 'gi');
    return str.replace(regex, '$1$3');
  }

  if (matchedProvAlias) {
    detail = removeFragment(detail, matchedProvAlias);
  }
  if (matchedWardTen) {
    detail = removeFragment(detail, matchedWardTen);
    const baseWard = matchedWardTen.replace(/^(phường|xã|đặc khu|thị trấn)\s+/i, '');
    detail = removeFragment(detail, baseWard);
  }

  // Also clean common residual keywords (TP, Tỉnh, Huyện, Quận, Việt Nam)
  for (let i = 0; i < 2; i++) {
    detail = detail
      .replace(/(^|[-,\s/–])(thành phố|tỉnh|quận|huyện|thị xã|thị trấn|tp\.|tp|q\.|q|h\.|h|tx\.|tx|tt\.|tt|việt nam|viet nam|vn)\s*(?=[-,\s/–.]|$)/gi, '$1')
      .replace(/(^|[-,\s])(thành phố|tỉnh|quận|huyện|thị xã|tp\.|tp|q\.|q|h\.|h)\s*[\w\d\s]*/gi, (match) => {
        // If it looks like a dangling administrative label at the end, strip it
        if (/^(,\s*)?(thành phố|tỉnh|quận|huyện|thị xã|tp|q|h)\s+/i.test(match.trim())) {
          return ' ';
        }
        return match;
      })
      .replace(/,\s*,/g, ',')
      .replace(/^[-,\s/–.]+/, '')
      .replace(/[-,\s/–.]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return detail || rawAddress.trim();
}

async function initAddressMatcher(templateVnPath) {
  const wardsByMatt = new Map();
  const allUniqueWards = [];

  if (templateVnPath) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(templateVnPath);

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
              const wardObj = {
                ma,
                ten,
                matt,
                display,
                cleanTen,
                paddedCleanTen: ` ${cleanTen} `,
                baseTen,
                paddedBaseTen: ` ${baseTen} `,
                baseLength: baseTen.length
              };
              wardsByMatt.get(matt).push(wardObj);
              allUniqueWards.push(wardObj);
            }
          }
        });

        for (const [, list] of wardsByMatt.entries()) {
          list.sort((a, b) => b.cleanTen.length - a.cleanTen.length);
        }
      }
    } catch {
      // Fallback gracefully
    }
  }

  function matchAddress(rawAddress) {
    if (!rawAddress) {
      return { provinceDisplay: '', wardDisplay: '', addressDetail: '', rawAddress: '' };
    }

    const cleanAddr = cleanText(rawAddress);
    if (!cleanAddr) {
      return { provinceDisplay: '', wardDisplay: '', addressDetail: rawAddress, rawAddress };
    }

    const paddedAddr = ` ${cleanAddr} `;

    // 1. Province Match
    const provMatch = matchProvinceFromText(cleanAddr);
    let matchedMatt = provMatch ? provMatch.matt : '';
    let provinceDisplay = provMatch ? provMatch.display : '';
    let matchedProvAlias = provMatch ? provMatch.rawAlias : '';

    // 2. Ward Match
    let matchedWardObj = null;
    if (matchedMatt && wardsByMatt.has(matchedMatt)) {
      const wards = wardsByMatt.get(matchedMatt);
      for (const w of wards) {
        if (w.paddedCleanTen && paddedAddr.includes(w.paddedCleanTen)) {
          matchedWardObj = w;
          break;
        }
        if (w.paddedBaseTen && w.baseLength >= 3 && paddedAddr.includes(w.paddedBaseTen)) {
          matchedWardObj = w;
          break;
        }
      }
    } else if (!matchedMatt) {
      // Reverse search across distinctive wards
      for (const w of allUniqueWards) {
        if (w.baseLength >= 5 && paddedAddr.includes(w.paddedBaseTen)) {
          matchedWardObj = w;
          matchedMatt = w.matt;
          const p = PROVINCE_34_MAP.get(w.matt);
          provinceDisplay = p ? p.display : `${w.matt}`;
          break;
        }
      }
    }

    const wardDisplay = matchedWardObj ? matchedWardObj.display : '';
    const matchedWardTen = matchedWardObj ? matchedWardObj.ten : '';

    // 3. Extract Detailed Address (Column 13)
    const addressDetail = extractDetailedAddress(rawAddress, matchedProvAlias, matchedWardTen);

    return {
      provinceDisplay,
      wardDisplay,
      addressDetail,
      rawAddress
    };
  }

  return { matchAddress, extractDetailedAddress };
}

module.exports = {
  cleanText,
  initAddressMatcher,
  extractDetailedAddress
};
