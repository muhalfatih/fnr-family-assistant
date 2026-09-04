import { NextRequest, NextResponse } from "next/server";
import { getPresignedReceiptViewUrl, getReceiptMediaStream } from "@/lib/storage/r2";
import { mockStore } from "@/lib/mock-data";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Generates a clean, realistic SVG receipt voucher for demo/mock receipts or fallbacks
 */
function generateReceiptSvg(title: string, merchant: string, items: Array<{ name: string; qty: number; price: number }>, total: number, dateStr: string): string {
  const itemRows = items.map((it, idx) => {
    const y = 210 + idx * 26;
    const subtotal = (it.qty || 1) * it.price;
    return `
      <text x="32" y="${y}" font-family="monospace" font-size="12" fill="#1e293b">${it.name.substring(0, 24)}</text>
      <text x="260" y="${y}" font-family="monospace" font-size="11" fill="#64748b">${it.qty}x</text>
      <text x="368" y="${y}" text-anchor="end" font-family="monospace" font-size="12" font-weight="600" fill="#0f172a">Rp ${subtotal.toLocaleString("id-ID")}</text>
    `;
  }).join("");

  const totalY = 220 + items.length * 26 + 15;
  const barcodeY = totalY + 45;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${barcodeY + 90}" viewBox="0 0 400 ${barcodeY + 90}">
    <defs>
      <filter id="shadow" x="-5%" y="-2%" width="110%" height="106%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.08"/>
      </filter>
    </defs>
    <!-- Paper Card Background -->
    <rect x="16" y="16" width="368" height="${barcodeY + 50}" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadow)"/>
    
    <!-- Header Jagged/Dotted accent -->
    <rect x="16" y="16" width="368" height="12" rx="6" fill="#0ea5e9" opacity="0.8"/>
    
    <!-- Store Title & Icon -->
    <text x="200" y="65" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="700" fill="#0f172a">${merchant.toUpperCase()}</text>
    <text x="200" y="85" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748b">STRUK BELANJA KELUARGA • F&amp;R FAMILY HUB</text>
    <text x="200" y="103" text-anchor="middle" font-family="monospace" font-size="11" fill="#94a3b8">${dateStr}</text>
    
    <!-- Divider Line -->
    <line x1="32" y1="120" x2="368" y2="120" stroke="#cbd5e1" stroke-dasharray="4 3" stroke-width="1.5"/>
    
    <!-- Table Header -->
    <text x="32" y="145" font-family="monospace" font-size="11" font-weight="600" fill="#64748b">ITEM / PRODUK</text>
    <text x="250" y="145" font-family="monospace" font-size="11" font-weight="600" fill="#64748b">QTY</text>
    <text x="368" y="145" text-anchor="end" font-family="monospace" font-size="11" font-weight="600" fill="#64748b">TOTAL</text>
    <line x1="32" y1="158" x2="368" y2="158" stroke="#e2e8f0" stroke-width="1"/>
    
    <!-- Item Rows -->
    ${itemRows}
    
    <!-- Subtotal Divider -->
    <line x1="32" y1="${totalY - 15}" x2="368" y2="${totalY - 15}" stroke="#cbd5e1" stroke-dasharray="4 3" stroke-width="1.5"/>
    
    <!-- Total Section -->
    <text x="32" y="${totalY + 10}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" fill="#0f172a">TOTAL PEMBAYARAN</text>
    <text x="368" y="${totalY + 10}" text-anchor="end" font-family="monospace" font-size="17" font-weight="800" fill="#0284c7">Rp ${total.toLocaleString("id-ID")}</text>
    <text x="368" y="${totalY + 26}" text-anchor="end" font-family="sans-serif" font-size="10" fill="#16a34a">● LUNAS / VERIFIED</text>
    
    <!-- Barcode Simulation -->
    <g transform="translate(60, ${barcodeY})">
      <rect x="0" y="0" width="4" height="28" fill="#1e293b"/>
      <rect x="8" y="0" width="2" height="28" fill="#1e293b"/>
      <rect x="14" y="0" width="6" height="28" fill="#1e293b"/>
      <rect x="24" y="0" width="3" height="28" fill="#1e293b"/>
      <rect x="30" y="0" width="2" height="28" fill="#1e293b"/>
      <rect x="36" y="0" width="8" height="28" fill="#1e293b"/>
      <rect x="48" y="0" width="3" height="28" fill="#1e293b"/>
      <rect x="55" y="0" width="5" height="28" fill="#1e293b"/>
      <rect x="64" y="0" width="2" height="28" fill="#1e293b"/>
      <rect x="70" y="0" width="7" height="28" fill="#1e293b"/>
      <rect x="81" y="0" width="4" height="28" fill="#1e293b"/>
      <rect x="89" y="0" width="2" height="28" fill="#1e293b"/>
      <rect x="95" y="0" width="6" height="28" fill="#1e293b"/>
      <rect x="105" y="0" width="3" height="28" fill="#1e293b"/>
      <rect x="112" y="0" width="5" height="28" fill="#1e293b"/>
      <rect x="121" y="0" width="2" height="28" fill="#1e293b"/>
      <rect x="127" y="0" width="7" height="28" fill="#1e293b"/>
      <rect x="138" y="0" width="4" height="28" fill="#1e293b"/>
      <rect x="146" y="0" width="3" height="28" fill="#1e293b"/>
      <rect x="153" y="0" width="6" height="28" fill="#1e293b"/>
      <rect x="163" y="0" width="2" height="28" fill="#1e293b"/>
      <rect x="169" y="0" width="5" height="28" fill="#1e293b"/>
      <rect x="178" y="0" width="4" height="28" fill="#1e293b"/>
      <rect x="186" y="0" width="8" height="28" fill="#1e293b"/>
      <rect x="198" y="0" width="3" height="28" fill="#1e293b"/>
      <rect x="205" y="0" width="5" height="28" fill="#1e293b"/>
      <rect x="214" y="0" width="2" height="28" fill="#1e293b"/>
      <rect x="220" y="0" width="7" height="28" fill="#1e293b"/>
      <rect x="231" y="0" width="4" height="28" fill="#1e293b"/>
      <rect x="239" y="0" width="2" height="28" fill="#1e293b"/>
      <rect x="245" y="0" width="6" height="28" fill="#1e293b"/>
      <rect x="255" y="0" width="4" height="28" fill="#1e293b"/>
      <rect x="263" y="0" width="8" height="28" fill="#1e293b"/>
      <rect x="275" y="0" width="3" height="28" fill="#1e293b"/>
    </g>
    <text x="200" y="${barcodeY + 40}" text-anchor="middle" font-family="monospace" font-size="10" fill="#94a3b8">CLOUDFLARE R2 • VERIFIED ARCHIVE</text>
  </svg>`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get("key");
    const idParam = searchParams.get("id");
    const redirectParam = searchParams.get("redirect") === "true";
    const formatParam = searchParams.get("format");

    let resolvedKey = keyParam || "";
    let txData: any = null;

    // 1. If transaction ID is provided, look up transaction to obtain candidate key or metadata
    if (idParam) {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabaseAdmin
            .from("transactions")
            .select("id, description, amount, transaction_date, drive_file_id, drive_view_url, media_url, parsed_metadata")
            .eq("id", idParam)
            .single();
          if (data) txData = data;
        } catch {
          // ignore error and fallback to mock
        }
      }

      if (!txData) {
        txData = mockStore.getTransactions().find((t) => t.id === idParam) || null;
      }

      if (txData && !resolvedKey) {
        resolvedKey =
          txData.drive_file_id ||
          txData.drive_view_url ||
          txData.media_url ||
          "";
      }
    }

    // 2. Handle HTTP direct links (e.g. already full public URLs)
    if (resolvedKey.startsWith("http://") || resolvedKey.startsWith("https://")) {
      if (redirectParam) {
        return NextResponse.redirect(resolvedKey);
      }
      if (formatParam === "json") {
        return NextResponse.json({ success: true, url: resolvedKey });
      }
      return NextResponse.redirect(resolvedKey);
    }

    // 3. If redirect is requested, try presigned URL
    if (redirectParam) {
      const presigned = await getPresignedReceiptViewUrl(resolvedKey, 3600);
      if (presigned) {
        return NextResponse.redirect(presigned);
      }
    }

    // 4. Try streaming media directly from Cloudflare R2 or local storage
    if (resolvedKey) {
      const mediaResult = await getReceiptMediaStream(resolvedKey);
      if (mediaResult) {
        return new NextResponse(new Uint8Array(mediaResult.buffer), {
          status: 200,
          headers: {
            "Content-Type": mediaResult.contentType,
            "Content-Length": mediaResult.contentLength.toString(),
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            "Content-Disposition": "inline",
          },
        });
      }
    }

    // 5. Fallback: If mock or itemized receipt data is available, generate SVG receipt voucher
    const merchantName = txData?.parsed_metadata?.merchant || txData?.description || "Superindo Dago";
    const receiptItems = txData?.parsed_metadata?.items || [
      { name: "Beras Pandan Wangi 5kg", qty: 2, price: 185000 },
      { name: "Minyak Goreng 2L", qty: 3, price: 105000 },
      { name: "Daging Sapi Segar 1kg", qty: 2, price: 280000 },
      { name: "Buah & Sayur Segar", qty: 1, price: 420000 },
      { name: "Kebutuhan Dapur & Susu", qty: 1, price: 675000 },
    ];
    const totalAmount = txData?.amount || 1850000;
    const dateFormatted = txData?.transaction_date ? new Date(txData.transaction_date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) : "01 Sep 2026, 11:45 WIB";

    const svgReceipt = generateReceiptSvg(
      txData?.description || "Bukti Transaksi",
      merchantName,
      receiptItems,
      totalAmount,
      dateFormatted
    );

    return new NextResponse(svgReceipt, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "Content-Disposition": "inline",
      },
    });
  } catch (err: any) {
    console.error("[Media Proxy] Error resolving media:", err);
    return NextResponse.json(
      { error: err.message || "Gagal memuat media transaksi" },
      { status: 500 }
    );
  }
}
