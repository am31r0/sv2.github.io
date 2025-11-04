// src/lib/unitParser.js
//
// Doel: ALTIJD normaliseren naar één van: "kg" | "L" | "st"
// en één prijsPerUnit in die basis: €/kg, €/L of €/st
//
// Publieke API:
// - parseUnitUniversal({ unitSize, unitInfoPrice, pricePerUnitString, eff })
// - parseAhUnitAndPPU({ unitSize, unitInfoPrice, eff })  // thin wrapper
//
// Tip: Voor andere supermarkten: geef wat je hebt mee:
//   - unitSize: vrije string zoals "2 x 250 g", "per stuk", "6 x 33 cl", "500 g"
//   - unitInfoPrice: number (als winkel al €/kg of €/L aanreikt)
//   - pricePerUnitString: strings zoals "€1,29/kg", "1.29 / l", "2,10 / stuk"
//   - eff: effectieve stuksprijs (promo of normaal) tbv eigen berekening

/* =========================
   Publieke API
   ========================= */

export function parseUnitUniversal({
  unitSize,
  unitInfoPrice = null,
  pricePerUnitString = null,
  eff = null,
}) {
  // 1) Probeer direct parse van store-PPU string
  const fromString = parsePPUString(pricePerUnitString);
  if (fromString) {
    const { unit, value } = fromString; // unit al in "kg"|"L"|"st"
    return shapeResult({ unit, ppu: value });
  }

  // 2) Als winkel al numeric unitInfoPrice geeft (€/kg|€/L|€/st), leid de unit af uit unitSize
  if (isFiniteNumber(unitInfoPrice)) {
    const inferred = inferTotalFromLabel(unitSize || "");
    const unit = inferred.baseUnit || inferUnitFallback(unitSize) || "st";
    return shapeResult({ unit, ppu: unitInfoPrice });
  }

  // 3) Zelf berekenen uit unitSize + eff
  const inferred = inferTotalFromLabel(unitSize || "");
  if (isFiniteNumber(eff) && inferred.baseUnit) {
    // Gewicht/volume → €/kg of €/L, anders €/st
    const denom = inferred.totalAmount && inferred.totalAmount > 0 ? inferred.totalAmount : 1;
    const ppu = safeDivide(eff, denom);
    if (isFiniteNumber(ppu)) return shapeResult({ unit: inferred.baseUnit, ppu });
  }

  // 4) Per stuk fallback (bv "per stuk", geen maat bekend)
  if (isFiniteNumber(eff)) {
    return shapeResult({ unit: "st", ppu: eff });
  }

  // 5) Geen idee → nulls (UI kan dit aan)
  return { unit: null, pricePerUnit: null, ppuLabel: "" };
}

// AH wrapper voor jouw bestaande call-site
export function parseAhUnitAndPPU({ unitSize, unitInfoPrice, eff }) {
  return parseUnitUniversal({ unitSize, unitInfoPrice, pricePerUnitString: null, eff });
}

/* =========================
   Intern: PPU-string parsers
   ========================= */

// Voor strings als: "€1,29/kg", "1.29 / kg", "2,49/l", "0,70 / stuk", "€0,70/st"
function parsePPUString(s) {
  if (!s || typeof s !== "string") return null;
  const txt = s.trim().toLowerCase()
    .replace(/\s+/g, " ")
    .replace(",", ".");
  // Zoek "getal / unit"
  // unit varianten: kg | g | gram | l | liter | ml | cl | dl | stuk | st | stuks
  const m = txt.match(/([\d.]+)\s*\/\s*(kg|g|gram|l|liter|ml|cl|dl|stuk|st|stuks?)/i);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const rawUnit = m[2];

  if (!Number.isFinite(val)) return null;

  const std = normalizeUnitToken(rawUnit);        // "kg"|"L"|"st"|null
  if (!std) return null;

  // Als string bijv. €/g of €/ml of €/cl is, omrekenen naar €/kg of €/L
  if (rawUnit === "g" || rawUnit === "gram") {
    return { unit: "kg", value: val * 1000 };     // €/g → €/kg
  }
  if (rawUnit === "ml") {
    return { unit: "L", value: val * 1000 };      // €/ml → €/L
  }
  if (rawUnit === "cl") {
    return { unit: "L", value: val * 100 };       // €/cl → €/L
  }
  if (rawUnit === "dl") {
    return { unit: "L", value: val * 10 };        // €/dl → €/L
  }
  if (rawUnit === "liter") {
    return { unit: "L", value: val };             // €/liter → €/L
  }

  // Reeds €/kg, €/L of €/st
  return { unit: std, value: val };
}

/* =========================
   Intern: infer uit unitSize
   ========================= */

