import { google } from "googleapis";
import { getGoogleAuthClient } from "./auth";

/**
 * Permanently deletes a file from Google Drive by fileId
 */
export async function deleteFileFromDrive(fileId: string): Promise<boolean> {
  if (!fileId) return false;

  const auth = getGoogleAuthClient();
  if (!auth) {
    return false;
  }

  try {
    const drive = google.drive({ version: "v3", auth });
    await drive.files.delete({ fileId });
    console.log(`[GoogleDrive] Successfully deleted file: ${fileId}`);
    return true;
  } catch (err: any) {
    console.warn(`[GoogleDrive] Failed to delete file ${fileId}:`, err.message);
    return false;
  }
}
