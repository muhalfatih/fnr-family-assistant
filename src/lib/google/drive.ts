import { google } from "googleapis";
import { Readable } from "stream";
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
  });

  return folder.data.id!;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
}

/**
 * Uploads a receipt image to structured Google Drive folder:
 * Root -> Struk & Nota -> YYYY -> MM -> File
 */
export async function uploadReceiptToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<DriveUploadResult | null> {
  const auth = getGoogleAuthClient();
  if (!auth) {
    console.warn("⚠️ Google Auth not available. Skipping Google Drive upload.");
    return null;
  }

  try {
    const drive = google.drive({ version: "v3", auth });
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

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
      });
    } catch (permErr) {
      console.warn("Notice: Could not set public permission on Drive file:", permErr);
    }

    return {
      fileId: fileId,
      webViewLink: uploaded.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      webContentLink: uploaded.data.webContentLink || undefined,
      thumbnailLink: uploaded.data.thumbnailLink || undefined,
    };
  } catch (err) {
    console.error("❌ Error uploading to Google Drive:", err);
    return null;
  }
}
