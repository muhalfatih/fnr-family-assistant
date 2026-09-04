import { normalizeReceiptItemName } from "../src/lib/gemini/receipt-dictionary.ts";

const testCases = [
  // 1. Dimension cases - Meter (m)
  { input: "Spanduk 5x3", expected: "Spanduk 5x3 m" },
  { input: "SPANDUK 5X3", expected: "Spanduk 5x3 m" },
  { input: "TERPAL 4X6", expected: "Terpal 4x6 m" },
  { input: "Banner 3x1", expected: "Banner 3x1 m" },
  { input: "Spanduk Pecel Lele 5x3m", expected: "Spanduk Pecel Lele 5x3 m" },

  // 2. Dimension cases - Centimeter (cm)
  { input: "Tas Kain 47x 52", expected: "Tas Kain 47x52 cm" },
  { input: "TAS KAIN 47X52", expected: "Tas Kain 47x52 cm" },
  { input: "Tas Kain 47x52 cm", expected: "Tas Kain 47x52 cm" },
  { input: "Kantong Plastik 40x60", expected: "Kantong Plastik 40x60 cm" },
  { input: "PLSTK SMPH 60X100", expected: "Plastik Sampah 60x100 cm" },
  { input: "Dus Karton 30x40", expected: "Dus Karton 30x40 cm" },

  // 3. Ambiguous dimensions - Must clean up notation but NOT force units
  { input: "Papan 5x3", expected: "Papan 5x3" },
  { input: "Papan Kayu 4x6", expected: "Papan Kayu 4x6" },

  // 4. Ambiguous non-food cases - Must NOT add 'g' or arbitrary units
  { input: "Kertas F4 70", expected: "Kertas F4 70" },
  { input: "Kabel USB 100", expected: "Kabel USB 100" },
  { input: "Baterai AA 4", expected: "Baterai AA 4" },
  { input: "Baterai AA 4 pcs", expected: "Baterai AA 4 pcs" },

  // 5. Food / Grocery items - Must retain accurate units
  { input: "Indomiegrspcjumbo129", expected: "Indomie Goreng Spesial Jumbo 129g" },
  { input: "INDOMIEGRG85", expected: "Indomie Goreng 85g" },
  { input: "BISKUAT GLDN VNL 105", expected: "Biskuit Biskuat Energi Golden Vanilla 105g" },
  { input: "ULTRAMILKCKLT250", expected: "Susu UHT Ultra Milk Rasa Cokelat 250ml" },
  { input: "BEARBRAND189", expected: "Susu Steril Bear Brand 189ml" },
  { input: "BIMOLIGR2L", expected: "Minyak Goreng Bimoli 2L" },
  { input: "SUNLIGHTJERUK755", expected: "Sunlight Pencuci Piring Jeruk Nipis 755ml" },
];

console.log("=== Testing Dimensions, Ambiguity & Unit Normalization ===");
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = normalizeReceiptItemName(tc.input);
  const ok = result.name === tc.expected;
  if (ok) {
    passed++;
    console.log(`✅ PASS: "${tc.input}" -> "${result.name}"`);
  } else {
    failed++;
    console.error(`❌ FAIL: "${tc.input}"`);
    console.error(`   Expected: "${tc.expected}"`);
    console.error(`   Got:      "${result.name}"`);
  }
}

console.log(`\nSummary: ${passed} passed, ${failed} failed out of ${testCases.length} tests.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All tests passed successfully!");
}
