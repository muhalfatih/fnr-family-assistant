import http from "http";

console.log("=== Testing Cloudflare R2 Media Preview Endpoint & Resolvers ===");

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

function fetchLocal(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:1000${path}`, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on("error", reject);
  });
}

async function run() {
  try {
    // 1. Test fetching media by transaction ID (tx-003 Superindo)
    const res1 = await fetchLocal("/api/transactions/media?id=tx-003");
    assert(res1.statusCode === 200, `GET /api/transactions/media?id=tx-003 returns HTTP 200 OK (got: ${res1.statusCode})`);
    assert(
      res1.headers["content-type"] && (res1.headers["content-type"].includes("image/") || res1.headers["content-type"].includes("svg")),
      `Content-Type is image/svg+xml or binary image (got: ${res1.headers["content-type"]})`
    );
    assert(
      res1.body.includes("<svg") && res1.body.includes("SUPERINDO"),
      `Receipt image contains rendered merchant voucher 'SUPERINDO'`
    );

    // 2. Test fetching media with custom key parameter
    const res2 = await fetchLocal("/api/transactions/media?key=receipts/2026/09/sample_struk.jpg");
    assert(res2.statusCode === 200, `GET /api/transactions/media?key=... returns HTTP 200 OK (got: ${res2.statusCode})`);

    // 3. Test caching headers
    assert(
      Boolean(res1.headers["cache-control"]),
      `Response includes Cache-Control header: ${res1.headers["cache-control"]}`
    );

    console.log(`\nR2 Media Preview Tests: ${passed} passed, ${failed} failed.\n`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

run();
