import { Router, type IRouter } from "express";
import axios from "axios";

const router: IRouter = Router();

const PHONE_NUMBER_ID = process.env["PHONE_NUMBER_ID"] ?? "1051895501342348";
const WHATSAPP_ACCESS_TOKEN = process.env["WHATSAPP_ACCESS_TOKEN"] ?? "";
const GRAPH_API_URL = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

export interface TemplateInfo {
  name: string;
  language: string;
  label: string;
  variableHints: string[];
}

export const TEMPLATES: Record<string, TemplateInfo> = {
  hello_world: {
    name: "hello_world",
    language: "en_US",
    label: "Hello World (Test)",
    variableHints: [],
  },
  new_load_alert: {
    name: "new_load_alert",
    language: "en",
    label: "New Load Alert (Driver ko)",
    variableHints: ["Driver Name", "From City", "To City", "Weight (tons)", "Freight (₹)"],
  },
  booking_confirmed: {
    name: "booking_confirmed",
    language: "en",
    label: "Booking Confirmed (Merchant ko)",
    variableHints: ["Merchant Name", "Bilty Number", "Driver Name", "From City", "To City"],
  },
  driver_approval: {
    name: "driver_approval",
    language: "en",
    label: "Driver Approval",
    variableHints: ["Driver Name"],
  },
};

/**
 * Reusable function: sendAppNotification
 * @param number   - Phone number (10-digit or with 91 country code)
 * @param templateName - Key from TEMPLATES map
 * @param variables    - Array of string values for template body parameters
 */
export async function sendAppNotification(
  number: string,
  templateName: string,
  variables: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHATSAPP_ACCESS_TOKEN) {
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN not configured" };
  }

  const template = TEMPLATES[templateName];
  if (!template) {
    return { success: false, error: `Unknown template: ${templateName}` };
  }

  const normalized = number.replace(/\D/g, "");
  const to = normalized.startsWith("91") ? normalized : `91${normalized}`;

  const body: Record<string, any> = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
    },
  };

  if (variables.length > 0) {
    body.template.components = [
      {
        type: "body",
        parameters: variables.map((v) => ({ type: "text", text: String(v) })),
      },
    ];
  }

  try {
    const response = await axios.post(GRAPH_API_URL, body, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const messageId: string = response.data?.messages?.[0]?.id ?? "unknown";
    return { success: true, messageId };
  } catch (err: any) {
    const errMsg: string =
      err?.response?.data?.error?.message ?? err?.message ?? "Unknown error";
    return { success: false, error: errMsg };
  }
}

router.post("/whatsapp/send", async (req, res) => {
  const { phone, template, variables } = req.body as {
    phone?: string;
    template?: string;
    variables?: string[];
  };

  if (!phone || !template) {
    res.status(400).json({ success: false, error: "phone aur template zaroori hain" });
    return;
  }

  const result = await sendAppNotification(phone, template, variables ?? []);

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
    variableHints: val.variableHints,
  }));
  res.json({ templates: list });
});

export default router;
