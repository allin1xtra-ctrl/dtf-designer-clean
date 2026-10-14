import { premiumMockupAssets } from "./premium-mockup-assets";

const colorIds: Record<string, string> = {
  black: "black", white: "white", heatherGrey: "heather-grey", regularGrey: "regular-grey",
  royalBlue: "royal-blue", red: "red", offWhite: "off-white",
};

export function getPremiumMockup(productId: string, colorKey: string, view: string) {
  const colorId = colorIds[colorKey] || colorKey;
  const exact = premiumMockupAssets.find(item => item.productId === productId && item.colorId === colorId && item.view === view);
  const asset = exact || premiumMockupAssets.find(item => item.productId === productId && item.colorId === "black" && item.view === view);
  if (!asset) return null;
  return { label: `Unbranded premium ${asset.colorId} ${productId} ${view} mockup`, url: asset.url, hasBakedPrintGuide: false, fallbackColor: !exact };
}
