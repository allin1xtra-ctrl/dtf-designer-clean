type QueueStatus = "Queued" | "Ready to print" | "Completed";

type QueueJob = {
  id: string;
  status?: QueueStatus;
  [key: string]: unknown;
};

const jobs: QueueJob[] = [];

const settings = {
  storeName: "DTF Designer Pro",
  supportEmail: "support@example.com",
  themeAccent: "#2563eb",
  enableApparel: true,
  enableTransfer: true,
  allowReorders: true,
  allowQueueBoard: true,
  autoCleanDefault: true,
  smartEnhanceDefault: true,
  enableVariantSync: true,
  enableMockupUploads: true,
  enableTemplateLibrary: true,
  enableShopifyIntegration: true,
  enableCloudinaryIntegration: false,
  enableZapierIntegration: false,
  enablePrintifyIntegration: false,
  minUploadDpi: 220,
  blockLowDpiOrders: false,
  maxLayersPerView: 12,
  enableGridSnap: false,
  gridStep: 12,
  allowNameNumberPersonalization: true,
  autoUnderbaseForDarks: true,
  productionFileType: "PNG + PDF",
  requireOrderApproval: false,
  approvalThresholdQty: 48,
  baseApparelPrice: 24.99,
  baseTransferPrice: 10.5,
  dtfPricePerSquareInch: 0.08,
  gangSheetBasePrice: 24,
  gangSheetExtraItemFee: 1.5,
  gangSheetDiscount: 10,
  extraViewFee: 6,
  backPrintFee: 2,
  sleevePrintFee: 1.5,
  size2XLFee: 2,
  size3XLFee: 3.5,
  discount10: 8,
  discount25: 15,
  productTemplatePriceAdjustments: {},
  productTemplatePrintAreas: {},
  printAreas: {
    front: { widthInches: 11, heightInches: 13, offsetX: 0, offsetY: 0, safeMargin: 0.25, bleedMargin: 0.125, allowRotation: true, rotationAngle: 0 },
    back: { widthInches: 11, heightInches: 13, offsetX: 0, offsetY: 0, safeMargin: 0.25, bleedMargin: 0.125, allowRotation: true, rotationAngle: 0 },
    leftSleeve: { widthInches: 3.5, heightInches: 10, offsetX: 0, offsetY: 0, safeMargin: 0.2, bleedMargin: 0.1, allowRotation: false, rotationAngle: 0 },
    rightSleeve: { widthInches: 3.5, heightInches: 10, offsetX: 0, offsetY: 0, safeMargin: 0.2, bleedMargin: 0.1, allowRotation: false, rotationAngle: 0 },
    neck: { widthInches: 3, heightInches: 3, offsetX: 0, offsetY: 0, safeMargin: 0.15, bleedMargin: 0.08, allowRotation: false, rotationAngle: 0 },
  },
  printAreaPresets: [],
};

export function getSettings() {
  return settings;
}

export function updateSettings(next: Record<string, unknown>) {
  Object.assign(settings, next || {});
  return settings;
}

export function getJobs() {
  return jobs;
}

export function saveJob(job: QueueJob) {
  const index = jobs.findIndex((item) => item.id === job.id);
  if (index >= 0) {
    jobs[index] = { ...jobs[index], ...job };
  } else {
    jobs.unshift(job);
  }
  return job;
}

export function patchJob(id: string, patch: Partial<QueueJob>) {
  const index = jobs.findIndex((item) => item.id === id);
  if (index < 0) return null;
  jobs[index] = { ...jobs[index], ...patch };
  return jobs[index];
}

export function getMetrics() {
  return {
    totalJobs: jobs.length,
    queued: jobs.filter((job) => job.status === "Queued").length,
    ready: jobs.filter((job) => job.status === "Ready to print").length,
    completed: jobs.filter((job) => job.status === "Completed").length,
    uploadsEnabled: true,
    lastUpdated: new Date().toISOString(),
  };
}
