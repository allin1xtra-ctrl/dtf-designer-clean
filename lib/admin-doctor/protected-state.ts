export type ProtectedPlacement = {
  designArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  maxPrintWidth: number;
  maxPrintHeight: number;
};

export const PROTECTED_LIVE_STATE = {
  liveCustomizerTag: "live-customizer-working-v3",
  backupCommit: "c0050d4",
  backupBranch: "stable-live-customizer",
  upgradeBranch: "ai-admin-doctor-upgrade",
  rules: [
    "Do not change protected customizer placement without explicit approval.",
    "Do not change checkout/cart logic without explicit approval.",
    "Do not change Shopify files unless specifically asked.",
    "Do not push directly to main.",
    "Do not merge to main.",
    "Do not promote Vercel production.",
    "Do not print or expose environment secret values.",
  ],
  protectedPlacements: {
    front: {
      designArea: { x: 30, y: 19, width: 42, height: 61 },
      maxPrintWidth: 12,
      maxPrintHeight: 16,
    },
    back: {
      designArea: { x: 25, y: 19, width: 48, height: 59 },
      maxPrintWidth: 12,
      maxPrintHeight: 16,
    },
    neckAliases: {
      neck: { x: 41, y: 13, width: 18, height: 12 },
      neck_tag: { x: 41, y: 13, width: 18, height: 12 },
      neckLabel: { x: 41, y: 13, width: 18, height: 12 },
      neck_label: { x: 41, y: 13, width: 18, height: 12 },
    },
  },
} as const;

export const PROTECTED_PLACEMENT_WARNING =
  "Customizer placement differs from live-customizer-working-v3 backup.";