/**
 * Leest totalen uit labels zoals:
 *  - "per stuk", "1 stuk", "3 stuks"
 *  - "500 g", "0,5 kg", "2 x 250 g"
 *  - "33 cl", "6 x 33 cl", "1,5 l"
 *  - "pak 6 x 33 cl", "tray 24 x 330 ml"
 *
 * Return:
 *  {
 *    baseUnit: "kg" | "L" | "st" | null,
 *    totalAmount: number | null  // naar kg/L of #stuks
 *  }
 */
function inferTotalFromLabel(raw) {
  const text = (raw || "")
    .toLowerCase()
    .trim()
    .replace(/\s{2,}/g, " ")
    .replace(/[()]/g, "");

  if (!text) return { baseUnit: null, totalAmount: null };

  // "per stuk"
  if (/\bper\s*stuk\b/.test(text)) {
    return { baseUnit: "st", totalAmount: 1 };
  }

  // Multipack: "2 x 250 g", "6x33 cl", "pak 6 x 330 ml"
  const multi = text.match(
    /(?:(?:pak|tray|doos|verpakking)\s*)?(\d+)\s*[x×]\s*([\d.,]+)\s*(kg|g|gram|l|ml|cl|dl|stuk|st|stuks?)/
  );
  if (multi) {
    const qty = toFloatEU(multi[1]);
    const unitVal = toFloatEU(multi[2]);
    const tok = multi[3];
    const std = normalizeUnitToken(tok);

    if (std === "kg" || std === "L") {
      const perItemBase = toBase(tok, unitVal); // naar kg/L
      return { baseUnit: std, totalAmount: qty * perItemBase };
    }
    if (std === "st") {
      const perItem = unitVal || 1;
      return { baseUnit: "st", totalAmount: qty * perItem };
    }
  }

  // Enkelvoudige maat: "500 g", "0,75 l", "33 cl", "330 ml"
  const single = text.match(/([\d.,]+)\s*(kg|g|gram|l|ml|cl|dl)\b/);
  if (single) {
    const val = toFloatEU(single[1]);
    const tok = single[2];
    const std = normalizeUnitToken(tok);
    const baseVal = toBase(tok, val); // naar kg/L
    return { baseUnit: std, totalAmount: baseVal };
  }

  // Aantal stuks: "3 stuks"
  const pieces = text.match(/(\d+)\s*(stuks?|st|pcs?)/);
  if (pieces) {
    const n = toFloatEU(pieces[1]);
    return { baseUnit: "st", totalAmount: n };
  }

  // Los "stuk" → 1 st
  if (/\bstuks?\b|\bstuk\b|\bst\b/.test(text)) {
    return { baseUnit: "st", totalAmount: 1 };
  }

  return { baseUnit: null, totalAmount: null };
}

function inferUnitFallback(s) {
  const t = (s || "").toLowerCase();
  if (/\b(kg|g|gram)\b/.test(t)) return "kg";
  if (/\b(l|liter|ml|cl|dl)\b/.test(t)) return "L";
  if (/\bstuk|stuks?|pcs?\b/.test(t)) return "st";
  return null;
}

/* =========================
   Normalisatie helpers
   ========================= */

function shapeResult({ unit, ppu }) {
  // unit al "kg"|"L"|"st"
  const pricePerUnit = isFiniteNumber(ppu) ? roundCents(ppu) : null;
  const ppuLabel = isFiniteNumber(pricePerUnit)
    ? `${formatEUR(pricePerUnit)} / ${unit}`
    : "";
  return { unit, pricePerUnit, ppuLabel };
}

function normalizeUnitToken(tok = "") {
  const t = tok.toLowerCase();
  if (t === "kg" || t === "g" || t === "gram") return "kg";
  if (t === "l" || t === "liter" || t === "ml" || t === "cl" || t === "dl")
    return "L";
  if (t === "stuk" || t === "st" || t === "stuks" || t === "stuks?") return "st";
  return null;
}

function toBase(unitTok, value) {
  const u = (unitTok || "").toLowerCase();
  const v = Number(value) || 0;
  if (u === "g" || u === "gram") return v / 1000; // → kg
  if (u === "kg") return v;
  if (u === "ml") return v / 1000; // → L
  if (u === "cl") return v / 100;  // → L
  if (u === "dl") return v / 10;   // → L
  if (u === "l" || u === "liter") return v;
  return v;
}

/* =========================
   Utils
   ========================= */

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}
function safeDivide(a, b) {
  if (!isFiniteNumber(a) || !isFiniteNumber(b) || b === 0) return null;
  return a / b;
}
function toFloatEU(x) {
  if (typeof x === "number") return x;
  if (!x || typeof x !== "string") return NaN;
  const s = x.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}
function roundCents(n) {
  return Math.round(n * 100) / 100;
}
function formatEUR(n) {
  try {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return "€" + (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
  }
}
