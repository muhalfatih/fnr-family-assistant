import { google } from "googleapis";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import { getGoogleAuthClient } from "./auth";

/**
 * Helper to find or create a subfolder in Google Drive
 */
async function getOrCreateFolder(
  drive: any,
  folderName: string,
  parentFolderId?: string | null
): Promise<string> {
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create folder
  const fileMetadata: any = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id",
    supportsAllDrives: true,
  });

  return folder.data.id!;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  storageProvider?: "google_drive" | "local_storage";
}

/**
 * Local fallback: Saves receipt image to public/uploads/receipts
 */
export async function saveReceiptLocally(
  fileBuffer: Buffer,
  fileName: string
): Promise<DriveUploadResult> {
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, fileBuffer);

    const relativeUrl = `/uploads/receipts/${safeName}`;
    return {
      fileId: `local_${safeName}`,
      webViewLink: relativeUrl,
      webContentLink: relativeUrl,
      storageProvider: "local_storage",
    };
  } catch (err) {
    console.error("Error saving receipt locally:", err);
    return {
      fileId: `local_${Date.now()}`,
      webViewLink: "",
      storageProvider: "local_storage",
    };
  }
}

/**
 * Uploads a receipt image to structured Google Drive folder:
 * Root -> Struk & Nota -> YYYY -> MM -> File
 * If Google Drive storage quota is exceeded (Service Account limitation),
 * gracefully falls back to local server storage so receipt photos are never lost.
 */
export async function uploadReceiptToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<DriveUploadResult | null> {
  const auth = getGoogleAuthClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (auth && rootFolderId) {
    try {
      const drive = google.drive({ version: "v3", auth });

      // 1. Get or create target folder structure: Struk & Nota -> YYYY -> MM
      const now = new Date();
      const yearStr = now.getFullYear().toString();
      const monthStr = (now.getMonth() + 1).toString().padStart(2, "0");

      const strukRootId = await getOrCreateFolder(drive, "Struk & Nota", rootFolderId);
      const yearFolderId = await getOrCreateFolder(drive, yearStr, strukRootId);
      const monthFolderId = await getOrCreateFolder(drive, monthStr, yearFolderId);

      // 2. Upload file stream
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);

      const fileMetadata: any = {
        name: fileName,
        parents: [monthFolderId],
      };

      const media = {
        mimeType: mimeType,
        body: bufferStream,
      };

      const uploaded = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink, webContentLink, thumbnailLink",
        supportsAllDrives: true,
      });

      const fileId = uploaded.data.id!;

      // 3. Make file accessible via link (Anyone with link can view)
      try {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
          supportsAllDrives: true,
        });
      } catch (permErr) {
        console.warn("Notice: Could not set public permission on Drive file:", permErr);
      }

      return {
        fileId: fileId,
        webViewLink: uploaded.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
        webContentLink: uploaded.data.webContentLink || undefined,
        thumbnailLink: uploaded.data.thumbnailLink || undefined,
        storageProvider: "google_drive",
      };
    } catch (err: any) {
      console.warn("⚠️ Google Drive upload failed (Service Account quota on personal My Drive):", err.message);
      console.log("ℹ️ Activating resilient local storage fallback for receipt photo...");
    }
  }

  // Fallback: save to local disk
  return await saveReceiptLocally(fileBuffer, fileName);
}
