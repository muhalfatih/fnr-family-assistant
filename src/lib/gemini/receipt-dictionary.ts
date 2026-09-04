/**
 * Indonesian Supermarket & Retail POS Receipt Abbreviation Dictionary
 * Expands cryptic POS cash-register abbreviations (Indomaret, Alfamart, Superindo, Hypermart, etc.)
 * into clear, readable, standard Indonesian product descriptions.
 */

/**
 * Deconstructs compact or concatenated POS retail shorthand codes
 * e.g. "Indomiegrspcjumbo129" -> "Indomiegrspcjumbo 129g"
 * e.g. "Bimoligr2L" -> "Bimoligr 2L"
 * e.g. "Ultramilkcklt250" -> "Ultramilkcklt 250ml"
 */
export function deconstructPOSCode(text: string): string {
  if (!text) return "";
  let s = text.trim();

  // 1. Separate attached trailing numbers and infer units
  s = s.replace(/([a-zA-Z]+)(\d+)(g|gr|kg|ml|l|liter|pcs|pack)?\b/gi, (match, word, num, unit) => {
    if (unit) return `${word} ${num}${unit.toLowerCase()}`;
    const n = parseInt(num, 10);
    // Drinks/dairy/toiletries sizes: 189, 200, 250, 300, 330, 450, 500, 600, 755, 780, 800, 1000, 1500
    if (/ultra|bear|aqua|lemin|indomilk|pcr|pocari|teh|cleo|sunlight|sml/i.test(word) && [189, 200, 250, 300, 330, 450, 500, 600, 755, 780, 800, 1000, 1500].includes(n)) {
      return `${word} ${num}ml`;
    }
    // Cooking oil sizes: 1, 2
    if (/bimoli|sania|filma|tropical|sunco|kunci/i.test(word) && (n === 1 || n === 2)) {
      return `${word} ${num}L`;
    }
    // Packaged food / noodles grammage: 40g to 999g
    if (n >= 40 && n <= 999) {
      return `${word} ${num}g`;
    }
    // Kilogram items
    if (n >= 1000 && n % 1000 === 0) {
      return `${word} ${n / 1000}kg`;
    }
    return `${word} ${num}`;
  });

  // 2. Format standalone trailing numbers at the very end of retail item description: e.g. "BISKUAT GLDN VNL 105" -> "105g"
  s = s.replace(/\s+(\d+)\s*$/g, (match, num) => {
    const n = parseInt(num, 10);
    if (n >= 40 && n <= 999) return ` ${num}g`;
    if ([189, 200, 250, 300, 330, 450, 500, 600, 755, 780, 800].includes(n)) return ` ${num}ml`;
    return match;
  });

  return s;
}

