import { NextRequest, NextResponse } from "next/server";
import { getChatActivityLogs } from "@/lib/bot/process-manager";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");

    let logs = await getChatActivityLogs(limit);

    if (channel && channel !== "all") {
      logs = logs.filter((l) => l.channel === channel);
    }

    if (status && status !== "all") {
      logs = logs.filter((l) => l.status === status);
    }

    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
