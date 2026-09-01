import assert from "node:assert";

async function runAllTests() {
  console.log("=== F&R Family Hub: Comprehensive System & Module Verification ===");
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Test Live HTTP Route Status
  console.log("\n1. Testing Live HTTP 200 Routes...");
  const routes = ["/", "/assets", "/vault", "/family", "/logs"];
  for (const r of routes) {
    await asyncTest(`Route ${r} returns HTTP 200 OK`, async () => {
      const res = await fetch(`http://localhost:1000${r}`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const text = await res.text();
      assert.ok(text.length > 500, "Response body should not be empty");
    });
  }

  // 2. Test API Endpoints
  console.log("\n2. Testing API Endpoint Contracts...");
  await asyncTest("/api/documents/remind POST returns valid JSON response", async () => {
    const res = await fetch("http://localhost:1000/api/documents/remind", { method: "POST" });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(typeof json.message === "string");
  });

  await asyncTest("/api/documents/remind GET returns valid JSON response", async () => {
    const res = await fetch("http://localhost:1000/api/documents/remind");
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
  });

  await asyncTest("/api/bot/tasks GET returns task list array", async () => {
    const res = await fetch("http://localhost:1000/api/bot/tasks");
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.tasks));
  });

  console.log("\n=== Test Results Summary ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test runner encountered critical error:", err);
  process.exit(1);
});
