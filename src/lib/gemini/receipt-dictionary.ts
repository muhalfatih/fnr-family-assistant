/**
 * Indonesian Supermarket & Retail POS Receipt Abbreviation Dictionary
 * Expands cryptic POS cash-register abbreviations (Indomaret, Alfamart, Superindo, Hypermart, etc.)
 * into clear, readable, standard Indonesian product descriptions.
 */

// Multi-word phrase expansions (highest precedence)
const EXACT_PHRASE_EXPANSIONS: Array<[RegExp, string]> = [
  // Bakery, Biscuits & Snacks (User specific retail patterns)
  [/\bSR\.?\s*TOGO\s+BLACK\b/gi, "Sari Roti Sandwich To Go Rasa Black Cokelat"],
  [/\bSR\.?\s*TOGO\s+COKELAT\b/gi, "Sari Roti Sandwich To Go Rasa Cokelat"],
  [/\bSR\.?\s*TOGO\s+KEJU\b/gi, "Sari Roti Sandwich To Go Rasa Keju"],
  [/\bSR\.?\s*TOGO\b/gi, "Sari Roti Sandwich To Go"],
  [/\bBISKUAT\s+GLDN\s+VNL\s+105\b/gi, "Biskuit Biskuat Energi Golden Vanilla 105g"],
  [/\bBISKUAT\s+GLDN\s+VNL\b/gi, "Biskuit Biskuat Energi Golden Vanilla"],
  [/\bBISKUAT\s+GOLDEN\s+VANILLA\b/gi, "Biskuit Biskuat Energi Golden Vanilla"],
  [/\bBISKUAT\s+COKELAT\b/gi, "Biskuit Biskuat Energi Cokelat"],
  [/\bULTRA\s+PLAIN\b/gi, "Susu UHT Ultra Milk Plain"],
  [/\bULTRA\s+COKELAT\b/gi, "Susu UHT Ultra Milk Cokelat"],
  [/\bULTRA\s+STRAWBERRY\b/gi, "Susu UHT Ultra Milk Strawberry"],

  // Dairy & Milks
  [/\bINDOMILK\s+SKMP\s+POUCH\s+S\b/gi, "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch (S)"],
  [/\bINDOMILK\s+SKMP\s+POUCH\b/gi, "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch"],
  [/\bINDOMILK\s+SKMC\s+POUCH\b/gi, "Indomilk Susu Kental Manis Cokelat (SKMC) Kemasan Pouch"],
  [/\bFF\s+SKMP\s+POUCH\b/gi, "Frisian Flag Susu Kental Manis Putih (SKMP) Kemasan Pouch"],
  [/\bFF\s+SKMC\s+POUCH\b/gi, "Frisian Flag Susu Kental Manis Cokelat (SKMC) Kemasan Pouch"],
  [/\bBDG\s+BEAR\s+BRAND\b/gi, "Susu Steril Bear Brand"],
  [/\bBEAR\s+BRAND\b/gi, "Susu Steril Bear Brand"],
  [/\bUHT\s+FLV\b/gi, "Susu UHT Aneka Rasa"],

  // Cooking Oils & Flour
  [/\b(MYK|MINYAK)\s+(GRG|GOR|GRNG|GORENG)\b/gi, "Minyak Goreng"],
  [/\b(MYK|MINYAK)\s+GR\b/gi, "Minyak Goreng"],
  [/\bBIMOLI\s+SPCL\b/gi, "Minyak Goreng Bimoli Spesial"],
  [/\bBML\s+SPCL\b/gi, "Minyak Goreng Bimoli Spesial"],
  [/\bTPG\s+TRG\b/gi, "Tepung Terigu"],
  [/\bTPG\s+BRS\b/gi, "Tepung Beras"],
  [/\bTPG\s+TPK\b/gi, "Tepung Tapioka"],
  [/\bSG3\s+BIRU\b/gi, "Tepung Terigu Segitiga Biru"],
  [/\bSEGITIGA\s+BR\b/gi, "Tepung Terigu Segitiga Biru"],
  [/\bCKR\s+KMBR\b/gi, "Tepung Terigu Cakra Kembar"],
  [/\bGLA\s+PSR\b/gi, "Gula Pasir"],
  [/\bGUL\s+PSR\b/gi, "Gula Pasir"],
  [/\bGULA\s+PSR\b/gi, "Gula Pasir"],

  // Fresh & Meats
  [/\b(TLR|TLLR)\s+AYM\s+NGR\b/gi, "Telur Ayam Negeri"],
  [/\b(TLR|TLLR)\s+AYM\s+KMPG\b/gi, "Telur Ayam Kampung"],
  [/\b(TLR|TLLR)\s+AYM\b/gi, "Telur Ayam"],
  [/\b(TLR|TLLR)\s+BEBEK\b/gi, "Telur Bebek"],
  [/\bDGG\s+SAPI\b/gi, "Daging Sapi"],
  [/\bDG\s+SAPI\b/gi, "Daging Sapi"],
  [/\bAYM\s+FLT\b/gi, "Daging Ayam Fillet"],
  [/\bAYM\s+BROILER\b/gi, "Ayam Broiler Segar"],
  [/\bBWG\s+MRH\b/gi, "Bawang Merah"],
  [/\bBWG\s+PTH\b/gi, "Bawang Putih"],
  [/\bCBE\s+MRH\s+KRT\b/gi, "Cabai Merah Keriting"],
  [/\bCBE\s+RWT\s+MRH\b/gi, "Cabai Rawit Merah"],

  // Household & Detergent
  [/\bRNS\s+DET\s+BUBUK\b/gi, "Rinso Deterjen Bubuk"],
  [/\bRNS\s+DET\s+CAIR\b/gi, "Rinso Deterjen Cair"],
  [/\bDET\s+BUBUK\b/gi, "Deterjen Bubuk"],
  [/\bDET\s+CAIR\b/gi, "Deterjen Cair"],
  [/\bDET\s+MATIC\b/gi, "Deterjen Mesin Cuci Matic"],
  [/\bSBN\s+CUC\s+PRG\b/gi, "Sabun Cuci Piring"],
  [/\bSBN\s+CUCI\s+PIRING\b/gi, "Sabun Cuci Piring"],
  [/\bSML\s+EXTRA\b/gi, "Sunlight Ekstra Higienis"],
  [/\bPST\s+GGI\b/gi, "Pasta Gigi"],
  [/\bPST\s+GIGI\b/gi, "Pasta Gigi"],
  [/\bMM\s+POKO\b/gi, "MamyPoko Popok Bayi"],
  [/\bMAMY\s+POKO\b/gi, "MamyPoko Popok Bayi"],

  // Noodles & Drinks
  [/\bINDM\s+GRG\b/gi, "Indomie Goreng"],
  [/\bINDM\s+KUH\b/gi, "Indomie Kuah"],
  [/\bINDM\s+KUA\b/gi, "Indomie Kuah"],
  [/\bINDOMIE\s+GRG\b/gi, "Indomie Goreng"],
  [/\bINDOMIE\s+KUH\b/gi, "Indomie Kuah"],
  [/\bPCR\s+SWT\b/gi, "Pocari Sweat"],
  [/\bAQ\s+AIR\s+MNRL\b/gi, "Aqua Air Mineral"],
  [/\bAQUA\s+AIR\s+MNRL\b/gi, "Aqua Air Mineral"],
  [/\bAIR\s+MNRL\b/gi, "Air Mineral"],
  [/\bTH\s+BTL\b/gi, "Teh Botol Sosro"],
  [/\bTEH\s+BTL\b/gi, "Teh Botol"],
  [/\bTH\s+KTK\b/gi, "Teh Kotak Ultra"],
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
  let workingText = cleanRaw;

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
