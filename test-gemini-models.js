const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const envContent = fs.readFileSync(".env.local", "utf8");
let apiKey = "";
for (const line of envContent.split("\n")) {
  if (line.startsWith("GEMINI_API_KEY=")) {
    apiKey = line.split("=")[1].trim().replace(/^["']|["']$/g, "");
  }
}

console.log("API Key loaded:", Boolean(apiKey));
const ai = new GoogleGenAI({ apiKey });

async function testModels() {
  const models = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.7-flash"
  ];
  for (const m of models) {
    try {
      const start = Date.now();
      const res = await ai.models.generateContent({
        model: m,
        contents: "Hi! Respond in one word.",
      });
      const latency = Date.now() - start;
      console.log(`[SUCCESS] ${m}: latency ${latency}ms, text: "${res.text?.trim()}"`);
    } catch (e) {
      console.log(`[FAILED] ${m}: ${e.message.substring(0, 80)}`);
    }
  }
}

testModels();
