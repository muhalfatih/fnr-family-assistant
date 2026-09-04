import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

/**
 * Result structure for uploaded media items
 */
export interface R2UploadResult {
  fileId: string;
  key: string;
  url: string;
  storageProvider: "cloudflare_r2" | "local_storage";
  mimeType?: string;
  sizeBytes?: number;
}

/**
 * Validates whether Cloudflare R2 credentials are fully populated
 */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_BUCKET_NAME
  );
}

let s3ClientInstance: S3Client | null = null;

/**
 * Returns a cached singleton S3 client configured for Cloudflare R2
 */
export function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    return null;
  }

  if (!s3ClientInstance) {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID!;
    s3ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  return s3ClientInstance;
}

/**
 * Local disk fallback: Saves receipt images to public/uploads/receipts
 */
export async function saveReceiptLocally(
  fileBuffer: Buffer,
  fileName: string
): Promise<R2UploadResult> {
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
      key: `local_receipts/${safeName}`,
      url: relativeUrl,
      storageProvider: "local_storage",
      sizeBytes: fileBuffer.length,
    };
  } catch (err) {
    console.error("Error saving receipt locally:", err);
    return {
      fileId: `local_${Date.now()}`,
      key: `local_receipts/${Date.now()}`,
      url: "",
      storageProvider: "local_storage",
    };
  }
}

/**
 * Local disk fallback: Saves vault documents to public/uploads/vault/<category>
 */
export async function saveVaultDocLocally(
  fileBuffer: Buffer,
  fileName: string,
  category: string
): Promise<R2UploadResult> {
  try {
    const safeCategory = (category || "identity").replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadDir = path.join(process.cwd(), "public", "uploads", "vault", safeCategory);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, fileBuffer);

    const relativeUrl = `/uploads/vault/${safeCategory}/${safeName}`;
    return {
      fileId: `local_vault_${safeName}`,
      key: `local_vault/${safeCategory}/${safeName}`,
      url: relativeUrl,
      storageProvider: "local_storage",
      sizeBytes: fileBuffer.length,
    };
  } catch (err) {
    console.error("Error saving vault document locally:", err);
    return {
      fileId: `local_vault_${Date.now()}`,
      key: `local_vault/${Date.now()}`,
      url: "",
      storageProvider: "local_storage",
    };
  }
}

/**
 * Uploads a transaction receipt image to Cloudflare R2
 * Folder structure: receipts/YYYY/MM/struk_<timestamp>_<name>
 * Public access: delivers via CLOUDFLARE_R2_PUBLIC_URL or direct CDN
 * Resilient fallback: saves to local storage if R2 is not configured
 */
export async function uploadReceiptToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<R2UploadResult> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (client && bucket) {
    try {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const objectKey = `receipts/${year}/${month}/${Date.now()}_${safeName}`;

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: fileBuffer,
          ContentType: mimeType,
        })
      );

      // Public URL resolution
      let publicUrl = "";
      if (process.env.CLOUDFLARE_R2_PUBLIC_URL) {
        const baseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, "");
        publicUrl = `${baseUrl}/${objectKey}`;
      } else {
        // If public URL not set, generate a long-lived presigned URL (7 days)
        publicUrl = await getSignedUrl(
          client,
          new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
          { expiresIn: 60 * 60 * 24 * 7 }
        );
      }

      return {
        fileId: objectKey,
        key: objectKey,
        url: publicUrl,
        storageProvider: "cloudflare_r2",
        mimeType,
        sizeBytes: fileBuffer.length,
      };
    } catch (err: any) {
      console.warn("⚠️ Cloudflare R2 upload failed, using local storage fallback:", err.message);
    }
  }

  // Fallback to local storage
  return await saveReceiptLocally(fileBuffer, fileName);
}

/**
 * Uploads a family vault document to Cloudflare R2 (Private storage)
 * Folder structure: vault/<category>/doc_<timestamp>_<name>
 */
export async function uploadVaultDocToR2(
  fileBuffer: Buffer,
  fileName: string,
  category: string = "identity",
  mimeType: string = "application/pdf"
): Promise<R2UploadResult> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (client && bucket) {
    try {
      const safeCategory = (category || "identity").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const objectKey = `vault/${safeCategory}/${Date.now()}_${safeName}`;

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: fileBuffer,
          ContentType: mimeType,
        })
      );

      return {
        fileId: objectKey,
        key: objectKey,
        url: "", // Intentionally empty for private documents; view via presigned URL
        storageProvider: "cloudflare_r2",
        mimeType,
        sizeBytes: fileBuffer.length,
      };
    } catch (err: any) {
      console.warn("⚠️ Cloudflare R2 vault doc upload failed, using local storage fallback:", err.message);
    }
  }

  // Fallback to local storage
  return await saveVaultDocLocally(fileBuffer, fileName, category);
}

