import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { formatDateIndo } from "@/lib/utils";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function processReminders() {
  try {
    const { data: families, error: famErr } = await supabaseAdmin
      .from("families")
      .select("id")
      .limit(1);

    if (famErr || !families || families.length === 0) {
      return NextResponse.json({ error: "Data keluarga tidak ditemukan." }, { status: 400 });
    }

    const familyId = families[0].id;

    // Find all family members with Telegram chat IDs
    const { data: members, error: memErr } = await supabaseAdmin
      .from("family_members")
      .select("full_name, telegram_chat_id")
      .eq("family_id", familyId)
      .not("telegram_chat_id", "is", null);

    if (memErr) {
      return NextResponse.json({ error: `Gagal membaca data anggota: ${memErr.message}` }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        error: "Belum ada anggota keluarga yang menautkan Telegram Chat ID. Silakan tautkan Chat ID di menu Anggota Keluarga.",
      }, { status: 400 });
    }

    // Fetch all documents with expiry date for this family
    const { data: docs, error: docsErr } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("family_id", familyId)
      .not("expiry_date", "is", null);

    if (docsErr) {
      return NextResponse.json({ error: `Gagal membaca data berkas: ${docsErr.message}` }, { status: 500 });
    }

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
        message: "Pemeriksaan selesai: Semua berkas keluarga masih dalam masa berlaku aman.",
        count: 0,
        telegramSent: false,
      });
    }

    // Sort by days remaining (expired first, then nearest expiry)
    urgentDocs.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Format HTML Telegram message safely
    let msg = `🔔 <b>Pengingat Masa Berlaku Dokumen Keluarga</b>\n` +
      `📅 Tanggal Cek: ${escapeHtml(formatDateIndo(new Date()))}\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n`;

    urgentDocs.forEach((d, idx) => {
      const statusIcon = d.isExpired ? "🔴 <b>KEDALUWARSA</b>" : "🟡 <b>SEGERA HABIS</b>";
      const countdownText = d.isExpired
        ? `(lewat ${Math.abs(d.daysRemaining)} hari yang lalu)`
        : `(${d.daysRemaining} hari lagi)`;

      msg += `${idx + 1}. <b>${escapeHtml(d.title)}</b>\n`;
      msg += `   └ Status: ${statusIcon} ${escapeHtml(countdownText)}\n`;
      msg += `   └ No. Dokumen: <code>${escapeHtml(d.docNumber)}</code>\n`;
      msg += `   └ Jatuh Tempo: 📅 ${escapeHtml(formatDateIndo(d.expiryDate))}\n`;
      if (d.driveLink) {
        msg += `   └ 📁 <a href="${escapeHtml(d.driveLink)}">Buka Salinan Dokumen</a>\n`;
      }
      msg += `\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━\n` +
      `<i>💡 Segera lakukan perpanjangan ke instansi terkait agar tidak terkena denda atau pembatalan layanan.</i>`;

    // Send to all registered members
    const sentNames: string[] = [];
    const failedNames: string[] = [];

    for (const member of members) {
      try {
        const tgRes = await sendTelegramMessage(member.telegram_chat_id, msg, undefined, "HTML");
        if (tgRes && tgRes.ok) {
          sentNames.push(member.full_name);
        } else {
          console.error(`Telegram send failed for ${member.full_name}:`, tgRes);
          failedNames.push(`${member.full_name} (${tgRes?.description || "Gagal kirim"})`);
        }
      } catch (err: any) {
        console.error(`Error sending Telegram to ${member.full_name}:`, err);
        failedNames.push(`${member.full_name} (${err.message})`);
      }
    }

    if (sentNames.length === 0 && failedNames.length > 0) {
      return NextResponse.json({
        error: `Gagal mengirim Telegram ke penerima: ${failedNames.join(", ")}`,
      }, { status: 502 });
    }

    const successMessage = `Pengingat berhasil dikirim ke Telegram (${sentNames.join(", ")}) untuk ${urgentDocs.length} dokumen periksa.`;

    return NextResponse.json({
      success: true,
      message: successMessage,
      count: urgentDocs.length,
      telegramSent: sentNames.length > 0,
      sentTo: sentNames,
      failedRecipients: failedNames.length > 0 ? failedNames : undefined,
      urgentDocuments: urgentDocs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return processReminders();
}

export async function POST(req: NextRequest) {
  return processReminders();
}
