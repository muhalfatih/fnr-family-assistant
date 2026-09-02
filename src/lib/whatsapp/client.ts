/**
 * F&R Family Hub — Official Meta WhatsApp Cloud API Client
 * Handles outbound messaging, interactive components, and media downloads
 */

const GRAPH_API_VERSION = "v21.0";

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppSectionRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppSection {
  title: string;
  rows: WhatsAppSectionRow[];
}

function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  return {
    token,
    phoneNumberId,
    isConfigured: Boolean(token && phoneNumberId),
  };
}

/**
 * Normalizes phone number into WhatsApp format (digits only, e.g. 628123456789)
 */
export function normalizeWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.substring(1)}`;
  } else if (cleaned.startsWith("+62")) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Sends a plain text message to a WhatsApp recipient
 */
export async function sendWhatsAppTextMessage(to: string, bodyText: string) {
  const { token, phoneNumberId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured) {
    console.warn("[WhatsApp] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set in environment.");
    return { ok: false, error: "missing_configuration" };
  }

  const recipient = normalizeWhatsAppNumber(to);
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: bodyText,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[WhatsApp] Error sending text message:", data);
      return { ok: false, error: data };
    }

    return { ok: true, data };
  } catch (error: any) {
    console.error("[WhatsApp] Network error sending message:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Sends an interactive button message (up to 3 quick reply buttons)
 */
export async function sendWhatsAppInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: WhatsAppButton[],
  headerText?: string,
  footerText?: string
) {
  const { token, phoneNumberId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured) {
    console.warn("[WhatsApp] Client not configured. Falling back to plain text.");
    return sendWhatsAppTextMessage(to, bodyText);
  }

  const recipient = normalizeWhatsAppNumber(to);
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const interactivePayload: any = {
    type: "button",
    body: {
      text: bodyText,
    },
    action: {
      buttons: buttons.slice(0, 3).map((btn) => ({
        type: "reply",
        reply: {
          id: btn.id,
          title: btn.title.slice(0, 20), // WhatsApp limits button title to 20 chars
        },
      })),
    },
  };

  if (headerText) {
    interactivePayload.header = {
      type: "text",
      text: headerText,
    };
  }

  if (footerText) {
    interactivePayload.footer = {
      text: footerText,
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "interactive",
        interactive: interactivePayload,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[WhatsApp] Error sending interactive buttons, falling back to text:", data);
      return sendWhatsAppTextMessage(to, bodyText);
    }

    return { ok: true, data };
  } catch (error: any) {
    console.error("[WhatsApp] Network error sending interactive message:", error);
    return sendWhatsAppTextMessage(to, bodyText);
  }
}

/**
 * Sends an interactive list menu message (up to 10 options grouped in sections)
 */
export async function sendWhatsAppInteractiveList(
  to: string,
  bodyText: string,
  buttonLabel: string,
  sections: WhatsAppSection[],
  headerText?: string,
  footerText?: string
) {
  const { token, phoneNumberId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured) {
    return sendWhatsAppTextMessage(to, bodyText);
  }

  const recipient = normalizeWhatsAppNumber(to);
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const interactivePayload: any = {
    type: "list",
    body: {
      text: bodyText,
    },
    action: {
      button: buttonLabel.slice(0, 20),
      sections: sections.map((sec) => ({
        title: sec.title.slice(0, 24),
        rows: sec.rows.slice(0, 10).map((row) => ({
          id: row.id,
          title: row.title.slice(0, 24),
          description: row.description ? row.description.slice(0, 72) : undefined,
        })),
      })),
    },
  };

  if (headerText) {
    interactivePayload.header = {
      type: "text",
      text: headerText,
    };
  }

  if (footerText) {
    interactivePayload.footer = {
      text: footerText,
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "interactive",
        interactive: interactivePayload,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[WhatsApp] Error sending list menu, falling back to text:", data);
      return sendWhatsAppTextMessage(to, bodyText);
    }

    return { ok: true, data };
  } catch (error: any) {
    console.error("[WhatsApp] Network error sending list menu:", error);
    return sendWhatsAppTextMessage(to, bodyText);
  }
}

/**
 * Marks a message as read in WhatsApp conversation
 */
export async function markWhatsAppMessageAsRead(messageId: string) {
  const { token, phoneNumberId, isConfigured } = getWhatsAppConfig();

  if (!isConfigured) return;

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch (e) {
    // Non-critical, ignore
  }
}

/**
 * Downloads a media asset (photo, audio, document) from WhatsApp servers
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const { token, isConfigured } = getWhatsAppConfig();

  if (!isConfigured || !token) {
    throw new Error("WhatsApp API token is not configured.");
  }

  try {
    // 1. Get media URL
    const metaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!metaRes.ok) {
      console.error("[WhatsApp] Failed to fetch media URL:", await metaRes.text());
      return null;
    }

    const metaData = await metaRes.json();
    const downloadUrl = metaData.url;
    const mimeType = metaData.mime_type || "application/octet-stream";

    if (!downloadUrl) {
      console.error("[WhatsApp] Media URL missing in response:", metaData);
      return null;
    }

    // 2. Download binary content
    const binaryRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!binaryRes.ok) {
      console.error("[WhatsApp] Failed to download media binary:", await binaryRes.text());
      return null;
    }

    const arrayBuffer = await binaryRes.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
    };
  } catch (error) {
    console.error("[WhatsApp] Exception downloading media:", error);
    return null;
  }
}
