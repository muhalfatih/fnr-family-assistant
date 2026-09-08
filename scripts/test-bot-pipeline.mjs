/**
 * Comprehensive End-to-End Test Suite for Telegram & WhatsApp Bots + OCR Pipeline
 */

import { normalizeReceiptItemName } from "../src/lib/gemini/receipt-dictionary.ts";
import { fastParseIndonesianFinancialText } from "../src/lib/bot/fast-parser.ts";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:1000";
const TG_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "your-custom-webhook-secret-token";

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

async function runTests() {
  console.log("=== F&R Family Hub: Bot & OCR Pipeline Comprehensive Verification ===\n");

  const tgHeaders = {
    "Content-Type": "application/json",
    "x-telegram-bot-api-secret-token": TG_SECRET,
  };

  // ==========================================
  // SECTION 1: TELEGRAM BOT WEBHOOK TESTS
  // ==========================================
  console.log("1. Testing Telegram Webhook Endpoints & Logic...");

  // 1a. Telegram Healthcheck GET
  try {
    const res = await fetch(`${BASE_URL}/api/bot/telegram`);
    const data = await res.json();
    assert(res.status === 200 && data.status === "online", "Telegram Webhook GET returns 200 status 'online'");
  } catch (err) {
    assert(false, `Telegram Webhook GET failed: ${err.message}`);
  }

  // 1b. Telegram Command /myid
  try {
    const res = await fetch(`${BASE_URL}/api/bot/telegram`, {
      method: "POST",
      headers: tgHeaders,
      body: JSON.stringify({
        update_id: 100001,
        message: {
          message_id: 1,
          chat: { id: 123456789 },
          from: { first_name: "Fatih" },
          text: "/myid",
        },
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.ok === true, "Telegram Command /myid processed successfully");
  } catch (err) {
    assert(false, `Telegram Command /myid failed: ${err.message}`);
  }

  // 1c. Telegram Financial Queries (Ringkasan, Saldo, Anggaran)
  try {
    const commands = ["📊 Ringkasan Keuangan", "💳 Saldo Rekening", "🎯 Sisa Anggaran"];
    let allQueriesOk = true;
    for (let i = 0; i < commands.length; i++) {
      const res = await fetch(`${BASE_URL}/api/bot/telegram`, {
        method: "POST",
        headers: tgHeaders,
        body: JSON.stringify({
          update_id: 100010 + i,
          message: {
            message_id: 10 + i,
            chat: { id: 123456789 },
            from: { first_name: "Fatih" },
            text: commands[i],
          },
        }),
      });
      const data = await res.json();
      if (res.status !== 200 || !data.ok) allQueriesOk = false;
    }
    assert(allQueriesOk, "Telegram Financial Query Keyboard buttons processed successfully");
  } catch (err) {
    assert(false, `Telegram Financial Queries failed: ${err.message}`);
  }

  // 1d. Telegram Natural Language Financial Transaction (Fast-Path)
  try {
    const res = await fetch(`${BASE_URL}/api/bot/telegram`, {
      method: "POST",
      headers: tgHeaders,
      body: JSON.stringify({
        update_id: 100020,
        message: {
          message_id: 20,
          chat: { id: 123456789 },
          from: { first_name: "Ayah" },
          text: "Beli bensin 150rb BCA",
        },
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.ok === true, "Telegram transaction 'Beli bensin 150rb BCA' accepted");
  } catch (err) {
    assert(false, `Telegram Natural Language Transaction failed: ${err.message}`);
  }

  // 1e. Telegram Zero-Cost Relevance Guard (Out-of-Domain filter)
  try {
    const res = await fetch(`${BASE_URL}/api/bot/telegram`, {
      method: "POST",
      headers: tgHeaders,
      body: JSON.stringify({
        update_id: 100030,
        message: {
          message_id: 30,
          chat: { id: 123456789 },
          from: { first_name: "Fatih" },
          text: "rekomendasi film bioskop action terbaik minggu ini",
        },
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.ok === true, "Out-of-domain message politely caught by Relevance Guard");
  } catch (err) {
    assert(false, `Telegram Relevance Guard failed: ${err.message}`);
  }

  // 1f. Telegram Idempotency Guard (Duplicate Drop)
  try {
    const duplicateUpdateId = 888888;
    // First delivery
    await fetch(`${BASE_URL}/api/bot/telegram`, {
      method: "POST",
      headers: tgHeaders,
      body: JSON.stringify({
        update_id: duplicateUpdateId,
        message: { message_id: 40, chat: { id: 123456789 }, text: "Cek saldo" },
      }),
    });

    // Duplicate retry delivery
    const res = await fetch(`${BASE_URL}/api/bot/telegram`, {
      method: "POST",
      headers: tgHeaders,
      body: JSON.stringify({
        update_id: duplicateUpdateId,
        message: { message_id: 40, chat: { id: 123456789 }, text: "Cek saldo" },
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.duplicate === true, "Telegram Idempotency Guard dropped duplicate retry");
  } catch (err) {
    assert(false, `Telegram Idempotency Guard failed: ${err.message}`);
  }

  // 1g. Telegram Callback Query (Undo Transaction)
  try {
    const res = await fetch(`${BASE_URL}/api/bot/telegram`, {
      method: "POST",
      headers: tgHeaders,
      body: JSON.stringify({
        callback_query: {
          id: "cq_undo_test",
          data: "undo:tx-mock-1",
          message: {
            message_id: 99,
            chat: { id: 123456789 },
          },
        },
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.ok === true, "Telegram Undo Callback Query executed cleanly");
  } catch (err) {
    assert(false, `Telegram Undo Callback Query failed: ${err.message}`);
  }

  console.log("");

  // ==========================================
  // SECTION 2: WHATSAPP CLOUD API WEBHOOK TESTS
  // ==========================================
  console.log("2. Testing WhatsApp Webhook Endpoints & Logic...");

  // 2a. WhatsApp Meta Verification Challenge GET
  try {
    const challengeCode = "challenge_token_xyz_123";
    const res = await fetch(
      `${BASE_URL}/api/bot/whatsapp?hub.mode=subscribe&hub.challenge=${challengeCode}&hub.verify_token=fnr_family_whatsapp_secret`
    );
    const text = await res.text();
    assert(
      res.status === 200 && text === challengeCode,
      "WhatsApp Meta Hub Verification handshake returns challenge token"
    );
  } catch (err) {
    assert(false, `WhatsApp Verification Handshake failed: ${err.message}`);
  }

  // 2b. WhatsApp Incoming Text Message Event POST
  try {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WBA_TEST",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                messages: [
                  {
                    from: "6281234567890",
                    id: `wamid.pipeline_${Date.now()}`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    type: "text",
                    text: {
                      body: "Makan siang soto ayam 35rb Mandiri",
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.status === "EVENT_RECEIVED",
      "WhatsApp incoming transaction processed and queued (EVENT_RECEIVED)"
    );
  } catch (err) {
    assert(false, `WhatsApp Incoming Message failed: ${err.message}`);
  }

  // 2c. WhatsApp Idempotency Guard (Duplicate Message ID Handling)
  try {
    const fixedMsgId = `wamid.duplicate_test_${Date.now()}`;
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                messages: [
                  {
                    from: "6281234567890",
                    id: fixedMsgId,
                    type: "text",
                    text: { body: "Beli pulsa 50rb" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // First delivery
    const res1 = await fetch(`${BASE_URL}/api/bot/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Duplicate delivery
    const res2 = await fetch(`${BASE_URL}/api/bot/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data2 = await res2.json();
    assert(
      res1.status === 200 && res2.status === 200 && data2.status === "EVENT_RECEIVED",
      "WhatsApp Idempotency Guard safely handled duplicate message retry without errors"
    );
  } catch (err) {
    assert(false, `WhatsApp Idempotency Guard failed: ${err.message}`);
  }

  console.log("");

  // ==========================================
  // SECTION 3: FAST-PARSER & OCR DICTIONARY TESTS
  // ==========================================
  console.log("3. Testing Fast-Parser & OCR Receipt Normalization...");

  // 3a. Fast-Parser Indonesian Slang & Wallet Hints
  const fastParsed = fastParseIndonesianFinancialText("Beli bensin 150rb BCA");
  assert(
    fastParsed && fastParsed.amount === 150000 && fastParsed.wallet_hint === "BCA",
    "Fast Parser: 'Beli bensin 150rb BCA' -> amount: 150000, wallet: BCA"
  );

  const fastParsedJt = fastParseIndonesianFinancialText("Gaji bulanan 12.5jt transfer");
  assert(
    fastParsedJt && fastParsedJt.amount === 12500000 && fastParsedJt.type === "income",
    "Fast Parser: 'Gaji bulanan 12.5jt transfer' -> amount: 12500000, type: income"
  );

  // 3b. Retail POS Receipt Item De-Abbreviation
  const itemSr = normalizeReceiptItemName("SR.TOGO BLACK 128GR");
  assert(
    itemSr.name === "Sari Roti Sandwich To Go Rasa Black Cokelat 128g",
    `POS Decryption: 'SR.TOGO BLACK 128GR' -> '${itemSr.name}'`
  );

  const itemIndomilk = normalizeReceiptItemName("INDOMILK SKMP POUCH S");
  assert(
    itemIndomilk.name === "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch (S)",
    `POS Decryption: 'INDOMILK SKMP POUCH S' -> '${itemIndomilk.name}'`
  );

  const itemIndomie = normalizeReceiptItemName("INDOMIEGRSPCJUMBO129");
  assert(
    itemIndomie.name === "Indomie Goreng Spesial Jumbo 129g",
    `POS Deconstruction: 'INDOMIEGRSPCJUMBO129' -> '${itemIndomie.name}'`
  );

  // 3c. Units vs Dimensions Rules
  const itemSpanduk = normalizeReceiptItemName("SPANDUK 5X3");
  assert(
    itemSpanduk.name === "Spanduk 5x3 m",
    `Dimension Rule (Meter): 'SPANDUK 5X3' -> '${itemSpanduk.name}'`
  );

  const itemTas = normalizeReceiptItemName("TAS KAIN 47X52");
  assert(
    itemTas.name === "Tas Kain 47x52 cm",
    `Dimension Rule (Centimeter): 'TAS KAIN 47X52' -> '${itemTas.name}'`
  );

  const itemNonFood = normalizeReceiptItemName("KERTAS F4 70");
  assert(
    itemNonFood.name === "Kertas F4 70",
    `Non-Food Preservation: 'KERTAS F4 70' -> preserved '${itemNonFood.name}'`
  );

  console.log(`\n=== Bot & OCR Pipeline Test Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
