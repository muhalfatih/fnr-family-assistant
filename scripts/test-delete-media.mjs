import fs from "fs";
import path from "path";
import { deleteReceiptMedia } from "../src/lib/storage/r2.ts";

console.log("=== Testing Transaction Media Deletion ===");

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

async function run() {
  // 1. Create a dummy receipt file on local disk
  const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const testFileName = `test_delete_${Date.now()}.jpg`;
  const testFilePath = path.join(uploadDir, testFileName);
  fs.writeFileSync(testFilePath, Buffer.from("dummy receipt image bytes"));
  assert(fs.existsSync(testFilePath), `Test receipt file created at: ${testFileName}`);

  // 2. Call deleteReceiptMedia using local_receipts/ key
  const res1 = await deleteReceiptMedia({
    fileId: `local_receipts/${testFileName}`,
    viewUrl: `/uploads/receipts/${testFileName}`,
  });

  assert(
    !fs.existsSync(testFilePath),
    `Local receipt file successfully deleted from disk by deleteReceiptMedia`
  );
  assert(
    res1.deletedFrom.some((d) => d.includes("local_storage")),
    `Reported deleted from local_storage: ${JSON.stringify(res1.deletedFrom)}`
  );

  // 3. Test non-existent file handling (graceful, no throw)
  const res2 = await deleteReceiptMedia({
    fileId: `receipts/2026/09/non_existent.jpg`,
    viewUrl: `https://fake.r2.dev/receipts/2026/09/non_existent.jpg`,
  });

  assert(
    Array.isArray(res2.deletedFrom),
    `Handles non-existent or remote files gracefully without throwing unhandled exceptions`
  );

  console.log(`\nMedia Deletion Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run();
