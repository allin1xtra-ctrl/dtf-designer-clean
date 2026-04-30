import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const context = body?.context || {};
    const productMode = context.productMode === "transfer" ? "transfer" : "apparel";
    const quantity = Math.max(1, Number(context.quantity || 1));
    const sellPrice = Number(context.sellPrice || 0);
    const estimatedCost = Number(context.estimatedCost || 0);
    const recommendedSheet = String(context.recommendedSheet || context.sheetSize || "12x8");
    const currentMargin = sellPrice > 0 ? Number((((sellPrice - estimatedCost) / sellPrice) * 100).toFixed(1)) : 0;
    const targetMargin = productMode === "transfer" ? 0.58 : 0.62;
    const minimumSell = estimatedCost > 0 ? estimatedCost / Math.max(0.1, 1 - targetMargin) : productMode === "transfer" ? 12.5 : 24.99;
    const suggestedSellPrice = Number(Math.max(sellPrice || 0, minimumSell).toFixed(2));
    const suggestedBasePrice = Number((suggestedSellPrice / quantity).toFixed(2));

    const notes = [
      `Verify the active mode is ${productMode} and the current view is ${context.currentView || "front"}.`,
      context.lastUploadStatus === "low"
        ? "Artwork is currently below the recommended DPI target, so shrinking or replacing it will improve print quality."
        : "Artwork quality looks acceptable for layout adjustments.",
      `Recommended sheet workflow is ${recommendedSheet}${Number(context.sheetCount || 1) > 1 ? ` with ${context.sheetCount} sheets` : ""}.`,
    ];

    const actions = [
      {
        type: "layout",
        label: "Auto-fix layout",
        message:
          productMode === "transfer"
            ? `Run gang-sheet layout optimization using ${recommendedSheet} to tighten spacing and reduce waste.`
            : `Center the artwork in the ${context.currentView || "front"} print zone and keep it inside the safe area.`,
        recommendedSheet,
      },
      {
        type: "pricing",
        label: "Suggest exact pricing",
        message: `Recommended sell price is $${suggestedSellPrice.toFixed(2)} with a base ${productMode} price around $${suggestedBasePrice.toFixed(2)}.`,
      },
    ];

    return NextResponse.json({
      ok: true,
      plan: {
        mode: productMode,
        quantity,
        suggestedSellPrice,
        suggestedBasePrice,
        currentMargin,
        recommendedSheet,
        notes,
        actions,
      },
    });
  } catch {
    return NextResponse.json({ error: "AI automation failed." }, { status: 500 });
  }
}
