// =============================================
// Matching & Normalisatie Engine (Schappie v2)
// =============================================
import { getEnabledStores } from "./settings.js";
import { parseAhUnitAndPPU } from "./unitParser.js"
import { parseUnitUniversal } from "./unitParser.js";

const DEBUG = false;


/* =======================
   Universele categorieën
   ======================= */
export const UNIVERSAL_CATEGORIES = [
  "produce", // Groente & Fruit
  "meat_fish_veg", // Vlees, Vis & Vega
  "dairy", // Zuivel & Kaas
  "bakery", // Brood & Ontbijt
  "pantry", // Voorraad / Conserven
  "snacks", // Snacks & Snoep
  "drinks", // Dranken
  "alcohol", // Bier & Wijn
  "frozen", // Diepvries
  "health", // Drogisterij / Gezondheid
  "baby", // Baby & Kind
  "household", // Huishouden / Non-food
  "pet", // Huisdieren
  "other", // Overig
];

/* =======================
   Label detectie
   ======================= */
const LABEL_PATTERNS = [
  { key: "bio", rx: /\b(bio|biologisch)\b/i },
  { key: "special", rx: /\b(speciaal assortiment)\b/i },
  { key: "conscious", rx: /\b(bewust|bewuste voeding)\b/i },
  { key: "glutenfree", rx: /\b(glutenvrij)\b/i },
  { key: "seasonal", rx: /\b(tijdelijk|feestweken|barbecue|bbq|seizoens)\b/i },
];

/* =======================
   Regex kern mapping
   ======================= */
const CORE_CATEGORY_MAP = [
  { rx: /aardappelen|groente|fruit|verse sappen/i, to: "produce" },
  { rx: /vleeswaren?|vlees\b|vis\b|vega|vegetarisch/i, to: "meat_fish_veg" },
  { rx: /zuivel|eieren|kaas|plantaardig/i, to: "dairy" },
  { rx: /\bbrood\b|ontbijt|beleg(?!.*tapas)/i, to: "bakery" },
  {
    rx: /soepen|conserven|sauzen|kruiden|olie|pasta|rijst|wereldkeuken/i,
    to: "pantry",
  },
  { rx: /chips|zoutjes|noten|koek|snoep|chocolade|zelf bakken/i, to: "snacks" },
  { rx: /frisdrank|sappen|water|koffie|thee/i, to: "drinks" },
  { rx: /bier|wijn|aperitieven|sterke drank|alcohol/i, to: "alcohol" },
  { rx: /\bdiepvries\b/i, to: "frozen" },
  { rx: /drogisterij|verzorging|gezondheid|cosmetica|sport/i, to: "health" },
  { rx: /\bbaby\b|kind\b/i, to: "baby" },
  {
    rx: /huishoud|non-?food|koken|tafelen|vrije tijd|servicebalie/i,
    to: "household",
  },
  { rx: /huisdier(en)?|dieren/i, to: "pet" },
];

/* =======================
   Baby-composiet
   ======================= */
const BABY_HINTS =
  /\b(baby|luiers?|billendoekjes|flesvoeding|papje|potjes|zwitsal|babyvoeding)\b/i;

/* =======================
   Hoofd normalisatie
   ======================= */
export function normalizeCategoryAndLabels({ category = "", title = "" }) {
  const src = `${category} ${title}`.trim();

  // Labels
  const labels = {};
  for (const { key, rx } of LABEL_PATTERNS) labels[key] = rx.test(src);

  // "Drogisterij en baby"
  if (/\bdrogisterij.*baby|baby.*drogisterij/i.test(category)) {
    const cat = BABY_HINTS.test(title) ? "baby" : "health";
    return { category: cat, labels };
  }

  // Regex match
  for (const rule of CORE_CATEGORY_MAP)
    if (rule.rx.test(category)) return { category: rule.to, labels };
  for (const rule of CORE_CATEGORY_MAP)
    if (rule.rx.test(title)) return { category: rule.to, labels };

  return { category: "other", labels };
}

/* =======================
   Pre-normalisatie
   ======================= */
