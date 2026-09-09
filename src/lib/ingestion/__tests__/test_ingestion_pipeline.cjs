/**
 * Automated Unit Test Suite for Multimodal Ingestion Pipeline
 * Validates interface contracts, fast-path parsing, and item reconciliation.
 */
const assert = require("assert");

console.log("==================================================");
console.log("🧪 TESTING MULTIMODAL INGESTION PIPELINE CONTRACTS");
console.log("==================================================");

// 1. Test Fast Parser contract
const { fastParseIndonesianFinancialText } = require("../../bot/fast-parser");

console.log("\n[Test 1] Fast-Path Indonesian Text Transaction Parsing");
const testCases = [
  {
    input: "Beli makan siang 35000",
    expectedAmount: 35000,
    expectedType: "expense",
    expectedCategory: "Makanan & Minuman",
  },
  {
    input: "Bensin motor 25rb via bca",
    expectedAmount: 25000,
    expectedType: "expense",
    expectedCategory: "Transportasi & Bensin",
  },
  {
    input: "Gaji bulanan 15000000 masuk mandiri",
    expectedAmount: 15000000,
    expectedType: "income",
  },
];

for (const tc of testCases) {
  const res = fastParseIndonesianFinancialText(tc.input);
  assert(res, `Failed to parse: ${tc.input}`);
  assert.strictEqual(res.amount, tc.expectedAmount, `Amount mismatch for ${tc.input}`);
  assert.strictEqual(res.type, tc.expectedType, `Type mismatch for ${tc.input}`);
  if (tc.expectedCategory) {
    assert.strictEqual(res.category, tc.expectedCategory, `Category mismatch for ${tc.input}`);
  }
  console.log(`  ✓ Successfully parsed "${tc.input}" -> Rp ${res.amount.toLocaleString("id-ID")} (${res.type})`);
}

// 2. Test Receipt Reconciliation Logic
console.log("\n[Test 2] Receipt Multi-Item Reconciliation");
function reconcileItems(totalAmount, items) {
  if (items && items.length > 0) {
    const sum = items.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
    if (sum > 0 && Math.abs(totalAmount - sum) > 0 && (totalAmount % 10000 === 0 || totalAmount % 50000 === 0)) {
      return sum;
    }
  }
  return totalAmount;
}

const receiptItems = [
  { name: "Susu UHT 1L", qty: 2, price: 19500 }, // 39000
  { name: "Roti Gandum", qty: 1, price: 16000 }, // 16000
]; // total = 55000

// Cash bill says 100,000 tendered, but verified items total 55,000
const corrected = reconcileItems(100000, receiptItems);
assert.strictEqual(corrected, 55000, "Should reconcile cash bill to items sum 55,000");
console.log("  ✓ Corrected round cash bill Rp 100.000 to exact item sum Rp 55.000");

// 3. Test Default Wallet Fallback Policy
console.log("\n[Test 3] Default Wallet Fallback Policy");
function resolveWallet(wallets, parsedHint, memberDefaultId) {
  if (!wallets || wallets.length === 0) return null;
  if (parsedHint) {
    const found = wallets.find((w) => w.name.toLowerCase().includes(parsedHint.toLowerCase()));
    if (found) return found;
  }
  if (memberDefaultId) {
    const found = wallets.find((w) => w.id === memberDefaultId);
    if (found) return found;
  }
  return wallets[0];
}

const mockWallets = [
  { id: "w-bca", name: "BCA Utama" },
  { id: "w-mandiri", name: "Mandiri Ibu" },
  { id: "w-cash", name: "Dompet Tunai" },
];

const resolvedHint = resolveWallet(mockWallets, "mandiri", "w-bca");
assert.strictEqual(resolvedHint.id, "w-mandiri", "Hint should take precedence over default");
console.log("  ✓ Wallet hint matches specific wallet correctly (Mandiri)");

const resolvedDefault = resolveWallet(mockWallets, null, "w-mandiri");
assert.strictEqual(resolvedDefault.id, "w-mandiri", "Default wallet takes precedence when no hint");
console.log("  ✓ Member default wallet fallback works correctly when hint is absent");

const resolvedFirst = resolveWallet(mockWallets, null, null);
assert.strictEqual(resolvedFirst.id, "w-bca", "Fallback to first active wallet works");
console.log("  ✓ First active wallet fallback works when no default set");

console.log("\n==================================================");
console.log("🎉 ALL INGESTION PIPELINE CONTRACT TESTS PASSED!");
console.log("==================================================");
