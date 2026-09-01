import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { formatDateIndo } from "@/lib/utils";
import { mockStore } from "@/lib/mock-data";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function processReminders() {
  try {
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

    let members: Array<{ full_name: string; telegram_chat_id?: any }> = [];

    if (!isSupabaseConfigured()) {
      const mockDocs = mockStore.getDocuments();
      members = mockStore.getMembers().filter((m: any) => Boolean(m.telegram_chat_id));

      mockDocs.forEach((doc: any) => {
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
    } else {
      const { data: families } = await supabaseAdmin
        .from("families")
        .select("id")
        .limit(1);

      const familyId = families && families.length > 0 ? families[0].id : null;

      if (!familyId) {
        return NextResponse.json({
          success: true,
          message: "Simulasi Pengingat Selesai (Mode Mock Dev).",
          count: 0,
          telegramSent: false,
        });
      }

      // Find all family members with Telegram chat IDs
      const { data: dbMembers } = await supabaseAdmin
        .from("family_members")
        .select("full_name, telegram_chat_id")
        .eq("family_id", familyId)
        .not("telegram_chat_id", "is", null);

      members = dbMembers || [];

      // Fetch all documents with expiry date for this family
      const { data: docs } = await supabaseAdmin
        .from("documents")
        .select("*")
        .eq("family_id", familyId)
        .not("expiry_date", "is", null);

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
    }

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

    if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN.includes("placeholder")) {
      for (const member of members) {
        try {
          const tgRes = await sendTelegramMessage(member.telegram_chat_id, msg, undefined, "HTML");
          if (tgRes && tgRes.ok) {
            sentNames.push(member.full_name);
          } else {
            failedNames.push(`${member.full_name}`);
          }
        } catch (err: any) {
          failedNames.push(`${member.full_name}`);
        }
      }
    } else {
      // Mock / Dev Mode
      sentNames.push(...members.map((m) => m.full_name));
    }

    const successMessage = `Pengingat berhasil dikirim (${sentNames.join(", ")}) untuk ${urgentDocs.length} berkas yang mendekati kedaluwarsa.`;

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
