import { fastParseIndonesianFinancialText } from "../src/lib/bot/fast-parser.ts";

const testCases = [
  { text: "Beli beras 120rb pake BCA", expectedAmount: 120000, expectedType: "expense", expectedWallet: "BCA" },
  { text: "Bensin motor 35k tunai", expectedAmount: 35000, expectedType: "expense", expectedWallet: "Tunai" },
  { text: "Kopi susu 25.000 gopay", expectedAmount: 25000, expectedType: "expense", expectedWallet: "GoPay" },
  { text: "Gaji bulanan masuk 15jt ke mandiri", expectedAmount: 15000000, expectedType: "income", expectedWallet: "Mandiri" },
  { text: "Bayar tagihan listrik 450rb bca", expectedAmount: 450000, expectedType: "expense", expectedWallet: "BCA" },
  { text: "Jajan bakso 30rb", expectedAmount: 30000, expectedType: "expense", expectedWallet: null },
  { text: "Honor desain 2.5jt", expectedAmount: 2500000, expectedType: "income", expectedWallet: null },
  { text: "Berapa total belanja saya minggu ini?", expectedAmount: null }, // Question -> should return null
  { text: "Halo apa kabar?", expectedAmount: null }, // Chat -> should return null
];

console.log("=== Testing Fast-Path Indonesian Financial Parser ===");
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = fastParseIndonesianFinancialText(tc.text);

  if (tc.expectedAmount === null) {
    if (result === null) {
      console.log(`  [PASS] '${tc.text}' correctly returned null (deferred to AI/Q&A)`);
      passed++;
    } else {
      console.error(`  [FAIL] '${tc.text}' expected null but got:`, result);
      failed++;
    }
  } else {
    if (
      result &&
      result.amount === tc.expectedAmount &&
      result.type === tc.expectedType &&
      (tc.expectedWallet === null || result.wallet_hint === tc.expectedWallet)
    ) {
      console.log(`  [PASS] '${tc.text}' => ${result.type} Rp ${result.amount} [${result.category}] (${result.wallet_hint || "Default"}) desc: "${result.description}"`);
      passed++;
    } else {
      console.error(`  [FAIL] '${tc.text}' failed. Expected amount ${tc.expectedAmount}, got:`, result);
      failed++;
    }
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
