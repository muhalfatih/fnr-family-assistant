import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseFinancialInputWithGemini } from "@/lib/gemini/parser";
import { uploadReceiptToDrive } from "@/lib/google/drive";
import { appendTransactionToSheet } from "@/lib/google/sheets";
import {
  sendTelegramMessage,
  editTelegramMessageText,
  answerTelegramCallbackQuery,
  downloadTelegramFile,
} from "@/lib/telegram/bot";
import { formatRupiah } from "@/lib/utils";

export async function GET() {
  return NextResponse.json({
    status: "online",
    message: "F&R Family Hub Telegram Webhook is operational.",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // 1. Handle Callback Query (Inline Buttons: Undo / Change Wallet)
  if (body.callback_query) {
    const cq = body.callback_query;
    const chatId = cq.message?.chat?.id;
    const messageId = cq.message?.message_id;
    const data = cq.data as string;

    if (data.startsWith("undo:")) {
      const transactionId = data.replace("undo:", "");
      const { error } = await supabaseAdmin.from("transactions").delete().eq("id", transactionId);

      if (error) {
        await answerTelegramCallbackQuery(cq.id, "Gagal membatalkan transaksi.");
      } else {
        await answerTelegramCallbackQuery(cq.id, "Transaksi berhasil dibatalkan & saldo dikembalikan!");
        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            "❌ *Transaksi ini telah dibatalkan & dihapus dari catatan.*",
            { inline_keyboard: [] }
          );
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("prompt_wallet:")) {
      const transactionId = data.replace("prompt_wallet:", "");
      // Fetch available wallets
      const { data: wallets } = await supabaseAdmin
        .from("wallets")
        .select("id, name")
        .eq("is_active", true);

      if (wallets && wallets.length > 0) {
        const keyboard = wallets.map((w: any) => [
          {
            text: `💳 ${w.name}`,
            callback_data: `switch_wallet:${transactionId}:${w.id}:${w.name}`,
          },
        ]);
        keyboard.push([{ text: "🔙 Batal Ubah", callback_data: "noop" }]);

        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            "Pilih dompet / rekening yang sesuai:",
            { inline_keyboard: keyboard }
          );
        }
      }
      await answerTelegramCallbackQuery(cq.id);
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("switch_wallet:")) {
      const [, transactionId, walletId, walletName] = data.split(":");
      await supabaseAdmin
        .from("transactions")
        .update({ wallet_id: walletId })
        .eq("id", transactionId);

      await answerTelegramCallbackQuery(cq.id, `Dompet diubah ke ${walletName}!`);
      if (chatId && messageId) {
        await editTelegramMessageText(
          chatId,
          messageId,
          `✅ *Dompet berhasil diubah ke:* \`${walletName}\``,
          { inline_keyboard: [] }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (data === "noop") {
      await answerTelegramCallbackQuery(cq.id);
      return NextResponse.json({ ok: true });
    }

    await answerTelegramCallbackQuery(cq.id);
    return NextResponse.json({ ok: true });
  }

  // 2. Handle Messages
  const message = body.message;
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat?.id;
  const senderName = message.from?.first_name || "Keluarga";

  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  try {
    // 2a. Whitelist Check against family_members
    const { data: member } = await supabaseAdmin
      .from("family_members")
      .select("*, family:families(*)")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    let familyId: string | null = member?.family_id || null;
    let defaultWalletId: string | null = member?.default_wallet_id || null;

    // Fallback: If no family configured yet, pick or create default demo family
    if (!familyId) {
      const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
      if (families && families.length > 0) {
        familyId = families[0].id;
      } else {
        const { data: newFamily } = await supabaseAdmin
          .from("families")
          .insert({ name: "Keluarga F&R" })
          .select()
          .single();
        familyId = newFamily?.id || null;
      }
    }

    // 2b. Identify Input Type (Text, Photo, Voice)
    let parsed: any = null;
    let mediaType: "text" | "image" | "audio" = "text";
    let driveFileId: string | null = null;
    let driveViewUrl: string | null = null;
    let rawPrompt: string = "";

    if (message.photo && message.photo.length > 0) {
      mediaType = "image";
      rawPrompt = message.caption || "[Foto Struk]";
      const photo = message.photo[message.photo.length - 1]; // highest res
      const downloaded = await downloadTelegramFile(photo.file_id);

      if (downloaded) {
        // Upload to Google Drive
        const driveResult = await uploadReceiptToDrive(
          downloaded.buffer,
          `struk_${Date.now()}.jpg`,
          downloaded.mimeType
        );
        if (driveResult) {
          driveFileId = driveResult.fileId;
          driveViewUrl = driveResult.webViewLink;
        }

        // Parse with Gemini
        parsed = await parseFinancialInputWithGemini({
          text: message.caption,
          imageBuffer: downloaded.buffer,
          imageMimeType: downloaded.mimeType,
        });
      }
    } else if (message.voice || message.audio) {
      mediaType = "audio";
      const audioFile = message.voice || message.audio;
      const downloaded = await downloadTelegramFile(audioFile.file_id);

      if (downloaded) {
        parsed = await parseFinancialInputWithGemini({
          audioBuffer: downloaded.buffer,
          audioMimeType: downloaded.mimeType,
        });
        rawPrompt = parsed?.transcription || "[Pesan Suara]";
      }
    } else if (message.text) {
      rawPrompt = message.text;

      // Handle basic bot commands
      if (message.text.startsWith("/start")) {
        await sendTelegramMessage(
          chatId,
          `👋 Halo *${senderName}*! Selamat datang di *F&R Family Hub* 🏡\n\n` +
            `Saya asisten keuangan keluarga Anda. Anda bisa langsung:\n` +
            `• 💬 Ketik transaksi: _"Beli bensin 150rb BCA"_\n` +
            `• 📸 Kirim foto struk belanjaan\n` +
            `• 🎙️ Kirim voice note / rekaman suara\n\n` +
            `Semua otomatis tersimpan, tersinkron ke Google Sheets & Google Drive!`
        );
        return NextResponse.json({ ok: true });
      }

      parsed = await parseFinancialInputWithGemini({ text: message.text });
    }

    if (!parsed || !parsed.amount || parsed.amount <= 0) {
      await sendTelegramMessage(
        chatId,
        "🤔 Maaf, saya belum bisa mengenali nominal transaksi dari pesan tersebut. Silakan ketik nominal yang jelas (contoh: *Beli makan siang 35rb*)."
      );
      return NextResponse.json({ ok: true });
    }

    // 2c. Match Wallet
    const { data: wallets } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true);

    let chosenWallet = wallets?.find((w: any) =>
      parsed.wallet_hint && w.name.toLowerCase().includes(parsed.wallet_hint.toLowerCase())
    );

    if (!chosenWallet && defaultWalletId) {
      chosenWallet = wallets?.find((w: any) => w.id === defaultWalletId);
    }

    if (!chosenWallet && wallets && wallets.length > 0) {
      chosenWallet = wallets[0];
    }

    if (!chosenWallet) {
      // Create a default cash wallet if none exists
      const { data: newWallet } = await supabaseAdmin
        .from("wallets")
        .insert({
          family_id: familyId,
          name: "Dompet Tunai",
          type: "cash",
          current_balance: 0,
        })
        .select()
        .single();
      chosenWallet = newWallet;
    }

    // 2d. Match or Create Category
    let categoryId: string | null = null;
    if (parsed.category) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("family_id", familyId)
        .ilike("name", `%${parsed.category}%`)
        .maybeSingle();

      if (cat) {
        categoryId = cat.id;
      } else {
        const { data: newCat } = await supabaseAdmin
          .from("categories")
          .insert({
            family_id: familyId,
            name: parsed.category,
            type: parsed.type === "income" ? "income" : "expense",
          })
          .select()
          .single();
        categoryId = newCat?.id || null;
      }
    }

    // 2e. Insert Transaction (Optimistic Insert)
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        family_id: familyId,
        member_id: member?.id || null,
        wallet_id: chosenWallet.id,
        category_id: categoryId,
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        raw_prompt: rawPrompt,
        media_type: mediaType,
        drive_file_id: driveFileId,
        drive_view_url: driveViewUrl,
        parsed_metadata: {
          merchant: parsed.merchant_name,
          items: parsed.items,
          confidence: parsed.confidence,
          transcription: parsed.transcription,
        },
      })
      .select()
      .single();

    if (txError || !transaction) {
      console.error("Failed to insert transaction:", txError);
      await sendTelegramMessage(chatId, "⚠️ Terjadi kesalahan saat menyimpan ke database.");
      return NextResponse.json({ ok: true });
    }

    // 2f. Real-time Append to Google Sheets
    appendTransactionToSheet({
      transactionDate: new Date().toISOString().split("T")[0],
      type: parsed.type,
      category: parsed.category || "Lain-lain",
      amount: parsed.amount,
      walletName: chosenWallet.name,
      description: parsed.description,
      memberName: member?.full_name || senderName,
      driveLink: driveViewUrl || undefined,
    }).catch((err) => console.error("Async Google Sheet Sync Error:", err));

    // 2g. Reply Confirmation Message with Action Buttons
    const typeEmoji = parsed.type === "expense" ? "📉" : parsed.type === "income" ? "📈" : "🔄";
    const typeText = parsed.type === "expense" ? "Pengeluaran" : parsed.type === "income" ? "Pemasukan" : "Transfer";

    let replyText =
      `✅ *${typeText} Berhasil Dicatat!*\n\n` +
      `💵 *Nominal:* \`${formatRupiah(parsed.amount)}\`\n` +
      `🏷️ *Kategori:* ${parsed.category || "Lain-lain"}\n` +
      `💳 *Dompet:* ${chosenWallet.name}\n` +
      `📝 *Catatan:* ${parsed.description}`;

    if (parsed.items && parsed.items.length > 0) {
      replyText += `\n\n🧾 *Rincian Item (${parsed.items.length}):*\n`;
      parsed.items.slice(0, 5).forEach((item: any) => {
        replyText += `• ${item.name} (${item.qty}x) — ${formatRupiah(item.price)}\n`;
      });
      if (parsed.items.length > 5) {
        replyText += `_...dan ${parsed.items.length - 5} item lainnya_\n`;
      }
    }

    if (driveViewUrl) {
      replyText += `\n📁 [Buka Foto di Google Drive](${driveViewUrl})`;
    }

    const inlineKeyboard = [
      [
        { text: "🗑️ Batalkan", callback_data: `undo:${transaction.id}` },
        { text: "💳 Ganti Dompet", callback_data: `prompt_wallet:${transaction.id}` },
      ],
    ];

    await sendTelegramMessage(chatId, replyText, { inline_keyboard: inlineKeyboard });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unhandled error in Telegram webhook:", err);
    await sendTelegramMessage(
      chatId,
      "⚠️ Terjadi gangguan saat memproses pesan. Mohon coba beberapa saat lagi."
    );
    return NextResponse.json({ ok: true });
  }
}