// Multi-word phrase expansions (highest precedence)
const EXACT_PHRASE_EXPANSIONS: Array<[RegExp, string]> = [
  // Bakery, Biscuits & Snacks (User specific retail patterns)
  [/\bSR\.?\s*TOGO\s*BLACK\b/gi, "Sari Roti Sandwich To Go Rasa Black Cokelat"],
  [/\bSR\.?\s*TOGO\s*COKELAT\b/gi, "Sari Roti Sandwich To Go Rasa Cokelat"],
  [/\bSR\.?\s*TOGO\s*KEJU\b/gi, "Sari Roti Sandwich To Go Rasa Keju"],
  [/\bSR\.?\s*TOGO\b/gi, "Sari Roti Sandwich To Go"],
  [/\bBISKUAT\s*GLDN\s*VNL\s*105\b/gi, "Biskuit Biskuat Energi Golden Vanilla 105g"],
  [/\bBISKUAT\s*GLDN\s*VNL\b/gi, "Biskuit Biskuat Energi Golden Vanilla"],
  [/\bBISKUAT\s*GOLDEN\s*VANILLA\b/gi, "Biskuit Biskuat Energi Golden Vanilla"],
  [/\bBISKUAT\s*COKELAT\b/gi, "Biskuit Biskuat Energi Cokelat"],
  [/\bOREO\s*(KRIM\s*)?V(A)?N(I)?L(LA)?\b/gi, "Biskuit Oreo Krim Rasa Vanilla"],
  [/\bOREO\s*(KRIM\s*)?C(O)?KL(T|AT)?\b/gi, "Biskuit Oreo Krim Rasa Cokelat"],

  // Dairy & Milks (Ultra Milk, Bear Brand, Indomilk, Frisian Flag)
  [/\bULTRA(\s*MILK)?\s*C(O)?KL(T|AT)?\b/gi, "Susu UHT Ultra Milk Rasa Cokelat"],
  [/\bULTRA(\s*MILK)?\s*PLAIN\b/gi, "Susu UHT Ultra Milk Rasa Plain"],
  [/\bULTRA(\s*MILK)?\s*ST(RAW|R)?(B|BERRY)?\b/gi, "Susu UHT Ultra Milk Rasa Strawberry"],
  [/\bULTRA(\s*MILK)?\s*FULL\s*CREAM\b/gi, "Susu UHT Ultra Milk Full Cream"],
  [/\bINDOMILK\s*SKMP\s*POUCH\s*S\b/gi, "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch (S)"],
  [/\bINDOMILK\s*SKMP\s*POUCH\b/gi, "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch"],
  [/\bINDOMILK\s*SKMC\s*POUCH\b/gi, "Indomilk Susu Kental Manis Cokelat (SKMC) Kemasan Pouch"],
  [/\bINDOMILK\s*SKMP\b/gi, "Indomilk Susu Kental Manis Putih (SKMP)"],
  [/\bINDOMILK\s*SKMC\b/gi, "Indomilk Susu Kental Manis Cokelat (SKMC)"],
  [/\bFF\s*SKMP\s*POUCH\b/gi, "Frisian Flag Susu Kental Manis Putih (SKMP) Kemasan Pouch"],
  [/\bFF\s*SKMC\s*POUCH\b/gi, "Frisian Flag Susu Kental Manis Cokelat (SKMC) Kemasan Pouch"],
  [/\b(FRISIAN\s*FLAG|FF)\s*SKMP\b/gi, "Frisian Flag Susu Kental Manis Putih (SKMP)"],
  [/\b(FRISIAN\s*FLAG|FF)\s*SKMC\b/gi, "Frisian Flag Susu Kental Manis Cokelat (SKMC)"],
  [/\b(BDG\s*)?BEAR\s*BRAND\b/gi, "Susu Steril Bear Brand"],
  [/\bUHT\s*FLV\b/gi, "Susu UHT Aneka Rasa"],

  // Cooking Oils & Flour
  [/\b(MYK|MINYAK)\s*(GRG|GOR|GRNG|GORENG|GR)\b/gi, "Minyak Goreng"],
  [/\bBIMOLI\s*SP(C|CL)?\b/gi, "Minyak Goreng Bimoli Spesial"],
  [/\bBML\s*SP(C|CL)?\b/gi, "Minyak Goreng Bimoli Spesial"],
  [/\bBIMOLI\s*GR(G|NG)?\b/gi, "Minyak Goreng Bimoli"],
  [/\bSANIA\s*GR(G|NG)?\b/gi, "Minyak Goreng Sania"],
  [/\bFILMA\s*GR(G|NG)?\b/gi, "Minyak Goreng Filma"],
  [/\bTROPICAL\s*GR(G|NG)?\b/gi, "Minyak Goreng Tropical"],
  [/\bSUNCO\s*GR(G|NG)?\b/gi, "Minyak Goreng SunCo"],
  [/\bTPG\s*TRG\b/gi, "Tepung Terigu"],
  [/\bTPG\s*BRS\b/gi, "Tepung Beras"],
  [/\bTPG\s*TPK\b/gi, "Tepung Tapioka"],
  [/\b(SG3|SEGITIGA)\s*BIRU\b/gi, "Tepung Terigu Segitiga Biru"],
  [/\bSEGITIGA\s*BR\b/gi, "Tepung Terigu Segitiga Biru"],
  [/\bC(A)?KR(A)?\s*K(E)?MB(A)?R\b/gi, "Tepung Terigu Cakra Kembar"],
  [/\bGULAKU(\s*PSR)?\b/gi, "Gula Pasir Gulaku"],
  [/\b(GLA|GUL|GULA)\s*PSR\b/gi, "Gula Pasir"],

  // Fresh & Meats
  [/\b(TLR|TLLR)\s*AYM\s*NGR\b/gi, "Telur Ayam Negeri"],
  [/\b(TLR|TLLR)\s*AYM\s*KMPG\b/gi, "Telur Ayam Kampung"],
  [/\b(TLR|TLLR)\s*AYM\b/gi, "Telur Ayam"],
  [/\b(TLR|TLLR)\s*BEBEK\b/gi, "Telur Bebek"],
  [/\bDGG?\s*SAPI\b/gi, "Daging Sapi"],
  [/\bAYM\s*FLT\b/gi, "Daging Ayam Fillet"],
  [/\bAYM\s*BROILER\b/gi, "Ayam Broiler Segar"],
  [/\bBWG\s*MRH\b/gi, "Bawang Merah"],
  [/\bBWG\s*PTH\b/gi, "Bawang Putih"],
  [/\bCBE\s*MRH\s*KRT\b/gi, "Cabai Merah Keriting"],
  [/\bCBE\s*RWT\s*MRH\b/gi, "Cabai Rawit Merah"],

  // Household & Detergent
  [/\bR(I)?NS(O)?\s*DET\s*BUBUK\b/gi, "Rinso Deterjen Bubuk"],
  [/\bR(I)?NS(O)?\s*DET\s*CAIR\b/gi, "Rinso Deterjen Cair"],
  [/\bR(I)?NS(O)?\s*MAT(I)?C\b/gi, "Rinso Deterjen Matic"],
  [/\bDET\s*BUBUK\b/gi, "Deterjen Bubuk"],
  [/\bDET\s*CAIR\b/gi, "Deterjen Cair"],
  [/\bDET\s*MATIC\b/gi, "Deterjen Mesin Cuci Matic"],
  [/\bSBN\s*CUC(I)?\s*P(I)?R(I)?NG\b/gi, "Sabun Cuci Piring"],
  [/\bSUNLIGHT\s*(JERUK|NIPIS|EXTRA)?\b/gi, "Sunlight Pencuci Piring Jeruk Nipis"],
  [/\bSML\s*EXTRA\b/gi, "Sunlight Ekstra Higienis"],
  [/\bPST\s*G(I)?G(I)?\b/gi, "Pasta Gigi"],
  [/\b(MAMY|MM)\s*POKO\b/gi, "MamyPoko Popok Bayi"],

  // Noodles (Indomie, Mie Sedaap, Sarimi, Pop Mie)
  [/\bINDOMIE\s*GR(G|NG)?\s*SP(C|CL)?\s*JUMBO\b/gi, "Indomie Goreng Spesial Jumbo"],
  [/\bINDOMIE\s*GR(G|NG)?\s*SP(C|CL)?\b/gi, "Indomie Goreng Spesial"],
  [/\bINDOMIE\s*GR(G|NG)?\s*JUMBO\b/gi, "Indomie Goreng Jumbo"],
  [/\b(INDOMIE|INDM)\s*GR(G|NG)?\b/gi, "Indomie Goreng"],
  [/\b(INDOMIE|INDM)\s*AYM\s*BWG\b/gi, "Indomie Kuah Rasa Ayam Bawang"],
  [/\b(INDOMIE|INDM)\s*AYAM\s*BAWANG\b/gi, "Indomie Kuah Rasa Ayam Bawang"],
  [/\b(INDOMIE|INDM)\s*SOTO(\s*MIE)?\b/gi, "Indomie Kuah Rasa Soto Mie"],
  [/\b(INDOMIE|INDM)\s*KARI(\s*AYAM)?\b/gi, "Indomie Kuah Rasa Kari Ayam"],
  [/\b(INDOMIE|INDM)\s*AYM\s*SP(C|CL)?\b/gi, "Indomie Kuah Rasa Ayam Spesial"],
  [/\b(INDOMIE|INDM)\s*RICA\b/gi, "Indomie Goreng Rasa Rica-Rica"],
  [/\b(INDOMIE|INDM)\s*ACEH\b/gi, "Indomie Goreng Rasa Mi Aceh"],
  [/\b(INDOMIE|INDM)\s*RENDANG\b/gi, "Indomie Goreng Rasa Rendang"],
  [/\b(INDOMIE|INDM)\s*SEBLAK\b/gi, "Indomie Hype Abis Rasa Seblak Hot"],
  [/\b(INDOMIE|INDM)\s*GEPREK\b/gi, "Indomie Hype Abis Rasa Ayam Geprek"],
  [/\b(INDOMIE|INDM)\s*KU(A)?H\b/gi, "Indomie Kuah"],
  [/\b(MIE\s*)?S(E)?D(AA)?P\s*GR(G|NG)?\b/gi, "Mie Sedaap Goreng"],
  [/\b(MIE\s*)?S(E)?D(AA)?P\s*SOTO\b/gi, "Mie Sedaap Rasa Soto"],
  [/\b(MIE\s*)?S(E)?D(AA)?P\s*AYM\s*BWG\b/gi, "Mie Sedaap Rasa Ayam Bawang"],
  [/\b(MIE\s*)?S(E)?D(AA)?P\s*KOREAN(\s*SPICY)?\b/gi, "Mie Sedaap Korean Spicy"],
  [/\bSARIMI\s*ISI\s*2\b/gi, "Sarimi Isi 2"],
  [/\bPOPMIE\s*AYM\b/gi, "Pop Mie Rasa Ayam"],
  [/\bPOPMIE\s*B(A)?SO\b/gi, "Pop Mie Rasa Baso"],

  // Drinks & Water
  [/\bPCR\s*SWT\b/gi, "Pocari Sweat"],
  [/\bPOCARI\s*SWEAT\b/gi, "Pocari Sweat"],
  [/\b(AQ|AQUA)\s*(AIR\s*)?MNRL\b/gi, "Aqua Air Mineral"],
  [/\bAIR\s*MNRL\b/gi, "Air Mineral"],
  [/\bLE\s*M(I)?N(E)?R(A)?L(E)?\b/gi, "Le Minerale Air Mineral"],
  [/\b(TH|TEH)\s*BTL\b/gi, "Teh Botol Sosro"],
  [/\b(TH|TEH)\s*KTK\b/gi, "Teh Kotak Ultra"],
];

