import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import {
  sendWhatsAppInteractiveButtons,
  sendWhatsAppTextMessage,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp/client";
import { formatDateIndo } from "@/lib/utils";
import { mockStore } from "@/lib/mock-data";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface UrgentDocItem {
  title: string;
  docNumber: string;
  expiryDate: string;
  daysRemaining: number;
  isExpired: boolean;
  driveLink?: string | null;
}

interface MemberItem {
  full_name: string;
  telegram_chat_id?: any;
  whatsapp_number?: string | null;
}

async function processReminders(targetChannel: "all" | "whatsapp" | "telegram" = "all") {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const urgentDocs: UrgentDocItem[] = [];
    let tgMembers: MemberItem[] = [];
    let waMembers: MemberItem[] = [];

    if (!isSupabaseConfigured()) {
      const mockDocs = mockStore.getDocuments();
      const allMembers = mockStore.getMembers();

      tgMembers = allMembers.filter((m: any) => Boolean(m.telegram_chat_id));
      waMembers = allMembers.filter((m: any) => Boolean(m.whatsapp_number));

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
          whatsappSent: false,
          telegramSent: false,
        });
      }

      // Find family members with Telegram chat IDs
      const { data: dbTgMembers } = await supabaseAdmin
        .from("family_members")
        .select("full_name, telegram_chat_id, whatsapp_number")
        .eq("family_id", familyId)
        .not("telegram_chat_id", "is", null);

      tgMembers = dbTgMembers || [];

      // Find family members with WhatsApp numbers
      const { data: dbWaMembers } = await supabaseAdmin
        .from("family_members")
        .select("full_name, telegram_chat_id, whatsapp_number")
        .eq("family_id", familyId)
        .not("whatsapp_number", "is", null);

      waMembers = dbWaMembers || [];

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
        whatsappSent: false,
        telegramSent: false,
        urgentDocuments: [],
      });
    }

    // Sort by days remaining (expired first, then nearest expiry)
    urgentDocs.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // 1. Format Telegram Message (HTML Safe)
    let tgMsg = `🔔 <b>Pengingat Masa Berlaku Dokumen Keluarga</b>\n` +
      `📅 Tanggal Cek: ${escapeHtml(formatDateIndo(new Date()))}\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n`;

    urgentDocs.forEach((d, idx) => {
      const statusIcon = d.isExpired ? "🔴 <b>KEDALUWARSA</b>" : "🟡 <b>SEGERA HABIS</b>";
      const countdownText = d.isExpired
        ? `(lewat ${Math.abs(d.daysRemaining)} hari yang lalu)`
        : `(${d.daysRemaining} hari lagi)`;

      tgMsg += `${idx + 1}. <b>${escapeHtml(d.title)}</b>\n`;
      tgMsg += `   └ Status: ${statusIcon} ${escapeHtml(countdownText)}\n`;
      tgMsg += `   └ No. Dokumen: <code>${escapeHtml(d.docNumber)}</code>\n`;
      tgMsg += `   └ Jatuh Tempo: 📅 ${escapeHtml(formatDateIndo(d.expiryDate))}\n`;
      if (d.driveLink) {
        tgMsg += `   └ 📁 <a href="${escapeHtml(d.driveLink)}">Buka Salinan Dokumen</a>\n`;
      }
      tgMsg += `\n`;
    });

    tgMsg += `━━━━━━━━━━━━━━━━━━━\n` +
      `<i>💡 Segera lakukan perpanjangan ke instansi terkait agar tidak terkena denda atau pembatalan layanan.</i>`;

    // 2. Format WhatsApp Message (Markdown & Emoji)
    let waMsg = `🔔 *PENGINGAT MASA BERLAKU DOKUMEN KELUARGA*\n` +
      `📅 Tanggal Cek: ${formatDateIndo(new Date())}\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n`;

    urgentDocs.forEach((d, idx) => {
      const statusBadge = d.isExpired ? "🔴 *KEDALUWARSA*" : "🟡 *SEGERA HABIS*";
      const countdownText = d.isExpired
        ? `(lewat ${Math.abs(d.daysRemaining)} hari yang lalu)`
        : `(${d.daysRemaining} hari lagi)`;

      waMsg += `${idx + 1}. *${d.title}*\n`;
      waMsg += `   └ Status: ${statusBadge} ${countdownText}\n`;
      waMsg += `   └ No. Dokumen: *${d.docNumber}*\n`;
      waMsg += `   └ Jatuh Tempo: 📅 ${formatDateIndo(d.expiryDate)}\n`;
      if (d.driveLink) {
        waMsg += `   └ 📁 Salinan: ${d.driveLink}\n`;
      }
      waMsg += `\n`;
    });

    waMsg += `━━━━━━━━━━━━━━━━━━━\n` +
      `_💡 Segera lakukan perpanjangan ke instansi terkait agar tidak terkena denda atau kendala administrasi._`;

    // 3. Dispatch Reminders
    const tgSentNames: string[] = [];
    const tgFailedNames: string[] = [];
    const waSentNames: string[] = [];
    const waFailedNames: string[] = [];

    // 3a. Send Telegram
    const shouldSendTelegram = targetChannel === "all" || targetChannel === "telegram";
    if (shouldSendTelegram) {
      if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN.includes("placeholder")) {
        for (const member of tgMembers) {
          try {
            const tgRes = await sendTelegramMessage(member.telegram_chat_id, tgMsg, undefined, "HTML");
            if (tgRes && tgRes.ok) {
              tgSentNames.push(member.full_name);
            } else {
              tgFailedNames.push(member.full_name);
            }
          } catch (err: any) {
            tgFailedNames.push(member.full_name);
          }
        }
      } else {
        tgSentNames.push(...tgMembers.map((m) => m.full_name));
      }
    }

    // 3b. Send WhatsApp
    const shouldSendWhatsApp = targetChannel === "all" || targetChannel === "whatsapp";
    if (shouldSendWhatsApp) {
      if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
        for (const member of waMembers) {
          if (!member.whatsapp_number) continue;
          try {
            const waRes = await sendWhatsAppInteractiveButtons(
              member.whatsapp_number,
              waMsg,
              [
                { id: "action_summary", title: "📊 Ringkasan" },
                { id: "action_balance", title: "💳 Saldo" },
                { id: "action_help", title: "❓ Bantuan" },
              ],
              "Brankas Dokumen F&R Hub"
            );
            if (waRes && waRes.ok) {
              waSentNames.push(member.full_name);
            } else {
              waFailedNames.push(member.full_name);
            }
          } catch (err: any) {
            waFailedNames.push(member.full_name);
          }
        }
      } else {
        waSentNames.push(...waMembers.map((m) => m.full_name));
      }
    }

    // Build friendly summary message
    const allSentNames = [...new Set([...tgSentNames, ...waSentNames])];
    const channelSummaries: string[] = [];
    if (waSentNames.length > 0) channelSummaries.push(`WhatsApp (${waSentNames.join(", ")})`);
    if (tgSentNames.length > 0) channelSummaries.push(`Telegram (${tgSentNames.join(", ")})`);

    const summaryText = channelSummaries.length > 0
      ? `Pengingat berhasil dikirim via ${channelSummaries.join(" & ")} untuk ${urgentDocs.length} berkas yang mendekati kedaluwarsa.`
      : `Pemeriksaan selesai. Ditemukan ${urgentDocs.length} berkas yang memerlukan perhatian.`;

    return NextResponse.json({
      success: true,
      message: summaryText,
      count: urgentDocs.length,
      whatsappSent: waSentNames.length > 0,
      telegramSent: tgSentNames.length > 0,
      whatsappRecipients: waSentNames,
      telegramRecipients: tgSentNames,
      sentTo: allSentNames,
      failedRecipients: [...tgFailedNames, ...waFailedNames],
      urgentDocuments: urgentDocs,
    });
  } catch (err: any) {
    console.error("[Document Reminder API] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const channel = (req.nextUrl.searchParams.get("channel") || "all") as "all" | "whatsapp" | "telegram";
  return processReminders(channel);
}

export async function POST(req: NextRequest) {
  let channel: "all" | "whatsapp" | "telegram" = "all";
  try {
    const body = await req.json();
    if (body.channel && ["all", "whatsapp", "telegram"].includes(body.channel)) {
      channel = body.channel;
    }
  } catch (e) {
    // Body is optional
  }
  return processReminders(channel);
}
