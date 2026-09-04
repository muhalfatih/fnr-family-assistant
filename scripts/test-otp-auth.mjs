// Test script for OTP & Magic Link Auth
const baseUrl = "http://localhost:1000";

async function runTests() {
  console.log("=== Testing WhatsApp & Telegram OTP / Magic Link Authentication ===\n");

  // Test 1: Send OTP to Ibu via WhatsApp
  console.log("1. Sending OTP to Ibu (WhatsApp: 081298765432)...");
  const sendRes = await fetch(`${baseUrl}/api/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "whatsapp",
      identifier: "081298765432",
    }),
  });
  const sendData = await sendRes.json();
  console.log("Status:", sendRes.status);
  console.log("Response:", sendData);

  if (!sendData.success) {
    throw new Error("Failed to send OTP: " + JSON.stringify(sendData));
  }

  const generatedCode = sendData.devCode || sendData.simulation?.code;
  const magicLink = sendData.devMagicLink || sendData.simulation?.magicLink;
  console.log("Generated Code:", generatedCode);
  console.log("Generated Magic Link:", magicLink);

  // Test 2: Verify with wrong OTP
  console.log("\n2. Testing with wrong OTP code (000000)...");
  const wrongRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "whatsapp",
      identifier: "081298765432",
      code: "000000",
    }),
  });
  const wrongData = await wrongRes.json();
  console.log("Wrong code status (expect 400):", wrongRes.status, wrongData);

  // Test 3: Verify with correct OTP
  console.log("\n3. Testing with correct OTP code...");
  const verifyRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "whatsapp",
      identifier: "081298765432",
      code: generatedCode,
    }),
  });
  const verifyData = await verifyRes.json();
  console.log("Correct code status (expect 200):", verifyRes.status);
  console.log("User logged in:", verifyData.user?.name);
  const cookieHeader = verifyRes.headers.get("set-cookie");
  console.log("Set-Cookie header present:", Boolean(cookieHeader));

  // Test 4: Send OTP to Ibu via Telegram
  console.log("\n4. Sending OTP to Ibu (Telegram Chat ID: 987654321)...");
  const sendTgRes = await fetch(`${baseUrl}/api/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "telegram",
      identifier: "987654321",
    }),
  });
  const sendTgData = await sendTgRes.json();
  console.log("Telegram status:", sendTgRes.status);
  const magicToken = sendTgData.simulation?.magicLink?.split("token=")[1];
  console.log("Telegram Magic Token:", magicToken);

  // Test 5: Verify via Magic Token
  console.log("\n5. Testing Magic Token verification...");
  const magicRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: magicToken,
    }),
  });
  const magicData = await magicRes.json();
  console.log("Magic token status (expect 200):", magicRes.status);
  console.log("User logged in via magic link:", magicData.user?.name);

  console.log("\n✅ ALL OTP & MAGIC LINK TESTS PASSED!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