export function preNormalizeStoreCategory(raw) {
  if (!raw) return "";
  let c = raw.trim();

  if (/^verse maaltijden(,|\s) salades$/i.test(c)) c = "Maaltijden, salades";
  if (/vlees, vis, vega(etarisch)?/i.test(c)) c = "Vlees, vis, vegetarisch";
  if (/frisdrank(,|\s) sappen(,|\s) water/i.test(c)) c = "Frisdrank en sappen";
  return c;
}

/* =======================
   unifyCategory – hoofdfunctie
   ======================= */
export function unifyCategory(storeKey, rawCategory, title = "") {
  const pre = preNormalizeStoreCategory(rawCategory);
  const { category } = normalizeCategoryAndLabels({ category: pre, title });
  return UNIVERSAL_CATEGORIES.includes(category) ? category : "other";
}

/* =======================
   Helpers: numbers & units
   ======================= */
function toFloatEU(s) {
  if (typeof s === "number") return s;
  if (!s) return NaN;
  const clean = String(s)
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (/,\d{1,2}$/.test(clean))
    return parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return parseFloat(clean.replace(/,/g, ""));
}

function normUnitKey(u) {
  if (!u) return null;
  const s = String(u).toLowerCase().trim();
  if (["kg", "kilo", "kilogram"].includes(s)) return "kg";
  if (["g", "gram", "grams"].includes(s)) return "g";
  if (["l", "lt", "liter", "litre", "liters"].includes(s)) return "L";
  if (["ml", "milliliter"].includes(s)) return "ml";
  if (["cl", "centiliter"].includes(s)) return "cl";
  if (["st", "stuk", "stuks", "stukken", "piece", "pieces"].includes(s))
    return "st";
  return s;
}

function labelForUnit(unit) {
  if (unit === "kg") return "€/kg";
  if (unit === "L") return "€/L";
  return "€/st";
}

function isPromoActiveNow(promo) {
  if (!promo || !promo.start || !promo.end) return false;

  const months = {
    jan: 0,
    feb: 1,
    mrt: 2,
    apr: 3,
    mei: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    okt: 9,
    nov: 10,
    dec: 11,
  };

  const now = new Date();

  try {
    const start = new Date(
      now.getFullYear(),
      months[promo.start.monthShort.toLowerCase()],
      parseInt(promo.start.date)
    );
    const end = new Date(
      now.getFullYear(),
      months[promo.end.monthShort.toLowerCase()],
      parseInt(promo.end.date)
    );

    // promo actief als vandaag binnen range valt
    return now >= start && now <= end;
  } catch (e) {
    if (DEBUG) console.warn("Invalid promo date:", promo, e);
    return false;
  }
}


function effectivePrice(normal, promo) {
  return promo && promo > 0 ? promo : normal;
}

/* =======================
   AH: kleinste afbeelding pakken
   ======================= */
function pickSmallestAhImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;

  let best = null;
  let bestArea = Infinity;

  for (const it of images) {
    const url = typeof it === "string" ? it : it?.url;
    if (!url) continue;

    // Probeer "rendition=200x200" (standaard AH)
    let w = null, h = null;
    const m1 = url.match(/rendition=(\d+)x(\d+)/i);
    if (m1) {
      w = parseInt(m1[1], 10);
      h = parseInt(m1[2], 10);
    } else {
      // fallback: probeer "/200x200_" in het pad
      const m2 = url.match(/\/(\d+)x(\d+)[^/]*$/i);
      if (m2) {
        w = parseInt(m2[1], 10);
        h = parseInt(m2[2], 10);
      }
    }

    // Geen parsebare maat? Sla op als laatste fallback
    if (w == null || h == null) {
      if (best === null) best = url; // fallback als we niets beters vinden
      continue;
    }

    const area = w * h;
    if (area < bestArea) {
      bestArea = area;
      best = url;
    }
  }

  return best;
}

