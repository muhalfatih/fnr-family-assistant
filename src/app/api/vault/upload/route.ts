import { NextRequest, NextResponse } from "next/server";
import { uploadVaultDocToR2 } from "@/lib/storage/r2";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "identity";

    if (!file) {
      return NextResponse.json({ error: "Berkas dokumen tidak ditemukan" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadVaultDocToR2(
      buffer,
      file.name,
      category,
      file.type || "application/octet-stream"
    );

    return NextResponse.json({
      success: true,
      key: uploadResult.key,
      fileId: uploadResult.fileId,
      url: uploadResult.url,
      storageProvider: uploadResult.storageProvider,
    });
  } catch (err: any) {
    console.error("Vault document upload error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal mengunggah dokumen ke penyimpanan" },
      { status: 500 }
    );
  }
}
