import { google } from "googleapis";
import { getGoogleAuthClient } from "./auth";

export interface SheetTransactionRow {
  transactionDate: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  walletName: string;
  description?: string;
  memberName?: string;
  driveLink?: string;
}

/**
 * Appends a single transaction row in real-time to Google Sheets
 */
export async function appendTransactionToSheet(
  data: SheetTransactionRow,
  spreadsheetId?: string
): Promise<boolean> {
  const auth = getGoogleAuthClient();
  if (!auth) {
    console.warn("⚠️ Google Auth not available. Skipping Google Sheets append.");
    return false;
  }

  const targetSpreadsheetId = spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!targetSpreadsheetId) {
    console.warn("⚠️ GOOGLE_SHEETS_SPREADSHEET_ID is not configured.");
    return false;
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });

    const now = new Date();
    const timestampStr = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);

    const typeLabel =
      data.type === "expense" ? "Pengeluaran" : data.type === "income" ? "Pemasukan" : "Transfer";

    // Format row values
    const rowValues = [
      timestampStr,
      data.transactionDate,
      typeLabel,
      data.category,
      data.amount,
      data.walletName,
      data.description || "-",
      data.memberName || "Bot",
      data.driveLink || "-",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: targetSpreadsheetId,
      range: "A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowValues],
      },
    });

    return true;
  } catch (err) {
    console.error("❌ Error appending transaction to Google Sheets:", err);
    return false;
  }
}
