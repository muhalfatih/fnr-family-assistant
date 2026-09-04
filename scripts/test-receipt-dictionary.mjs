import { normalizeReceiptItemName } from "../src/lib/gemini/receipt-dictionary.ts";
import { verifyAndReconcileReceipt } from "../src/lib/gemini/parser.ts";

console.log("=== Testing Indonesian Retail POS Receipt Abbreviation Dictionary ===");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// 1. User specific requirement test
const res1 = normalizeReceiptItemName("INDOMILK SKMP POUCH S");
assert(
  res1.name === "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch (S)",
  `'INDOMILK SKMP POUCH S' => '${res1.name}'`
);
assert(res1.raw_name === "INDOMILK SKMP POUCH S", `raw_name preserved: '${res1.raw_name}'`);

// 2. Cooking oil tests
const res2 = normalizeReceiptItemName("MYK GRNG 2L");
assert(res2.name === "Minyak Goreng 2L", `'MYK GRNG 2L' => '${res2.name}'`);

const res3 = normalizeReceiptItemName("BIMOLI SPCL 2L");
assert(res3.name === "Minyak Goreng Bimoli Spesial 2L", `'BIMOLI SPCL 2L' => '${res3.name}'`);

// 3. Fresh food / eggs test
const res4 = normalizeReceiptItemName("TLR AYM NGR 1KG");
assert(res4.name === "Telur Ayam Negeri 1kg", `'TLR AYM NGR 1KG' => '${res4.name}'`);

// 4. Household / detergent test
const res5 = normalizeReceiptItemName("RNS DET BUBUK 800G");
assert(res5.name === "Rinso Deterjen Bubuk 800g", `'RNS DET BUBUK 800G' => '${res5.name}'`);

// 5. Noodles & beverages
const res6 = normalizeReceiptItemName("INDOMIE GRG SPCL");
assert(res6.name === "Indomie Goreng Spesial", `'INDOMIE GRG SPCL' => '${res6.name}'`);

const res7 = normalizeReceiptItemName("AQUA AIR MNRL 600ML");
assert(res7.name === "Aqua Air Mineral 600ml", `'AQUA AIR MNRL 600ML' => '${res7.name}'`);

// 6. Already clean items should be preserved
const res8 = normalizeReceiptItemName("Beras Pandan Wangi 5kg");
assert(res8.name === "Beras Pandan Wangi 5kg", `'Beras Pandan Wangi 5kg' => preserved '${res8.name}'`);

// 7. Test verifyAndReconcileReceipt pipeline integration
const mockParsedTx = {
  confidence: 0.95,
  type: "expense",
  amount: 46600,
  category: "Belanja Bulanan / Groceries",
  description: "Belanja Supermarket",
  items: [
    { name: "INDOMILK SKMP POUCH S", qty: 1, price: 18500 },
    { name: "MYK GRNG 2L", qty: 1, price: 28100 },
  ],
};

const reconciled = verifyAndReconcileReceipt(mockParsedTx);
assert(
  reconciled.items[0].name === "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch (S)",
  `Reconciler translated item 0 to '${reconciled.items[0].name}'`
);
assert(
  reconciled.items[0].raw_name === "INDOMILK SKMP POUCH S",
  `Reconciler stored raw_name '${reconciled.items[0].raw_name}'`
);
assert(
  reconciled.items[1].name === "Minyak Goreng 2L",
  `Reconciler translated item 1 to '${reconciled.items[1].name}'`
);

console.log(`\nReceipt Dictionary Results: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
