import fs from "fs";
import path from "path";

// Load .env.local manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ File .env.local tidak ditemukan!");
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const targetPhone = "6285711741444";

console.log("=== Testing WhatsApp Cloud API Outbound Messaging ===");
console.log(`Phone Number ID : ${phoneNumberId ? phoneNumberId : "❌ Belum Diatur"}`);
console.log(`Access Token    : ${token ? `${token.substring(0, 10)}...${token.slice(-6)}` : "❌ Belum Diatur"}`);
console.log(`Target Phone    : ${targetPhone}\n`);

if (!token || !phoneNumberId) {
  console.error("❌ Error: WHATSAPP_ACCESS_TOKEN atau WHATSAPP_PHONE_NUMBER_ID belum diisi di .env.local");
  process.exit(1);
}

async function run() {
  // 1. Verify Phone Number ID & Token with Meta
  console.log("1. Verifying WhatsApp Business Account status on Meta Graph API...");
  try {
    const checkRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const checkData = await checkRes.json();

    if (!checkRes.ok) {
      console.error("❌ Gagal verifikasi akun WhatsApp ke Meta API:", JSON.stringify(checkData, null, 2));
      return;
    }

    console.log("✅ Akun WhatsApp Terhubung!");
    console.log(`   - Verified Name        : ${checkData.verified_name || "(Belum diverifikasi nama resmi)"}`);
    console.log(`   - Display Phone Number : ${checkData.display_phone_number || checkData.id}`);
    console.log(`   - Quality Rating       : ${checkData.quality_rating || "N/A"}\n`);
  } catch (err) {
    console.error("❌ Network error connecting to Meta Graph API:", err.message);
    return;
  }

  // 2. Send Test Message
  console.log(`2. Mengirim pesan uji coba ke +${targetPhone}...`);
  const testMessage = `👋 *Halo dari F&R Family Hub!*\n\nIni adalah pesan pengujian koneksi bot WhatsApp Anda. Bot asisten keuangan keluarga siap mencatat transaksi, foto struk, dan rekaman suara harian Anda.\n\n⏰ Waktu: ${new Date().toLocaleString("id-ID")}`;

  try {
    const sendRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: targetPhone,
        type: "text",
        text: {
          preview_url: false,
          body: testMessage,
        },
      }),
    });

    const sendData = await sendRes.json();

    if (sendRes.ok && sendData.messages && sendData.messages.length > 0) {
      console.log("🎉 BERHASIL TERKIRIM!");
      console.log(`   - Message ID : ${sendData.messages[0].id}`);
      console.log(`   - WhatsApp ID: ${sendData.contacts?.[0]?.wa_id || targetPhone}`);
      console.log("\nSilakan periksa aplikasi WhatsApp di nomor +6285711741444!");
    } else {
      console.error("⚠️ Respon dari Meta API:", JSON.stringify(sendData, null, 2));
      if (sendData.error) {
        console.log("\n💡 Catatan Analisis Error:");
        if (sendData.error.code === 131030) {
          console.log("👉 Nomor penerima belum masuk dalam Allowlist / Sandbox 'To' recipient di portal Meta for Developers.");
          console.log("👉 Solusi: Masuk ke developers.facebook.com > WhatsApp > API Setup > Tambahkan nomor +6285711741444 ke daftar nomor uji coba.");
        } else if (sendData.error.code === 190) {
          console.log("👉 Access Token telah kedaluwarsa atau tidak valid.");
          console.log("👉 Solusi: Buat Permanent System User Token di Meta Business Manager.");
        } else if (sendData.error.code === 131047) {
          console.log("👉 Jendela 24 jam belum terbuka atau memerlukan Template Message untuk memulai percakapan pertama.");
        }
      }
    }
  } catch (err) {
    console.error("❌ Network error sending message:", err.message);
  }
}

run();
