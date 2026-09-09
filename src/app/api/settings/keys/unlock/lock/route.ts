import { NextResponse } from "next/server";
import { UNLOCK_COOKIE_NAME } from "@/lib/security/unlock-token";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
    message: "Kunci API telah dikunci kembali.",
  });

  response.cookies.delete(UNLOCK_COOKIE_NAME);
  response.cookies.delete("fnr_otp_challenge");

  return response;
}