// Single word/token replacements
const WORD_TOKEN_REPLACEMENTS: Record<string, string> = {
  // Common Retail Abbreviations
  "MYK": "Minyak",
  "GRG": "Goreng",
  "GOR": "Goreng",
  "GRNG": "Goreng",
  "BGG": "Bahan",
  "TRG": "Terigu",
  "TPG": "Tepung",
  "GLA": "Gula",
  "GUL": "Gula",
  "PSR": "Pasir",
  "GRM": "Garam",
  "KCP": "Kecap",
  "MNS": "Manis",
  "ASN": "Asin",
  "SS": "Saus",
  "SAOS": "Saus",
  "SMBL": "Sambal",
  "BMB": "Bumbu",
  "TLLR": "Telur",
  "TLR": "Telur",
  "AYM": "Ayam",
  "DGG": "Daging",
  "DG": "Daging",
  "SGR": "Segar",
  "NGR": "Negeri",
  "KMPG": "Kampung",
  "BWG": "Bawang",
  "BWW": "Bawang",
  "MRH": "Merah",
  "PTH": "Putih",
  "CBE": "Cabai",
  "CBI": "Cabai",
  "RWT": "Rawit",
  "KRT": "Keriting",
  "SPCL": "Spesial",
  "SPL": "Spesial",

  // Dairy & Beverage
  "SKMP": "Susu Kental Manis Putih (SKMP)",
  "SKMC": "Susu Kental Manis Cokelat (SKMC)",
  "SKM": "Susu Kental Manis (SKM)",
  "INDMLK": "Indomilk",
  "INDMILK": "Indomilk",
  "DNCW": "Dancow",
  "MNRL": "Mineral",
  "MNRLA": "Mineral",
  "BTL": "Botol",
  "KLG": "Kaleng",
  "KTK": "Kotak",
  "PCH": "Kemasan Pouch",
  "POUCH": "Kemasan Pouch",
  "RFL": "Refill",
  "REFILL": "Refill",
  "SCH": "Sachet",
  "TP": "Twin Pack",

  // Toiletries & Cleaning
  "DET": "Deterjen",
  "RNS": "Rinso",
  "SBN": "Sabun",
  "SHP": "Sampo",
  "PST": "Pasta",
  "GGI": "Gigi",
  "PWH": "Pewangi",
  "PLMB": "Pelembut",
  "MLTO": "Molto",
  "DWNY": "Downy",
  "CLNR": "Pembersih",
  "PMPRS": "Popok Bayi",
  "PMLT": "Pembalut",
  "TISU": "Tisu",

  // Bakery, Biscuit & Snacks
  "SR": "Sari Roti",
  "TOGO": "Sandwich To Go",
  "GLDN": "Golden",
  "VNL": "Vanilla",
  "CKLT": "Cokelat",
  "CKL": "Cokelat",
  "KJU": "Keju",
  "STR": "Stroberi",
  "STWB": "Strawberry",
  "BSK": "Biskuit",
  "WFR": "Wafer",
  "KRPK": "Keripik",
  "KCG": "Kacang",
  "RTI": "Roti",
  "SDP": "Sedaap",

  // Packaging Sizes
  "KCL": "Kecil",
  "BSR": "Besar",
  "SDG": "Sedang",
  "GRSPC": "Goreng Spesial",
  "GRSPCL": "Goreng Spesial",
  "SPC": "Spesial",
  "JUMBO": "Jumbo",
  "AYMBWG": "Ayam Bawang",
};

