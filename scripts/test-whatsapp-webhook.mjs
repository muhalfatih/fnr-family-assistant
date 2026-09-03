/**
 * Test simulating inbound WhatsApp Cloud API webhook
 */

async function testWhatsAppWebhook() {
  console.log("=== Testing WhatsApp Webhook Speed & Fast-Path Pipeline ===");

  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "6285111314440",
                phone_number_id: "PHONE_NUMBER_ID",
              },
              contacts: [
                {
                  profile: { name: "Fatih (Test User)" },
                  wa_id: "6285711741444",
                },
              ],
              messages: [
                {
                  from: "6285711741444",
                  id: `wamid.test_${Date.now()}`,
                  timestamp: `${Math.floor(Date.now() / 1000)}`,
                  type: "text",
                  text: {
                    body: "Beli beras 120rb pake BCA",
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

  const t0 = Date.now();
  const res = await fetch("http://localhost:1000/api/bot/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const duration = Date.now() - t0;
  const data = await res.json();

  console.log(`Webhook HTTP Status: ${res.status} (${duration}ms)`);
  console.log("Response:", data);

  if (res.status === 200 && data.status === "EVENT_RECEIVED") {
    console.log("  [PASS] Webhook successfully received and queued asynchronously.");
  } else {
    console.error("  [FAIL] Webhook did not return EVENT_RECEIVED status.");
    process.exit(1);
  }
}

testWhatsAppWebhook().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
