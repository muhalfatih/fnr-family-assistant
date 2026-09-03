/**
 * Automated Verification Script for Document Vault WhatsApp Reminder Integration
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:1000";

async function runTests() {
  console.log("=== F&R Family Hub: Document Vault Multi-Channel Reminder Verification ===\n");
  let passed = 0;
  let failed = 0;

  // Test 1: GET /api/documents/remind?channel=whatsapp
  try {
    const res = await fetch(`${BASE_URL}/api/documents/remind?channel=whatsapp`);
    const data = await res.json();

    if (res.status === 200 && data.success === true && typeof data.whatsappSent === "boolean") {
      console.log(`  [PASS] Test 1: GET /api/documents/remind?channel=whatsapp returns 200 OK (count: ${data.count}, waSent: ${data.whatsappSent})`);
      passed++;
    } else {
      console.error("  [FAIL] Test 1: Unexpected response structure:", data);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Test 1: Network error:", err.message);
    failed++;
  }

  // Test 2: POST /api/documents/remind with channel: "all"
  try {
    const res = await fetch(`${BASE_URL}/api/documents/remind`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: "all" }),
    });
    const data = await res.json();

    if (res.status === 200 && data.success === true && Array.isArray(data.urgentDocuments)) {
      console.log(`  [PASS] Test 2: POST /api/documents/remind (channel=all) returns 200 OK (recipients: ${data.sentTo?.join(", ") || "None"})`);
      passed++;
    } else {
      console.error("  [FAIL] Test 2: Unexpected response structure:", data);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Test 2: Network error:", err.message);
    failed++;
  }

  // Test 3: POST /api/documents/remind with channel: "telegram"
  try {
    const res = await fetch(`${BASE_URL}/api/documents/remind`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: "telegram" }),
    });
    const data = await res.json();

    if (res.status === 200 && data.success === true && typeof data.telegramSent === "boolean") {
      console.log(`  [PASS] Test 3: POST /api/documents/remind (channel=telegram) returns 200 OK`);
      passed++;
    } else {
      console.error("  [FAIL] Test 3: Unexpected response structure:", data);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Test 3: Network error:", err.message);
    failed++;
  }

  console.log("\n=== Test Results Summary ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