/**
 * Generates a temporary secure Presigned URL to view a private Vault document
 * Default expiry: 3600 seconds (1 hour)
 */
export async function getPresignedDocViewUrl(
  objectKey: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (!objectKey) return "";

  // If already a full web URL or local relative path
  if (objectKey.startsWith("http://") || objectKey.startsWith("https://") || objectKey.startsWith("/uploads/")) {
    return objectKey;
  }

  // If it's a local fallback key
  if (objectKey.startsWith("local_vault/")) {
    const relativePath = objectKey.replace(/^local_vault\//, "");
    return `/uploads/vault/${relativePath}`;
  }

  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!client || !bucket) {
    return "";
  }

  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      }),
      { expiresIn: expiresInSeconds }
    );
  } catch (err: any) {
    console.error("Error generating presigned URL for document:", err);
    return "";
  }
}

export interface DeleteReceiptMediaParams {
  fileId?: string | null;
  viewUrl?: string | null;
  mediaUrl?: string | null;
}

/**
 * Permanently deletes transaction receipt media from Cloudflare R2, local storage, or Google Drive
 */
export async function deleteReceiptMedia(
  media: DeleteReceiptMediaParams
): Promise<{ deletedFrom: string[]; errors: string[] }> {
  const deletedFrom: string[] = [];
  const errors: string[] = [];

  const candidateKeyOrId = media.fileId || "";
  const candidateUrl = media.viewUrl || media.mediaUrl || "";

  // 1. Delete from Local Storage if stored on disk
  try {
    let localFileName = "";
    if (candidateKeyOrId.startsWith("local_receipts/")) {
      localFileName = candidateKeyOrId.replace(/^local_receipts\//, "");
    } else if (candidateKeyOrId.startsWith("local_")) {
      localFileName = candidateKeyOrId.replace(/^local_/, "");
    } else if (candidateUrl.includes("/uploads/receipts/")) {
      localFileName = candidateUrl.split("/uploads/receipts/").pop() || "";
    }

    if (localFileName) {
      const cleanFileName = path.basename(localFileName);
      const localFilePath = path.join(process.cwd(), "public", "uploads", "receipts", cleanFileName);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        deletedFrom.push(`local_storage:${cleanFileName}`);
        console.log(`[Storage] Deleted local receipt file: ${cleanFileName}`);
      }
    }
  } catch (err: any) {
    errors.push(`local_storage: ${err.message}`);
  }

  // 2. Delete from Cloudflare R2 if stored in bucket
  try {
    const client = getR2Client();
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    let r2Key = "";
    if (candidateKeyOrId.startsWith("receipts/")) {
      r2Key = candidateKeyOrId;
    } else if (candidateUrl.includes("/receipts/")) {
      const match = candidateUrl.match(/(receipts\/[^\?\#]+)/);
      if (match) r2Key = match[1];
    }

    if (client && bucket && r2Key) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: r2Key,
        })
      );
      deletedFrom.push(`cloudflare_r2:${r2Key}`);
      console.log(`[Storage] Deleted Cloudflare R2 object: ${r2Key}`);
    }
  } catch (err: any) {
    errors.push(`cloudflare_r2: ${err.message}`);
  }

  // 3. Delete from Google Drive if stored as a Drive file ID
  try {
    const isGoogleDriveId =
      candidateKeyOrId &&
      !candidateKeyOrId.includes("/") &&
      !candidateKeyOrId.startsWith("local_") &&
      candidateKeyOrId.length >= 20;

    if (isGoogleDriveId) {
      const { deleteFileFromDrive } = await import("@/lib/google/drive");
      const gdriveDeleted = await deleteFileFromDrive(candidateKeyOrId);
      if (gdriveDeleted) {
        deletedFrom.push(`google_drive:${candidateKeyOrId}`);
      }
    }
  } catch (err: any) {
    errors.push(`google_drive: ${err.message}`);
  }

  return { deletedFrom, errors };
}
