import { verifyAndReconcileReceipt } from "../src/lib/gemini/parser.ts";

console.log("=== Testing Receipt Double-Layer Reconciler ===");

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

// Test 1: User's exact SAGALA receipt case (AI mistakenly picked CASH 50,000 note instead of TOTAL 46,600)
const testUserReceipt = {
  confidence: 0.95,
  type: "expense",
  amount: 50000, // CASH note mistakenly picked by AI
  category: "Belanja Bulanan / Groceries",
  description: "Struk SAGALA",
  merchant_name: "SAGALA",
  items: [
    { name: "INDOMILK SKMP POUCHS", qty: 1, price: 19500 },
    { name: "SR.TOGO BLACK 128GR", qty: 1, price: 7500 },
    { name: "BISKUAT GLDN VNL 105", qty: 1, price: 6000 },
    { name: "ULTRA PLAIN 250ML", qty: 2, price: 6800 },
  ],
};

const reconciled1 = verifyAndReconcileReceipt(testUserReceipt);
assert(
  reconciled1.amount === 46600,
  `User receipt: corrected cash note Rp 50,000 to exact total Rp 46,600 (got: ${reconciled1.amount})`
);

// Test 2: AI already got the exact amount right (46,600)
const testCorrectReceipt = {
  confidence: 0.98,
  type: "expense",
  amount: 46600,
  category: "Belanja Bulanan / Groceries",
  description: "Struk SAGALA",
  merchant_name: "SAGALA",
  items: [
    { name: "INDOMILK SKMP POUCHS", qty: 1, price: 19500 },
    { name: "SR.TOGO BLACK 128GR", qty: 1, price: 7500 },
    { name: "BISKUAT GLDN VNL 105", qty: 1, price: 6000 },
    { name: "ULTRA PLAIN 250ML", qty: 2, price: 6800 },
  ],
};

const reconciled2 = verifyAndReconcileReceipt(testCorrectReceipt);
assert(
  reconciled2.amount === 46600,
  `Already correct receipt: preserved Rp 46,600 (got: ${reconciled2.amount})`
);

// Test 3: Cash 100,000 handed over for 85,000 groceries
const test100kCashReceipt = {
  confidence: 0.9,
  type: "expense",
  amount: 100000, // 100k cash bill
  category: "Makanan & Minuman",
  description: "Makan Siang",
  items: [
    { name: "Nasi Goreng Spesial", qty: 2, price: 30000 },
    { name: "Es Teh Manis", qty: 2, price: 7500 },
    { name: "Kerupuk", qty: 2, price: 5000 },
  ],
};

const reconciled3 = verifyAndReconcileReceipt(test100kCashReceipt);
assert(
  reconciled3.amount === 85000,
  `100k cash note: corrected Rp 100,000 to sum Rp 85,000 (got: ${reconciled3.amount})`
);

// Test 4: Receipt without items array
const testNoItems = {
  confidence: 0.8,
  type: "expense",
  amount: 35000,
  category: "Transportasi & Bensin",
  description: "Bensin",
  items: [],
};

const reconciled4 = verifyAndReconcileReceipt(testNoItems);
assert(
  reconciled4.amount === 35000,
  `No items receipt: preserved Rp 35,000 (got: ${reconciled4.amount})`
);

console.log(`\nReconciler Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
