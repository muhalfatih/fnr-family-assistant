/**
 * F&R Family Hub — WhatsApp Bot Configuration & Customizable Message Templates
 */

export interface WhatsAppBotConfig {
  enableInstantAck: boolean;
  enableFastPathRegex: boolean;
  enableAsyncMediaUpload: boolean;
  receiptAckMessage: string;
  audioAckMessage: string;
}

export const whatsAppConfig: WhatsAppBotConfig = {
  // Flag to enable/disable instant acknowledgment message for photos and voice notes
  enableInstantAck: process.env.WHATSAPP_ENABLE_INSTANT_ACK !== "false",

  // Flag to enable fast-path regex parsing for common Indonesian transactions
  enableFastPathRegex: process.env.WHATSAPP_ENABLE_FAST_PATH !== "false",

  // Flag to enable non-blocking background upload to Cloudflare R2 / Media Storage
  enableAsyncMediaUpload:
    process.env.WHATSAPP_ENABLE_ASYNC_R2 !== "false" &&
    process.env.WHATSAPP_ENABLE_ASYNC_DRIVE !== "false",

  // Customizable instant acknowledgment message when receiving a receipt photo
  receiptAckMessage:
    process.env.WHATSAPP_RECEIPT_ACK_MESSAGE ||
    "📸 *Struk diterima!*\n⏳ _Sedang menganalisis rincian belanja & menghitung total..._",

  // Customizable instant acknowledgment message when receiving a voice note
  audioAckMessage:
    process.env.WHATSAPP_AUDIO_ACK_MESSAGE ||
    "🎙️ *Pesan suara diterima!*\n⏳ _Sedang mentranskripsikan rekaman ucapan Anda..._",
};

/**
 * Returns formatted receipt acknowledgment text
 */
export function getReceiptAckMessage(): string {
  return whatsAppConfig.receiptAckMessage;
}

/**
 * Returns formatted audio acknowledgment text
 */
export function getAudioAckMessage(): string {
  return whatsAppConfig.audioAckMessage;
}
