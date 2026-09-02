/**
 * Automated Verification Script for F&R Family Hub WhatsApp Bot Integration
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:1000";
const VERIFY_SECRET = process.env.WHATSAPP_VERIFY_TOKEN || process.env.TELEGRAM_WEBHOOK_SECRET || "fnr_family_whatsapp_secret";

async function runTests() {
  console.log("=== F&R Family Hub: WhatsApp Webhook & Bot Diagnostic Verification ===\n");
  let passed = 0;
  let failed = 0;

  // Test 1: GET Webhook Verification with Valid Challenge
  try {
    const challengeCode = "RANDOM_CHALLENGE_987654";
    const url = `${BASE_URL}/api/bot/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY_SECRET)}&hub.challenge=${challengeCode}`;
    const res = await fetch(url);
    const text = await res.text();

    if (res.status === 200 && text === challengeCode) {
      console.log("  [PASS] Test 1: GET /api/bot/whatsapp returns 200 with matching hub.challenge");
      passed++;
    } else {
      console.error(`  [FAIL] Test 1: Expected 200 with "${challengeCode}", got ${res.status} "${text}"`);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Test 1: Network error:", err.message);
    failed++;
  }

  // Test 2: GET Webhook Verification with Invalid Token
  try {
    const url = `${BASE_URL}/api/bot/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=12345`;
    const res = await fetch(url);

    if (res.status === 403) {
      console.log("  [PASS] Test 2: GET /api/bot/whatsapp rejects invalid verify_token with 403 Forbidden");
      passed++;
    } else {
      console.error(`  [FAIL] Test 2: Expected 403 Forbidden, got ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Test 2: Network error:", err.message);
    failed++;
  }

  // Test 3: POST Inbound WhatsApp Webhook Payload
  try {
    const samplePayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_TEST_ACCOUNT",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "6281234567890",
                  phone_number_id: "123456789012345",
                },
                contacts: [
                  {
                    profile: { name: "Tester" },
                    wa_id: "6281234567890",
                  },
                ],
                messages: [
                  {
                    from: "6281234567890",
                    id: `wamid.test_${Date.now()}`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    type: "text",
                    text: {
                      body: "ringkasan",
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/bot/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(samplePayload),
    });

    const data = await res.json();
    if (res.status === 200 && data.status === "EVENT_RECEIVED") {
      console.log("  [PASS] Test 3: POST /api/bot/whatsapp accepts Meta payload with 200 EVENT_RECEIVED");
      passed++;
    } else {
      console.error(`  [FAIL] Test 3: Expected 200 EVENT_RECEIVED, got ${res.status}`, data);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Test 3: Network error:", err.message);
    failed++;
  }

  // Test 4: Diagnostics Route contains WhatsApp Service
  try {
    const res = await fetch(`${BASE_URL}/api/diagnostics`);
    const data = await res.json();
    const waService = data.services?.find((s) => s.id === "whatsapp");

    if (res.status === 200 && waService) {
      console.log(`  [PASS] Test 4: /api/diagnostics includes WhatsApp service (status: ${waService.status})`);
      passed++;
    } else {
      console.error("  [FAIL] Test 4: WhatsApp service not found in /api/diagnostics");
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Test 4: Network error:", err.message);
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
