import { NextResponse } from "next/server";

type ChatContext = {
  productMode?: string;
  currentView?: string;
  quantity?: number;
  transferSize?: string;
  sheetSize?: string;
  storeName?: string;
};

function buildReply(message: string, context: ChatContext) {
  const input = message.toLowerCase();
  const storeName = context.storeName || "your store";

  if (input.includes("variant") || input.includes("size")) {
    return `Choose the correct size variant on the product page before sending the design to cart. If the selector is missing in ${storeName}, update the product template and ensure the product has live Shopify variants.`;
  }

  if (input.includes("upload") || input.includes("art") || input.includes("image")) {
    return "Upload a PNG for the cleanest print result. After upload, drag the artwork inside the print zone and confirm the resolution status shows usable or good before checkout.";
  }

  if (input.includes("cart") || input.includes("checkout")) {
    return "Use the product page flow: select the variant, upload the art, and send the customized design to Shopify cart. The order will carry preview and production metadata as line-item properties.";
  }

  if (input.includes("move") || input.includes("drag") || input.includes("position")) {
    return "Drag the artwork inside the print area and use the move or scale controls for fine adjustments. If snapping feels too strong, turn off grid snapping in the owner settings panel.";
  }

  return `The designer is live for ${storeName}. Current mode: ${context.productMode || "apparel"}. Current view: ${context.currentView || "front"}. Continue customizing, then send the finished design to Shopify cart.`;
}

function buildSuggestions(context: ChatContext) {
  return [
    "Upload artwork",
    "Check variant sync",
    `View: ${context.currentView || "front"}`,
    `Mode: ${context.productMode || "apparel"}`,
  ];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const context = (body?.context || {}) as ChatContext;

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      reply: buildReply(message, context),
      suggestions: buildSuggestions(context),
    });
  } catch {
    return NextResponse.json({ error: "AI chat failed." }, { status: 500 });
  }
}
