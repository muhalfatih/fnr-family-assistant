import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { formatDateIndo } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      return NextResponse.json({ error: "Family not found" }, { status: 400 });
    }

    // Find Telegram chat id
    const { data: members } = await supabaseAdmin
      .from("family_members")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null)
      .limit(1);

    const chatId = members && members.length > 0 ? members[0].telegram_chat_id : null;

    // Fetch all documents with expiry date
    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("family_id", familyId)
      .not("expiry_date", "is", null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const urgentDocs: Array<{
      title: string;
      docNumber: string;
      expiryDate: string;
      daysRemaining: number;
      isExpired: boolean;
      driveLink?: string | null;
    }> = [];

    (docs || []).forEach((doc: any) => {
      if (doc.expiry_date) {
        const exp = new Date(doc.expiry_date);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const threshold = doc.reminder_days_before || 30;

        if (diffDays <= threshold) {
          urgentDocs.push({
            title: doc.title,
            docNumber: doc.document_number || "-",
            expiryDate: doc.expiry_date,
            daysRemaining: diffDays,
            isExpired: diffDays < 0,
            driveLink: doc.drive_view_url,
          });
        }
      }
    });

    if (urgentDocs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada dokumen yang mendekati kedaluwarsa saat ini.",
        count: 0,
      });
    }

    // Sort by days remaining
    urgentDocs.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Format Telegram message
    let msg = `🔔 *Pengingat Masa Berlaku Dokumen Keluarga*\n` +
      `📅 Tanggal Cek: ${formatDateIndo(new Date())}\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n`;

    urgentDocs.forEach((d, idx) => {
      const statusIcon = d.isExpired ? "🔴 *KEDALUWARSA*" : "🟡 *SEGERA HABIS*";
      const countdownText = d.isExpired
        ? `(lewat ${Math.abs(d.daysRemaining)} hari yang lalu)`
        : `(${d.daysRemaining} hari lagi)`;

      msg += `${idx + 1}. *${d.title}*\n`;
      msg += `   └ Status: ${statusIcon} ${countdownText}\n`;
      msg += `   └ No. Dokumen: \`${d.docNumber}\`\n`;
      msg += `   └ Jatuh Tempo: 📅 ${formatDateIndo(d.expiryDate)}\n`;
      if (d.driveLink) {
        msg += `   └ 📁 [Buka Salinan Dokumen](${d.driveLink})\n`;
      }
      msg += `\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━\n` +
      `_💡 Segera lakukan perpanjangan ke instansi terkait agar tidak terkena denda atau pembatalan layanan._`;

    let telegramSent = false;
    if (chatId) {
      const tgRes = await sendTelegramMessage(chatId, msg);
      telegramSent = Boolean(tgRes && tgRes.ok);
    }

    return NextResponse.json({
      success: true,
      count: urgentDocs.length,
      telegramSent,
      urgentDocuments: urgentDocs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
