import { NextRequest, NextResponse } from "next/server";
import { getPresignedDocViewUrl } from "@/lib/storage/r2";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const redirect = searchParams.get("redirect") === "true";

    if (!key) {
      return NextResponse.json({ error: "Key dokumen tidak ditemukan" }, { status: 400 });
    }

    const viewUrl = await getPresignedDocViewUrl(key, 3600); // 1-hour presigned link

    if (!viewUrl) {
      return NextResponse.json(
        { error: "Gagal menghasilkan tautan akses dokumen" },
        { status: 404 }
      );
    }

    if (redirect) {
      return NextResponse.redirect(viewUrl);
    }

    return NextResponse.json({ success: true, viewUrl });
  } catch (err: any) {
    console.error("Vault presigned view error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal membuka berkas dokumen" },
      { status: 500 }
    );
  }
}
