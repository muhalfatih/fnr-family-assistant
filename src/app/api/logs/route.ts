import { NextRequest, NextResponse } from "next/server";
import { getChatActivityLogs, recordChatLog } from "@/lib/bot/process-manager";
import { ChatActivityLog } from "@/lib/types/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");

    const result = await getChatActivityLogs(limit);
    let logs = result.logs;

    if (channel && channel !== "all") {
      logs = logs.filter((l) => l.channel === channel);
    }

    if (status && status !== "all") {
      logs = logs.filter((l) => l.status === status);
    }

    return NextResponse.json({ logs, isMockMode: result.isMockMode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newLog: ChatActivityLog = {
      id: body.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: body.channel || "whatsapp",
      chat_id: body.chat_id || null,
      sender_name: body.sender_name || "System",
      input_type: body.input_type || "text",
      raw_prompt: body.raw_prompt || "",
      status: body.status || "success",
      error_message: body.error_message || null,
      ai_model: body.ai_model || "Meta Graph API v21.0",
      latency_ms: body.latency_ms || null,
      parsed_metadata: body.parsed_metadata || {},
      transaction_id: body.transaction_id || null,
      created_at: body.created_at || new Date().toISOString(),
      completed_at: body.completed_at || new Date().toISOString(),
    };

    recordChatLog(newLog);
    return NextResponse.json({ success: true, log: newLog });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
