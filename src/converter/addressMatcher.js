const path = require('path');
const ExcelJS = require('exceljs');
const { cleanText, matchProvinceFromText, PROVINCE_34_MAP } = require('./provinceMap');

const MATCHER_CACHE = new Map();

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
    const baseWard = matchedWardTen.replace(/^(phường|xã|đặc khu|thị trấn|phuong|xa|dac khu|thi tran)\s+/i, '');
    detail = removeFragment(detail, baseWard);
  }

  // 1. Compound administrative district/city patterns (e.g. "Quận 1", "Q.1", "Q. 1", "Q1", "Huyện Củ Chi", "H. Củ Chi")
  // Constrain district name match to {1,3} words: (\d+|[\p{L}\d]+(?:\s+[\p{L}\d]+){0,2})
  detail = detail
    .replace(/(^|[-,\/–])\s*(quận|huyện|thị xã|tx\.|thành phố|tp\.|tỉnh)\s+(\d+|[\p{L}\d]+(?:\s+[\p{L}\d]+){0,2})(?=[-,\s/–.]|$)/gui, '$1')
    .replace(/(^|[-,\/–])\s*(q\.|h\.|tx\.|tp\.)\s*(\d+|[\p{L}\d]+(?:\s+[\p{L}\d]+){0,2})(?=[-,\s/–.]|$)/gui, '$1')
    .replace(/(^|[-,\s\/–])\s*(quận|huyện|q\.|q)\s*(\d+)(?=[-,\s/–.]|$)/gui, '$1')
    .replace(/(^|[-,\s\/–])\s*(h\.)\s*(\d+)(?=[-,\s/–.]|$)/gui, '$1');

  // 2. Clean dangling residual administrative keywords at boundaries
  // Add phường, xã, p\., x\. (requiring dot or word boundary so single-letter lots like Lô P, Lô X are preserved)
  for (let i = 0; i < 2; i++) {
    detail = detail
      .replace(
        /(^|[-,\s/–])(thành phố|thanh pho|tỉnh|tinh|quận|quan|huyện|huyen|thị xã|thi xa|thị trấn|thi tran|phường|phuong|xã|xa|tp\.|tp|q\.|h\.|tx\.|tx|tt\.|tt|p\.|x\.|việt nam|viet nam|vn)\s*(?=[-,\s/–.]|$)/gi,
        '$1'
      )
      .replace(/,\s*,/g, ',')
      .replace(/^[-,\s/–.]+/, '')
      .replace(/[-,\s/–.]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return detail || rawAddress.trim();
}

async function initAddressMatcher(templateVnPath) {
  const resolvedKey = templateVnPath ? path.resolve(templateVnPath) : '';
  if (resolvedKey && MATCHER_CACHE.has(resolvedKey)) {
    return MATCHER_CACHE.get(resolvedKey).matcher;
  }

  const wardsByMatt = new Map();
  const allUniqueWards = [];
  const distinctiveWards = [];

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

        // Count how many distinct matt each ward's baseTen belongs to
        const baseTenToMatts = new Map();
        for (const w of allUniqueWards) {
          if (!baseTenToMatts.has(w.baseTen)) {
            baseTenToMatts.set(w.baseTen, new Set());
          }
          baseTenToMatts.get(w.baseTen).add(w.matt);
        }

        // Create distinctiveWards: ONLY wards whose baseTen appears in exactly 1 province (mattCount === 1) and baseLength >= 4
        for (const w of allUniqueWards) {
          const matts = baseTenToMatts.get(w.baseTen);
          if (matts && matts.size === 1 && w.baseLength >= 4) {
            distinctiveWards.push(w);
          }
        }
        distinctiveWards.sort((a, b) => b.baseLength - a.baseLength);
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
      // Reverse search across distinctive wards (only unique to 1 province and baseLength >= 4)
      for (const w of distinctiveWards) {
        if (w.paddedCleanTen && paddedAddr.includes(w.paddedCleanTen)) {
          matchedWardObj = w;
          matchedMatt = w.matt;
          const p = PROVINCE_34_MAP.get(w.matt);
          provinceDisplay = p ? p.display : `${w.matt}`;
          break;
        }
        if (paddedAddr.includes(w.paddedBaseTen)) {
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

  const matcher = { matchAddress, extractDetailedAddress };
  if (resolvedKey) {
    MATCHER_CACHE.set(resolvedKey, {
      wardsByMatt,
      distinctiveWards,
      matcher,
      matchAddress,
      extractDetailedAddress
    });
  }

  return matcher;
}

module.exports = {
  cleanText,
  initAddressMatcher,
  extractDetailedAddress,
  MATCHER_CACHE
};
