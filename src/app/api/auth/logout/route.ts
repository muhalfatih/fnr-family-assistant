import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Sesi Anda telah berhasil diakhiri.",
  });

  response.cookies.set("fnr_session", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  return response;
}
