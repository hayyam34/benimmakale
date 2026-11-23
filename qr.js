/**
 * Saf Vanilla JavaScript ISO/IEC 18004 QR Code (Karekod) SVG Üreticisi
 * Harici kütüphane veya ağ isteği olmadan Versiyon 1-10, ECC Seviye M, UTF-8 Byte modunda çalışır.
 * Global olarak window.QRCodeSVG nesnesini dışa aktarır.
 */
(function (root) {
  'use strict';

  // Versiyon 1..10, ECC Seviye M için ISO/IEC 18004 tablo değerleri:
  // [totalDataCodewords, eccPerBlock, g1Blocks, g1DataCodewords, g2Blocks, g2DataCodewords]
  const VERSION_SPECS_M = [
    null,
    [16, 10, 1, 16, 0, 0],   // V1  (21x21)
    [28, 16, 1, 28, 0, 0],   // V2  (25x25)
    [44, 26, 1, 44, 0, 0],   // V3  (29x29)
    [64, 18, 2, 32, 0, 0],   // V4  (33x33)
    [86, 24, 2, 43, 0, 0],   // V5  (37x37)
    [108, 16, 4, 27, 0, 0],  // V6  (41x41)
    [124, 18, 4, 31, 0, 0],  // V7  (45x45)
    [154, 22, 2, 38, 2, 39], // V8  (49x49)
    [182, 22, 3, 36, 2, 37], // V9  (53x53)
    [216, 26, 4, 43, 1, 44]  // V10 (57x57)
  ];

  // Versiyon 2..10 için Hizalama (Alignment) deseni merkez koordinatları
  const ALIGNMENT_CENTERS = [
    null,
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50]
  ];

  // GF(256) log / antilog tabloları (Polinom: x^8 + x^4 + x^3 + x^2 + 1 = 0x11D)
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function initGaloisField() {
    let val = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = val;
      GF_LOG[val] = i;
      val <<= 1;
      if (val & 0x100) {
        val ^= 0x11D;
      }
    }
    for (let i = 255; i < 512; i++) {
      GF_EXP[i] = GF_EXP[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  /** Reed-Solomon üreteç polinomu (derece = eccCount) */
  function rsGeneratorPoly(eccCount) {
    let poly = [1];
    for (let i = 0; i < eccCount; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = GF_EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  /** Tek bir veri bloğu için ECC baytlarını hesaplar */
  function rsComputeEcc(dataBytes, eccCount) {
    const gen = rsGeneratorPoly(eccCount);
    const rem = new Uint8Array(eccCount);
    for (let i = 0; i < dataBytes.length; i++) {
      const factor = dataBytes[i] ^ rem[0];
      for (let j = 0; j < eccCount - 1; j++) {
        rem[j] = rem[j + 1];
      }
      rem[eccCount - 1] = 0;
      if (factor !== 0) {
        for (let j = 0; j < eccCount; j++) {
          rem[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return rem;
  }

  /** Metni UTF-8 bayt dizisine dönüştürür */
  function toUtf8Bytes(text) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(String(text));
    }
    const utf8 = unescape(encodeURIComponent(String(text)));
    const arr = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) {
      arr[i] = utf8.charCodeAt(i);
    }
    return arr;
  }

  /** Verilen UTF-8 bayt uzunluğuna sığan en küçük QR versiyonunu (1..10) seçer */
  function chooseVersion(byteLength) {
    for (let v = 1; v <= 10; v++) {
      const totalDataBits = VERSION_SPECS_M[v][0] * 8;
      const countBits = v <= 9 ? 8 : 16;
      const requiredBits = 4 + countBits + byteLength * 8;
      if (requiredBits <= totalDataBits) {
        return v;
      }
    }
    throw new Error('QR kod kapasitesi aşıldı (en fazla 213 UTF-8 bayt desteklenir).');
  }

  /** Bit akışını oluşturup ECC Seviye M kod sözcüklerini üretir */
  function encodeCodewords(bytes, version) {
    const spec = VERSION_SPECS_M[version];
    const totalDataCodewords = spec[0];
    const eccPerBlock = spec[1];
    const g1Blocks = spec[2];
    const g1Data = spec[3];
    const g2Blocks = spec[4];
    const g2Data = spec[5];

    const bits = [];
    function pushBits(val, count) {
      for (let i = count - 1; i >= 0; i--) {
        bits.push((val >>> i) & 1);
      }
    }

    // Byte modu (0100) + karakter uzunluğu
    pushBits(0b0100, 4);
    pushBits(bytes.length, version <= 9 ? 8 : 16);

    for (let i = 0; i < bytes.length; i++) {
      pushBits(bytes[i], 8);
    }

    const totalDataBits = totalDataCodewords * 8;
    const terminatorLen = Math.min(4, totalDataBits - bits.length);
    for (let i = 0; i < terminatorLen; i++) {
      bits.push(0);
    }
    while (bits.length % 8 !== 0) {
      bits.push(0);
    }

    const dataCodewords = new Uint8Array(totalDataCodewords);
    let idx = 0;
    for (let i = 0; i < bits.length; i += 8) {
      let byteVal = 0;
      for (let b = 0; b < 8; b++) {
        byteVal = (byteVal << 1) | bits[i + b];
      }
      dataCodewords[idx++] = byteVal;
    }

    const padBytes = [0xEC, 0x11];
    let padIdx = 0;
    while (idx < totalDataCodewords) {
      dataCodewords[idx++] = padBytes[padIdx % 2];
      padIdx++;
    }

    // Bloklara böl ve RS ECC hesapla
    const dataBlocks = [];
    const eccBlocks = [];
    let offset = 0;

    for (let b = 0; b < g1Blocks; b++) {
      const slice = dataCodewords.slice(offset, offset + g1Data);
      offset += g1Data;
      dataBlocks.push(slice);
      eccBlocks.push(rsComputeEcc(slice, eccPerBlock));
    }
    for (let b = 0; b < g2Blocks; b++) {
      const slice = dataCodewords.slice(offset, offset + g2Data);
      offset += g2Data;
      dataBlocks.push(slice);
      eccBlocks.push(rsComputeEcc(slice, eccPerBlock));
    }

    // Bloklar arası interleaving
    const finalCodewords = [];
    const maxDataLen = Math.max(g1Data, g2Data);
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < dataBlocks.length; b++) {
        if (i < dataBlocks[b].length) {
          finalCodewords.push(dataBlocks[b][i]);
        }
      }
    }
    for (let i = 0; i < eccPerBlock; i++) {
      for (let b = 0; b < eccBlocks.length; b++) {
        finalCodewords.push(eccBlocks[b][i]);
      }
    }

    return finalCodewords;
  }

  /** Bulucu (Finder) + çevresindeki beyaz ayırıcıyı yerleştirir */
  function placeFinder(modules, isFunction, topRow, leftCol, size) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topRow + dr;
        const c = leftCol + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;

        const inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const isDark = inBox && (
          dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
          (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
        );
        modules[r][c] = isDark ? 1 : 0;
        isFunction[r][c] = true;
      }
    }
  }

  /** 5x5 Hizalama (Alignment) deseni yerleştirir */
  function placeAlignment(modules, isFunction, centerRow, centerCol) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = centerRow + dr;
        const c = centerCol + dc;
        const dist = Math.max(Math.abs(dr), Math.abs(dc));
        modules[r][c] = dist === 2 || dist === 0 ? 1 : 0;
        isFunction[r][c] = true;
      }
    }
  }

  /** BCH(15,5) format bilgisini (ECC Seviye M = 00) hesaplayıp yerleştirir */
  function placeFormatInfo(modules, isFunction, size, maskId) {
    // ECC M = 00
    const data = maskId & 0x07;
    let rem = data << 10;
    for (let i = 4; i >= 0; i--) {
      if ((rem >>> (i + 10)) & 1) {
        rem ^= 0x537 << i;
      }
    }
    const formatBits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i < 15; i++) {
      const bit = (formatBits >>> i) & 1;

      // Sol üst bulucu çevresi
      if (i < 6) {
        modules[i][8] = bit;
        isFunction[i][8] = true;
      } else if (i < 8) {
        modules[i + 1][8] = bit;
        isFunction[i + 1][8] = true;
      } else if (i === 8) {
        modules[8][7] = bit;
        isFunction[8][7] = true;
      } else {
        modules[8][14 - i] = bit;
        isFunction[8][14 - i] = true;
      }

      // Sağ üst ve sol alt bulucu çevresi
      if (i < 8) {
        modules[8][size - 1 - i] = bit;
        isFunction[8][size - 1 - i] = true;
      } else {
        modules[size - 15 + i][8] = bit;
        isFunction[size - 15 + i][8] = true;
      }
    }

    // Sabit karanlık modül (4*V + 9, 8)
    modules[size - 8][8] = 1;
    isFunction[size - 8][8] = true;
  }

  /** Versiyon 7..10 için 18-bit BCH(18,6) versiyon bilgisini yerleştirir */
  function placeVersionInfo(modules, isFunction, size, version) {
    if (version < 7) return;
    let rem = version << 12;
    for (let i = 5; i >= 0; i--) {
      if ((rem >>> (i + 12)) & 1) {
        rem ^= 0x1F25 << i;
      }
    }
    const versionBits = (version << 12) | rem;

    for (let i = 0; i < 18; i++) {
      const bit = (versionBits >>> i) & 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      modules[a][b] = bit;
      isFunction[a][b] = true;
      modules[b][a] = bit;
      isFunction[b][a] = true;
    }
  }

  /** Temel fonksiyon desenlerini kurar */
  function initFunctionModules(version) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Uint8Array(size));
    const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

    // 3 köşe bulucu
    placeFinder(modules, isFunction, 0, 0, size);
    placeFinder(modules, isFunction, 0, size - 7, size);
    placeFinder(modules, isFunction, size - 7, 0, size);

    // Hizalama desenleri
    const centers = ALIGNMENT_CENTERS[version];
    for (let i = 0; i < centers.length; i++) {
      for (let j = 0; j < centers.length; j++) {
        // Bulucularla çakışan 3 köşeyi atla
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === centers.length - 1) ||
          (i === centers.length - 1 && j === 0)
        ) {
          continue;
        }
        placeAlignment(modules, isFunction, centers[i], centers[j]);
      }
    }

    // Zamanlama (Timing) çizgileri
    for (let i = 8; i < size - 8; i++) {
      const bit = i % 2 === 0 ? 1 : 0;
      if (!isFunction[6][i]) {
        modules[6][i] = bit;
        isFunction[6][i] = true;
      }
      if (!isFunction[i][6]) {
        modules[i][6] = bit;
        isFunction[i][6] = true;
      }
    }

    // Format ve versiyon alanlarını rezerve et
    placeFormatInfo(modules, isFunction, size, 0);
    placeVersionInfo(modules, isFunction, size, version);

    return { size, modules, isFunction };
  }

  /** Zikzak düzende veri + ECC bitlerini matrise yazar */
  function placeDataBits(modules, isFunction, size, codewords) {
    let bitIndex = 0;
    const totalBits = codewords.length * 8;
    let upward = true;

    for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
      if (rightCol === 6) rightCol = 5;

      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (let offset = 0; offset < 2; offset++) {
          const c = rightCol - offset;
          if (!isFunction[r][c]) {
            let bit = 0;
            if (bitIndex < totalBits) {
              const cw = codewords[bitIndex >>> 3];
              bit = (cw >>> (7 - (bitIndex & 7))) & 1;
              bitIndex++;
            }
            modules[r][c] = bit;
          }
        }
      }
      upward = !upward;
    }
  }

  /** 8 standart maske koşulu */
  function getMaskBit(maskId, r, c) {
    switch (maskId) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return false;
    }
  }

  function applyMask(modules, isFunction, size, maskId) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunction[r][c] && getMaskBit(maskId, r, c)) {
          modules[r][c] ^= 1;
        }
      }
    }
  }

  /** ISO/IEC 18004 4 ceza kuralı ile maske kalitesini puanlar (düşük daha iyi) */
  function computePenalty(modules, size) {
    let penalty = 0;

    // Kural 1: Aynı renkte 5+ ardışık yatay/dikey modül
    for (let r = 0; r < size; r++) {
      let runColor = modules[r][0];
      let runLen = 1;
      for (let c = 1; c < size; c++) {
        if (modules[r][c] === runColor) {
          runLen++;
        } else {
          if (runLen >= 5) penalty += 3 + (runLen - 5);
          runColor = modules[r][c];
          runLen = 1;
        }
      }
      if (runLen >= 5) penalty += 3 + (runLen - 5);
    }

    for (let c = 0; c < size; c++) {
      let runColor = modules[0][c];
      let runLen = 1;
      for (let r = 1; r < size; r++) {
        if (modules[r][c] === runColor) {
          runLen++;
        } else {
          if (runLen >= 5) penalty += 3 + (runLen - 5);
          runColor = modules[r][c];
          runLen = 1;
        }
      }
      if (runLen >= 5) penalty += 3 + (runLen - 5);
    }

    // Kural 2: 2x2 aynı renkli bloklar
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const val = modules[r][c];
        if (
          modules[r][c + 1] === val &&
          modules[r + 1][c] === val &&
          modules[r + 1][c + 1] === val
        ) {
          penalty += 3;
        }
      }
    }

    // Kural 3: Bulucu benzeri 1:1:3:1:1 desenleri
    function countPatternInLine(line) {
      let count = 0;
      for (let i = 0; i <= line.length - 11; i++) {
        // 10111010000
        if (
          line[i] === 1 && line[i + 1] === 0 && line[i + 2] === 1 &&
          line[i + 3] === 1 && line[i + 4] === 1 && line[i + 5] === 0 &&
          line[i + 6] === 1 && line[i + 7] === 0 && line[i + 8] === 0 &&
          line[i + 9] === 0 && line[i + 10] === 0
        ) {
          count += 40;
        }
        // 00001011101
        if (
          line[i] === 0 && line[i + 1] === 0 && line[i + 2] === 0 &&
          line[i + 3] === 0 && line[i + 4] === 1 && line[i + 5] === 0 &&
          line[i + 6] === 1 && line[i + 7] === 1 && line[i + 8] === 1 &&
          line[i + 9] === 0 && line[i + 10] === 1
        ) {
          count += 40;
        }
      }
      return count;
    }

    const colBuf = new Uint8Array(size);
    for (let r = 0; r < size; r++) {
      penalty += countPatternInLine(modules[r]);
    }
    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size; r++) {
        colBuf[r] = modules[r][c];
      }
      penalty += countPatternInLine(colBuf);
    }

    // Kural 4: Karanlık modül oranı
    let darkCount = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        darkCount += modules[r][c];
      }
    }
    const total = size * size;
    const k = Math.floor(Math.abs(darkCount * 20 - total * 10) / total);
    penalty += k * 10;

    return penalty;
  }

  /** Metni tam QR matrisine dönüştürür */
  function encodeMatrix(text) {
    const bytes = toUtf8Bytes(text);
    const version = chooseVersion(bytes.length);
    const codewords = encodeCodewords(bytes, version);
    const { size, modules, isFunction } = initFunctionModules(version);

    placeDataBits(modules, isFunction, size, codewords);

    let bestMask = 0;
    let bestPenalty = Infinity;

    for (let maskId = 0; maskId < 8; maskId++) {
      applyMask(modules, isFunction, size, maskId);
      placeFormatInfo(modules, isFunction, size, maskId);
      const penalty = computePenalty(modules, size);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestMask = maskId;
      }
      applyMask(modules, isFunction, size, maskId);
    }

    applyMask(modules, isFunction, size, bestMask);
    placeFormatInfo(modules, isFunction, size, bestMask);

    return { version, size, mask: bestMask, modules };
  }

  /** Verilen metin için yüksek kontrastlı SVG karekod metni üretir */
  function generate(text, options) {
    const opts = options || {};
    const margin = typeof opts.margin === 'number' ? opts.margin : 4;
    const displaySize = opts.size || 200;
    const { size, modules } = encodeMatrix(text);
    const viewBoxSize = size + margin * 2;

    const paths = [];
    for (let r = 0; r < size; r++) {
      let runStart = -1;
      for (let c = 0; c <= size; c++) {
        const isDark = c < size && modules[r][c] === 1;
        if (isDark && runStart === -1) {
          runStart = c;
        } else if (!isDark && runStart !== -1) {
          const w = c - runStart;
          paths.push(`M${runStart + margin},${r + margin}h${w}v1h-${w}z`);
          runStart = -1;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${displaySize}" height="${displaySize}" shape-rendering="crispEdges" role="img" aria-label="Karekod"><rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#FFFFFF"/><path d="${paths.join('')}" fill="#000000"/></svg>`;
  }

  root.QRCodeSVG = {
    generate: generate,
    encodeMatrix: encodeMatrix
  };
})(typeof window !== 'undefined' ? window : globalThis);