/* =======================
   Normalizers per supermarkt
   ======================= */
   export function normalizeAH(p) {
     // --- prijzen uit nieuw schema ---
     const now = toFloatEU(p?.price?.now);
     const was = toFloatEU(p?.price?.was);

     // Lijstprijs (toon als 'price'): als 'was' er is gebruik die, anders 'now'
     const price = Number.isFinite(was)
       ? was
       : Number.isFinite(now)
       ? now
       : null;

     // Promo: alleen vullen als now < was
     let promoPrice = null;
     if (Number.isFinite(now) && Number.isFinite(was) && now < was) {
       promoPrice = now;
     }

     const eff = promoPrice ?? price;

     // --- per-unit/maat ---
     const unitInfoPrice = Number.isFinite(p?.price?.unitInfo?.price)
       ? p.price.unitInfo.price
       : null;

     const unitSize = p?.price?.unitSize || p?.unitSize || p?.unit || null;

     // -> universeel naar €/kg | €/L | €/st
     const { unit, pricePerUnit, ppuLabel } = parseAhUnitAndPPU({
       unitSize,
       unitInfoPrice, // bv. 8.9 met description "KG" → parser zet zelf om o.b.v. unitSize
       eff,
     });

     // --- promo eind (ISO string laten staan; jouw UI kan dit tonen) ---
     const promoEnd = p?.discount?.endDate || p?.promoEnd || null;

     // --- image (kleinste) ---
     const image =
       (Array.isArray(p.images) && pickSmallestAhImage(p.images)) ||
       p.image ||
       null;

     // --- link ---
     const link = p.link || p.url || null;

     // --- category mapping ---
     const rawCategory =
       p.category ||
       (Array.isArray(p.taxonomies)
         ? p.taxonomies.map((t) => t?.name).join(" > ")
         : "") ||
       "";
     const unifiedCategory = unifyCategory(
       "AH",
       rawCategory,
       p.title || p.name || ""
     );

     return {
       store: "ah",
       id: p.id || p.hqId || p.sku || null,
       name: p.title || p.name || "",
       brand: p.brand || (p.title ? p.title.split(" ")[0] : ""),
       rawCategory,
       unifiedCategory,
       price, // lijstprijs (was of now)
       promoPrice, // alleen gevuld als now < was
       promoEnd, // bv. "2025-10-26"
       unit, // "kg" | "L" | "st"
       pricePerUnit, // numeriek €/kg|€/L|€/st
       ppuLabel, // "€… / kg|L|st"
       image,
       link,
       labels: normalizeCategoryAndLabels({
         category: rawCategory,
         title: p.title || p.name || "",
       }).labels,
     };
   }  
  

  export function normalizeJumbo(p) {
    // --- prijzen uit nieuw schema ---
    const regular = toFloatEU(p?.prices?.regular);
    const final   = toFloatEU(p?.prices?.final);
    const promo   = toFloatEU(p?.prices?.promo);
  
    // Lijstprijs (altijd tonen als 'price')
    const price = Number.isFinite(regular)
      ? regular
      : (Number.isFinite(final) ? final : null);
  
    // Promo logica:
    // - gebruik 'promo' als die bestaat en < regular
    // - anders, als 'final' < regular, gebruik final
    let promoPrice = null;
    if (Number.isFinite(promo) && Number.isFinite(regular) && promo < regular) {
      promoPrice = promo;
    } else if (Number.isFinite(final) && Number.isFinite(regular) && final < regular) {
      promoPrice = final;
    }
  
    const eff = promoPrice ?? price;
  
    // --- per-unit omzetten naar string voor de universele parser ---
    let pricePerUnitString = null;
    if (Number.isFinite(p?.prices?.perUnit?.price) && p?.prices?.perUnit?.unit) {
      // bv. "10.71 / kg" of "1 / l"
      pricePerUnitString = `${p.prices.perUnit.price} / ${String(p.prices.perUnit.unit).toLowerCase()}`;
    }
  
    // hint uit de titel (bv. "350g", "1L", "6 x 33 cl")
    const unitSizeFromTitle = grabSizeFromText(p?.title);
  
    // --- universeel normaliseren naar €/kg | €/L | €/st ---
    const { unit, pricePerUnit, ppuLabel } = parseUnitUniversal({
      unitSize: unitSizeFromTitle,
      unitInfoPrice: null,
      pricePerUnitString,
      eff,
    });
  
    // --- promo eind (als string laten, je UI kan dit tonen) ---
    const promoEnd = p?.promoInfo?.until || null; // bv. "di 28 okt"
  
    // --- image verkleinen ---
    let image = p.image
      ? p.image.replace(/fit-in\/\d+x\d+\//, "fit-in/120x120/")
      : null;
  
    return {
      store: "jumbo",
      id: p.id,
      name: p.title,
      brand: p.brand || (p.title ? p.title.split(" ")[0] : ""),
      rawCategory: p.category,
      unifiedCategory: unifyCategory("JUMBO", p.category, p.title),
      price,           // lijstprijs
      promoPrice,      // alleen gevuld als < regular
      promoEnd,        // bv. "di 28 okt"
      unit,            // "kg" | "L" | "st"
      pricePerUnit,    // numeriek (€/kg | €/L | €/st)
      ppuLabel,        // "€… / kg|L|st"
      link: p.link || null,
      image,
      labels: normalizeCategoryAndLabels({ category: p.category, title: p.title }).labels,
    };
  }
  

  export function normalizeDirk(p) {
    const price = toFloatEU(p.normalPrice);
    const promoPrice = toFloatEU(p.offerPrice);
    const eff = effectivePrice(
      price,
      Number.isFinite(promoPrice) && promoPrice > 0 ? promoPrice : null
    );

    // ⬇️ Nieuw: haal maat uit packaging of val terug op titel
    const unitSize = p.packaging || grabSizeFromText(p.name);

    // ⬇️ Nieuw: universeel normaliseren naar kg/L/st + PPU
    const { unit, pricePerUnit, ppuLabel } = parseUnitUniversal({
      unitSize,
      unitInfoPrice: null,
      pricePerUnitString: null,
      eff, // bereken zelf €/kg | €/L op basis van totale hoeveelheid uit unitSize
    });

    let image = p.image
      ? "https://d3r3h30p75xj6a.cloudfront.net/" + p.image
      : null;
    if (image && !image.includes("?")) image += "?width=120";

    return {
      store: "dirk",
      id: p.productId,
      name: p.name,
      brand: p.brand || p.name.split(" ")[0],
      rawCategory: p.categoryLabel,
      unifiedCategory: unifyCategory("DIRK", p.categoryLabel, p.name),
      price,
      promoPrice:
        Number.isFinite(promoPrice) && promoPrice > 0 ? promoPrice : null,
      unit: unit || "st",
      pricePerUnit: Number.isFinite(pricePerUnit) ? pricePerUnit : eff,
      ppuLabel: ppuLabel || labelForUnit(unit || "st"),
      image,
      // Dirk heeft doorgaans geen deep link; laat null of vul in als je later een URL hebt
      link: p.link || null,
      labels: normalizeCategoryAndLabels({
        category: p.categoryLabel,
        title: p.name,
      }).labels,
    };
  }

export function normalizeAldi(p) {
  const price = p.price;
  const promoPrice = typeof p.promoPrice === "number" ? p.promoPrice : null;
  const eff = effectivePrice(price, promoPrice);

  const unit = p.unit ? normUnitKey(p.unit) : "st";
  const pricePerUnit = eff;
  const ppuLabel = labelForUnit(unit);

  return {
    store: "aldi",
    id: p.id,
    name: p.title,
    brand: p.brand || p.title.split(" ")[0],
    rawCategory: p.category,
    unifiedCategory: unifyCategory("ALDI", p.category, p.title),
    price,
    promoPrice,
    unit,
    pricePerUnit,
    ppuLabel,
    image: p.image,
    link: p.link,
    labels: normalizeCategoryAndLabels({ category: p.category, title: p.title })
      .labels,
  };
}

export function normalizeHoogvliet(p) {
  const price = toFloatEU(p.listPrice || p.price);
  const promoPrice = toFloatEU(p.promoPrice || p.discountedPrice || null);
  const eff = effectivePrice(price, promoPrice);

  // ⬇️ Nieuw: probeer beschikbare bronnen voor maat/PPU
  // - p.price_per_unit: soms "x,xx / l" of "x.xx / kg"
  // - p.unit: kan soms "500 g" of "6 x 33 cl" achtig zijn
  // - fallback: haal uit de titel
  const pricePerUnitString =
    typeof p.price_per_unit === "string" ? p.price_per_unit : null;
  const unitSize =
    (typeof p.unit === "string" && p.unit.trim()) ||
    grabSizeFromText(p.title) ||
    null;

  const { unit, pricePerUnit, ppuLabel } = parseUnitUniversal({
    unitSize,
    unitInfoPrice: null,
    pricePerUnitString,
    eff,
  });

  // promo eind
  let promoEnd = p.promoEnd || null;
  if (!promoEnd && Array.isArray(p.promotions) && p.promotions.length > 0) {
    const promo = p.promotions.find((pr) => pr.validUntil);
    if (promo) promoEnd = promo.validUntil;
  }

  return {
    store: "hoogvliet",
    id: p.id,
    name: p.title || p.name || "Naamloos product",
    brand: p.brand || (p.title ? p.title.split(" ")[0] : ""),
    rawCategory: p.categoryHierarchy || p.category,
    unifiedCategory: unifyCategory(
      "HOOGVLIET",
      p.categoryHierarchy || p.category,
      p.title
    ),
    price,
    promoPrice,
    promoEnd,
    unit: unit || "st",
    pricePerUnit: Number.isFinite(pricePerUnit) ? pricePerUnit : eff,
    ppuLabel: ppuLabel || labelForUnit(unit || "st"),
    image: p.image,
    link: p.link,
    labels: normalizeCategoryAndLabels({
      category: p.categoryHierarchy || p.category,
      title: p.title,
    }).labels,
  };
}


/* =======================
   Alles combineren
   ======================= */
   export function normalizeAll({
     ah = [],
     dirk = [],
     jumbo = [],
     aldi = [],
     hoogvliet = [],
   }) {
     const all = [
       ...ah.map(normalizeAH),
       ...dirk.map(normalizeDirk),
       ...jumbo.map(normalizeJumbo),
       ...aldi.map(normalizeAldi),
       ...hoogvliet.map(normalizeHoogvliet),
     ];

     // ✅ FIX: altijd unieke id genereren (belangrijk voor deals & lijst)
     return all.map((p, i) => ({
       ...p,
       id: p.id || p.productId || p.sku || `${p.store}_${i}`,
     }));
   }

/* =======================
   Fuzzy helpers
   ======================= */
function levenshtein(a, b) {
  const m = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function sim(a, b) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

function tokenize(str) {
  return String(str).toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/* =======================
   Varianten & Synoniemen
   ======================= */
const WORD_VARIANTS = {
  banaan: ["bananen"],
  appel: ["appels"],
  ei: ["eieren"],
  tomaat: ["tomaten"],
  aardappel: ["aardappelen"],
  wortel: ["wortels"],
  vis: ["vissen"],
  kip: ["kippen"],
  boon: ["bonen"],
  ui: ["uien"],
  kaas: ["kazen"],
  brood: ["broden"],
  fles: ["flessen"],
  bloem: ["bloemen"],
  druif: ["druiven"],
  peer: ["peren"],
  citroen: ["citroenen"],
  sinaasappel: ["sinaasappels"],
  noot: ["noten"],
  koek: ["koeken"],
  worst: ["worsten"],
  ijs: ["ijsjes"],
  aardbei: ["aardbeien"],
};

const SYNONYMS = {
  wc: ["toilet", "toiletpapier", "wc papier"],
  toiletpapier: ["wc papier", "wc"],
  pasta: ["spaghetti", "penne", "macaroni"],
  snoep: ["chocolade", "koekjes"],
  bier: ["pils"],
  melk: ["halfvolle melk", "volle melk", "sojamelk", "havermelk"],
  brood: ["bolletjes", "stokbrood"],
  vleesvervanger: ["vega", "vegetarisch"],
  cola: ["coke", "zero", "light"],
};

/* =======================
   Semantische filters
   ======================= */
const SEMANTIC_BLOCKLIST = {
  water: ["waterdicht", "waterproof", "waterkoker", "waterverf", "waterijsjes"],
  melk: ["melkchocolade", "melkzeep", "melkopschuimer"],
  kaas: ["kaasschaaf", "kaasstengel", "kaasplank", "kaasbroodje"],
  ei: ["eierwekker", "eiersnijder", "eierdop"],
  pasta: ["tandpasta", "verfpasta", "pleisterpasta"],
  chips: ["microchip", "chipkaart", "computerchip"],
  olie: ["massageolie", "etherische", "gezichtsolie", "haarolie"],
  boter: ["bodybutter"],
  suiker: ["suikervrij (let op intentie)"],
  zout: ["zoutlamp", "zoutsteen", "badzout"],
  koffie: ["koffiemok", "koffiezetapparaat", "koffiepad"],
  thee: ["theemok", "theepot", "theedoek"],
  wijn: ["wijnrek", "wijnkoeler", "wijnflesopener"],
  bier: ["bierglas", "bieropener", "bierkrat"],
  cola: ["chocola", "dulcolax", "peijnenburg", "sinas" ,"orange", "lemon", "mango", "tea", "rucola", "citrus", "breaker"],
  banaan: ["bananenboom", "bananenchips", "baby", "kids", "junior"],
};

function semanticFilter(query, product) {
  const q = query.toLowerCase().trim();
  const name = product.name.toLowerCase();
  if (SEMANTIC_BLOCKLIST[q])
    for (const bad of SEMANTIC_BLOCKLIST[q]) if (name.includes(bad)) return 0;
  const cat = (
    product.rawCategory ||
    product.unifiedCategory ||
    ""
  ).toLowerCase();
  if (cat.includes(q)) return 1.1;
  return 1;
}

/* =======================
   Fruit-intentie & context
   ======================= */
const FRUIT_KEYWORDS = [
  "aardbei",
  "aardbeien",
  "banaan",
  "bananen",
  "appel",
  "appels",
  "peer",
  "peren",
  "druif",
  "druiven",
  "mango",
  "ananas",
  "perzik",
  "kiwi",
  "sinaasappel",
  "citroen",
  "watermeloen",
  "mandarijn",
  "framboos",
  "bosbes",
  "blauwe bes",
  "blauwebes",
];

const FRUIT_CONTEXT_BLOCKERS = [
  "yoghurt",
  "kwark",
  "vla",
  "dessert",
  "toetje",
  "smoothie",
  "ijs",
  "baby",
  "babyvoeding",
  "snack",
  "cake",
  "taart",
  "koek",
  "reep",
  "pudding",
  "drink",
  "fristi",
];

function contextualRelevanceBoost(query, product) {
  const q = query.toLowerCase();
  const name = product.name.toLowerCase();
  const cat = product.unifiedCategory?.toLowerCase() || "";

  let boost = 1;

  if (FRUIT_KEYWORDS.includes(q)) {
    if (cat === "produce") boost += 0.4; // verse fruit voorrang
    if (FRUIT_CONTEXT_BLOCKERS.some((bad) => name.includes(bad))) boost -= 0.4;
    if (name === q || name.startsWith(q + " ")) boost += 0.5; // exact "Banaan", "Aardbeien 250g"
  }

  return Math.max(0.1, boost);
}

/* =======================
   Zelflerende boosts (lookup)
   ======================= */
let LEARNED_BOOSTS = {}; // { query: { category: weight0..1 } }

export function setLearnedBoosts(obj) {
  if (obj && typeof obj === "object") LEARNED_BOOSTS = obj;
}

/**
 * Optioneel automatisch laden van /data/learned_boosts.json
 * Call dit 1x bij app start; silently ignore bij 404.
 */
export async function loadLearnedBoosts(url = "/data/learned_boosts.json") {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setLearnedBoosts(data || {});
    if (DEBUG) console.log("Loaded learned boosts:", data);
  } catch (e) {
    if (DEBUG) console.warn("learned_boosts.json not loaded:", e);
  }
}

function learnedBoostFactor(query, product) {
  const q = query.toLowerCase();
  const cat = product.unifiedCategory || "other";
  const qBoost = LEARNED_BOOSTS[q];
  if (!qBoost) return 1;
  const v = qBoost[cat];
  if (typeof v !== "number") return 1;
  // v is 0..1 distributie; schaal lichtjes zodat het een zachte boost is
  // baseline 0.5 → 1.0 factor; 1.0 → 1.25; 0.0 → 0.85
  return 0.85 + v * 0.4;
}

/* =======================
   Query normalisatie & expand
   ======================= */
function normalizeQuery(q) {
  return String(q)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandQuery(q) {
  const parts = tokenize(q);
  const extra = [];
  for (const p of parts) {
    if (WORD_VARIANTS[p]) extra.push(...WORD_VARIANTS[p]);
    if (SYNONYMS[p]) extra.push(...SYNONYMS[p]);
  }
  return [...new Set([...parts, ...extra])];
}

/* =======================
   Hybrid fuzzy scoring
   ======================= */
function hybridScore(q, name) {
  q = q.toLowerCase();
  name = name.toLowerCase();
  if (name.includes(q)) return 1.0;
  const base = sim(q, name);
  if (name.startsWith(q)) return Math.min(1, base + 0.15);
  if (name.split(/\s+/).some((w) => w.startsWith(q)))
    return Math.min(1, base + 0.1);
  return base;
}

/* =======================
   Field-weighted matching
   ======================= */
function fieldWeightedScore(query, product) {
  const fields = [
    { text: product.name, weight: 0.6 },
    { text: product.brand, weight: 0.3 },
    { text: product.unifiedCategory, weight: 0.1 },
  ];
  let total = 0;
  for (const f of fields) {
    if (!f.text) continue;
    total += hybridScore(query, f.text) * f.weight;
  }
  return total;
}

function multiWordScore(query, product) {
  const words = expandQuery(normalizeQuery(query));
  let sum = 0;
  for (const w of words) sum += fieldWeightedScore(w, product);
  return sum / Math.max(1, words.length);
}

/* =======================
   Adaptive threshold
   ======================= */
function adaptiveThreshold(query) {
  const q = normalizeQuery(query);
  const len = q.length;
  const words = q.split(" ").length;
  if (words > 2) return 0.5;
  if (len <= 3) return 0.75;
  if (len <= 6) return 0.65;
  return 0.6;
}

/* =======================
   Score Matching (compat)
   ======================= */
function dynThresh(len) {
  if (len <= 2) return 0.0;
  if (len === 3) return 0.68;
  if (len <= 5) return 0.74;
  if (len <= 7) return 0.77;
  return 0.8;
}
function bestWordScore(qw, nameWords) {
  for (const w of nameWords) {
    if (w.startsWith(qw))
      return { score: Math.abs(w.length - qw.length) <= 2 ? 1.0 : 0.8 };
  }
  let best = 0;
  for (const w of nameWords) best = Math.max(best, sim(qw, w));
  return { score: best };
}
function scoreMatch(query, productName) {
  const q = query.toLowerCase().trim();
  const n = productName.toLowerCase().trim();
  if (!q) return 0.0;
  const qWords = tokenize(q);
  const nWords = tokenize(n);
  if (!qWords.length || !nWords.length) return 0.0;
  const perWord = qWords.map((qw) => bestWordScore(qw, nWords));
  for (let i = 0; i < qWords.length; i++)
    if (perWord[i].score < dynThresh(qWords[i].length)) return 0.0;
  let avg = perWord.reduce((a, x) => a + x.score, 0) / qWords.length;
  if (n.includes(q)) avg = Math.min(1, avg + 0.05);
  return avg;
}

/* =======================
   Sorting helpers
   ======================= */
function defaultSort(a, b) {
  // primair op veld 'score'
  if (b.score !== a.score) return b.score - a.score;
  // dan promotie
  if (!!b.promoPrice !== !!a.promoPrice) return b.promoPrice ? 1 : -1;
  // dan ppu
  if (a.pricePerUnit !== b.pricePerUnit) return a.pricePerUnit - b.pricePerUnit;
  // alfabetisch
  return a.name.localeCompare(b.name);
}

/* =======================
   Search Products (v2)
   ======================= */
   export function searchProducts(
     products,
     query = "",
     chosenCategory = null,
     sortBy = "score"
   ) {
     if (!Array.isArray(products)) return [];
     const qRaw = String(query || "");
     const q = normalizeQuery(qRaw);
     if (q.length < 2) return []; // require at least 2 characters

     // Determine active stores (to filter out disabled ones)
     const storeData = getEnabledStores();
     let enabledStores = [];
     if (Array.isArray(storeData)) {
       enabledStores = storeData.map((s) => String(s).toLowerCase());
     } else if (storeData && typeof storeData === "object") {
       enabledStores = Object.keys(storeData)
         .filter((key) => storeData[key])
         .map((s) => s.toLowerCase());
     }

     // Precompute query tokens and their synonyms/variants as groups
     const tokens = tokenize(q); // e.g. "banaan" -> ["banaan"]
     const tokenGroups = tokens.map((token) => {
       let group = [token];
       if (WORD_VARIANTS[token]) group.push(...WORD_VARIANTS[token]);
       if (SYNONYMS[token]) group.push(...SYNONYMS[token]);
       // Trim and deduplicate
       group = group.map((t) => t.toLowerCase().trim()).filter(Boolean);
       return Array.from(new Set(group));
     });

     const threshold = adaptiveThreshold(q);
     const results = [];

     for (const p of products) {
       const storeKey = (p.store || "").toLowerCase();
       if (!enabledStores.includes(storeKey)) continue; // skip disabled stores
       if (chosenCategory && p.unifiedCategory !== chosenCategory) continue; // filter by category if applied

       // **Contextual exclusion for fruit queries**:
       // If the query is a single fruit name and product is in baby category, skip it (unless query explicitly contains 'baby').
       const isFruitQuery =
         tokens.length === 1 && FRUIT_KEYWORDS.includes(tokens[0]);
       if (
         isFruitQuery &&
         !q.includes("baby") &&
         p.unifiedCategory === "baby"
       ) {
         continue;
       }

       // Calculate field-weighted fuzzy match score for each token group (synonym OR-group)
       let totalScore = 0;
       for (const group of tokenGroups) {
         let bestScore = 0;
         for (const term of group) {
           const termScore = fieldWeightedScore(term, p);
           if (termScore > bestScore) {
             bestScore = termScore;
           }
           // If exact substring match found, we can break early for this term (optional optimization)
           if (bestScore >= 0.999) break;
         }
         totalScore += bestScore;
         // If any group scores 0 (no match at all for one query term), we can break out early as the product won't fully match.
         if (bestScore === 0) {
           totalScore = 0;
           break;
         }
       }
       const avgScore =
         tokenGroups.length > 0 ? totalScore / tokenGroups.length : 0;

       // Apply semantic and contextual adjustments
       const semanticFactor = semanticFilter(q, p);
       const contextFactor = contextualRelevanceBoost(q, p);
       const learnedFactor = learnedBoostFactor(q, p);
       let score = avgScore * semanticFactor * contextFactor * learnedFactor;

       if (score >= threshold) {
         results.push({ ...p, score });
       }
     }

     // Sort results by chosen method
     if (sortBy === "ppu") {
       results.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
     } else if (sortBy === "price") {
       results.sort((a, b) => a.price - b.price);
     } else if (sortBy === "alpha") {
       results.sort((a, b) => a.name.localeCompare(b.name));
     } else if (sortBy === "promo") {
       results.sort((a, b) => {
         // Sort promo items first, then by default score sort
         if (!!b.promoPrice !== !!a.promoPrice) return b.promoPrice ? 1 : -1;
         return b.score - a.score || a.name.localeCompare(b.name);
       });
     } else {
       // Default: sort by score (descending), then by name as tie-breaker
       results.sort(
         (a, b) => b.score - a.score || a.name.localeCompare(b.name)
       );
     }
     return results;
   }

/* =======================
   Debug utils (optioneel)
   ======================= */
export function _debugExplainScore(query, product) {
  const parts = {
    fieldWeighted: fieldWeightedScore(query, product),
    multiWord: multiWordScore(query, product),
    semantic: semanticFilter(query, product),
    context: contextualRelevanceBoost(query, product),
    learned: learnedBoostFactor(query, product),
    legacy: scoreMatch(query, product.name),
  };
  const composed =
    parts.multiWord * parts.semantic * parts.context * parts.learned;
  return { parts, composed, threshold: adaptiveThreshold(query) };
}

function grabSizeFromText(s) {
  if (!s) return null;
  const t = String(s).toLowerCase();

  // multipack: "6 x 33 cl", "2x250 g"
  const mMulti = t.match(
    /(\d+)\s*[x×]\s*([\d.,]+)\s*(kg|g|gram|l|liter|ml|cl|dl)/i
  );
  if (mMulti) return `${mMulti[1]} x ${mMulti[2]} ${mMulti[3]}`;

  // enkelvoudig: "350 g", "0,75 l", "330 ml", "33 cl"
  const mSingle = t.match(/([\d.,]+)\s*(kg|g|gram|l|liter|ml|cl|dl)\b/i);
  if (mSingle) return `${mSingle[1]} ${mSingle[2]}`;

  // stuks: "3 stuks"
  const mPieces = t.match(/(\d+)\s*(stuks?|st|pcs?)/i);
  if (mPieces) return `${mPieces[1]} stuks`;

  // "per stuk"
  if (/\bper\s*stuk\b/i.test(t)) return "per stuk";

  return null;
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}
