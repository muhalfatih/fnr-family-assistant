import { NextRequest, NextResponse } from "next/server";
import { getActiveBotProcesses, cancelBotProcess } from "@/lib/bot/process-manager";

export async function GET() {
  try {
    const tasks = getActiveBotProcesses();
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, reason = "Dibatalkan oleh pengguna melalui Web Dashboard" } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    const success = await cancelBotProcess(taskId, reason);

    if (!success) {
      return NextResponse.json({ error: "Task not found or already finished" }, { status: 404 });
    }

    return NextResponse.json({ success: true, taskId, status: "cancelled" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