/**
 * Formats a string to Indonesian Title Case while preserving unit suffixes and acronyms
 */
function toIndonesianTitleCase(str: string): string {
  if (!str) return "";

  return str
    .split(/\s+/)
    .map((word) => {
      // Keep acronyms in parentheses: (SKMP), (UHT), (S), (M), (L), etc.
      if (/^\([A-Za-z0-9]+\)$/.test(word)) {
        return word.toUpperCase();
      }
      // Keep weight/volume units with numbers: 2L, 500g, 1kg, 330ml
      if (/^[0-9]+(\.[0-9]+)?(ml|l|g|kg|gr|mg|pcs|pack|s)$/i.test(word)) {
        const num = word.replace(/[^0-9.]/g, "");
        const unit = word.replace(/[0-9.]/g, "").toLowerCase();
        if (unit === "l") return `${num}L`;
        if (unit === "gr") return `${num}g`;
        return `${num}${unit}`;
      }
      // Keep standard uppercase acronyms
      if (["SKMP", "SKMC", "SKM", "UHT", "BCA", "PLN", "PDAM", "SPBU", "BBM"].includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      // If already properly mixed case, keep it
      if (word.length > 1 && word.slice(1) !== word.slice(1).toUpperCase()) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Standard Title Case
      const clean = word.toLowerCase();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .join(" ")
    .trim();
}

/**
 * Expands cryptic retail item names into friendly, standardized Indonesian product names
 * @param rawName Raw string from cash register / receipt OCR (e.g. "INDOMILK SKMP POUCH S")
 * @returns Clean product name and original raw text
 */
export function normalizeReceiptItemName(rawName: string): { name: string; raw_name: string } {
  if (!rawName || typeof rawName !== "string") {
    return { name: "Produk Belanja", raw_name: rawName || "" };
  }

  const cleanRaw = rawName.trim();
  // Step 0: Deconstruct compact POS codes and infer sizing units
  let workingText = deconstructPOSCode(cleanRaw);

  // 1. Apply multi-word phrase replacements
  for (const [regex, replacement] of EXACT_PHRASE_EXPANSIONS) {
    if (regex.test(workingText)) {
      workingText = workingText.replace(regex, replacement);
    }
  }

  // 2. Tokenize and replace remaining all-caps acronym tokens
  const words = workingText.split(/\s+/);
  const normalizedWords = words.map((w, idx) => {
    // If word is already in parentheses like (SKMP) or (UHT), do not re-substitute
    if (w.startsWith("(") && w.endsWith(")")) {
      return w;
    }

    // If word is already mixed case (expanded earlier by phrase replacement), skip
    if (w !== w.toUpperCase()) {
      return w;
    }

    const cleanWord = w.replace(/^[^\w]+|[^\w]+$/g, "").toUpperCase();

    // Special case: Single letter S / M / L / XL at the end of the item name
    if (idx === words.length - 1) {
      if (cleanWord === "S") return "(S)";
      if (cleanWord === "M") return "(M)";
      if (cleanWord === "L") return "(L)";
      if (cleanWord === "XL") return "(XL)";
    }

    // Substitute all-caps acronym
    if (WORD_TOKEN_REPLACEMENTS[cleanWord]) {
      return WORD_TOKEN_REPLACEMENTS[cleanWord];
    }

    return w;
  });

  const expanded = normalizedWords
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    name: toIndonesianTitleCase(expanded),
    raw_name: cleanRaw,
  };
}
