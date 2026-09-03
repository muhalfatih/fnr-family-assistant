// Automated Test Suite for Cloudflare R2 & Local Fallback Storage Module
import {
  isR2Configured,
  uploadReceiptToR2,
  uploadVaultDocToR2,
  getPresignedDocViewUrl,
  saveReceiptLocally,
  saveVaultDocLocally,
} from "../src/lib/storage/r2.ts";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("=================================================");
  console.log("🧪 Running Cloudflare R2 Storage Test Suite");
  console.log("=================================================\n");

  // 1. Check Configuration status
  const isConfigured = isR2Configured();
  console.log(`[Test 1] isR2Configured(): ${isConfigured ? "✅ Configured" : "ℹ️ Not configured (Local Fallback mode active)"}`);

  // 2. Test Receipt Upload (with test buffer)
  const dummyReceipt = Buffer.from("DUMMY_RECEIPT_IMAGE_CONTENT_FOR_TESTING");
  const receiptResult = await uploadReceiptToR2(dummyReceipt, "test_struk.jpg", "image/jpeg");

  if (!receiptResult || !receiptResult.fileId) {
    throw new Error("❌ Test 2 Failed: Receipt upload returned empty result");
  }
  console.log(`[Test 2] uploadReceiptToR2(): ✅ Success`);
  console.log(`         Provider: ${receiptResult.storageProvider}`);
  console.log(`         URL: ${receiptResult.url || receiptResult.fileId}`);

  // 3. Test Vault Document Upload
  const dummyDoc = Buffer.from("%PDF-1.4 DUMMY_VAULT_DOCUMENT_FOR_TESTING");
  const vaultResult = await uploadVaultDocToR2(dummyDoc, "test_ktp.pdf", "identity", "application/pdf");

  if (!vaultResult || !vaultResult.fileId) {
    throw new Error("❌ Test 3 Failed: Vault doc upload returned empty result");
  }
  console.log(`[Test 3] uploadVaultDocToR2(): ✅ Success`);
  console.log(`         Provider: ${vaultResult.storageProvider}`);
  console.log(`         Key: ${vaultResult.key}`);

  // 4. Test Presigned View URL Generation
  const viewUrl = await getPresignedDocViewUrl(vaultResult.key);
  if (!viewUrl) {
    throw new Error("❌ Test 4 Failed: getPresignedDocViewUrl returned empty url");
  }
  console.log(`[Test 4] getPresignedDocViewUrl(): ✅ Success`);
  console.log(`         Resolved View URL: ${viewUrl}`);

  // Clean up test files if saved locally
  try {
    const testReceiptPath = path.join(process.cwd(), "public", "uploads", "receipts", "test_struk.jpg");
    if (fs.existsSync(testReceiptPath)) fs.unlinkSync(testReceiptPath);
    const testDocPath = path.join(process.cwd(), "public", "uploads", "vault", "identity", "test_ktp.pdf");
    if (fs.existsSync(testDocPath)) fs.unlinkSync(testDocPath);
  } catch (_) {}

  console.log("\n=================================================");
  console.log("🎉 All Cloudflare R2 storage tests PASSED!");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
