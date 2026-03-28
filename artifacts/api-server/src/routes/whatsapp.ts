import { Router, type IRouter } from "express";
import axios from "axios";

const router: IRouter = Router();

const PHONE_NUMBER_ID = process.env["PHONE_NUMBER_ID"] ?? "1051895501342348";
const WHATSAPP_ACCESS_TOKEN = process.env["WHATSAPP_ACCESS_TOKEN"] ?? "";
const GRAPH_API_URL = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

const TEMPLATES: Record<string, { name: string; language: string; label: string }> = {
  hello_world: {
    name: "hello_world",
    language: "en_US",
    label: "Hello World (Test)",
  },
  new_load_alert: {
    name: "new_load_alert",
    language: "en",
    label: "New Load Alert",
  },
  driver_approval: {
    name: "driver_approval",
    language: "en",
    label: "Driver Approval",
  },
};

async function sendWhatsAppNotification(
  toNumber: string,
  messageType: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHATSAPP_ACCESS_TOKEN) {
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN not configured" };
  }

  const template = TEMPLATES[messageType];
  if (!template) {
    return { success: false, error: `Unknown template: ${messageType}` };
  }

  const normalizedNumber = toNumber.replace(/\D/g, "");
  const to = normalizedNumber.startsWith("91")
    ? normalizedNumber
    : `91${normalizedNumber}`;

  try {
    const response = await axios.post(
      GRAPH_API_URL,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const messageId: string =
      response.data?.messages?.[0]?.id ?? "unknown";
    return { success: true, messageId };
  } catch (err: any) {
    const errMsg: string =
      err?.response?.data?.error?.message ?? err?.message ?? "Unknown error";
    return { success: false, error: errMsg };
  }
}

router.post("/whatsapp/send", async (req, res) => {
  const { phone, template } = req.body as { phone?: string; template?: string };

  if (!phone || !template) {
    res.status(400).json({ success: false, error: "phone aur template zaroori hain" });
    return;
  }

  const result = await sendWhatsAppNotification(phone, template);

  if (result.success) {
    res.json({ success: true, messageId: result.messageId });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

router.get("/whatsapp/templates", (_req, res) => {
  const list = Object.entries(TEMPLATES).map(([key, val]) => ({
    key,
    label: val.label,
  }));
  res.json({ templates: list });
});

export default router;
