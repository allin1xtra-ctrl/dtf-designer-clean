/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const sharp = require('sharp');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '25mb' }));

const cloudinaryEnv = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || process.env.API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET || '',
  folder: process.env.CLOUDINARY_FOLDER || 'dtf-designs',
};

function isCloudinaryReady() {
  return Boolean(cloudinaryEnv.cloudName && cloudinaryEnv.apiKey && cloudinaryEnv.apiSecret);
}

cloudinary.config({
  cloud_name: cloudinaryEnv.cloudName,
  api_key: cloudinaryEnv.apiKey,
  api_secret: cloudinaryEnv.apiSecret,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });
const jobs = [];
const SUPPORT_KNOWLEDGE = [
  'Customers can upload artwork from the Visual tools panel inside the designer.',
  'Low quality images below the minimum DPI can print blurry and should be replaced with higher-resolution artwork.',
  'Gang sheets are built in DTF transfer mode by uploading multiple pieces and using the auto layout controls.',
  'Admins can manage pricing, print areas, integrations, and the jobs queue from the owner dashboard.',
  'Shopify cart handoff includes design preview, production metadata, and queue-ready order details.',
];
const ownerSettings = {
  storeName: 'DTF Designer Pro',
  supportEmail: 'support@example.com',
  themeAccent: '#2563eb',
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
  enableCloudinaryIntegration: true,
  enableZapierIntegration: false,
  enablePrintifyIntegration: false,
  minUploadDpi: 220,
  blockLowDpiOrders: false,
  maxLayersPerView: 12,
  enableGridSnap: true,
  gridStep: 12,
  allowNameNumberPersonalization: true,
  autoUnderbaseForDarks: true,
  productionFileType: 'PNG + PDF',
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

function getDashboardMetrics() {
  return {
    totalJobs: jobs.length,
    queued: jobs.filter((job) => job.status === 'Queued').length,
    ready: jobs.filter((job) => job.status === 'Ready to print').length,
    completed: jobs.filter((job) => job.status === 'Completed').length,
    uploadsEnabled: isCloudinaryReady(),
    lastUpdated: new Date().toISOString(),
  };
}

function getAISuggestions(context = {}) {
  if (context.isAdmin) {
    return [
      'How do I set pricing?',
      'How do I connect Shopify?',
      'Why are orders not showing?',
      'How do I change print areas?',
    ];
  }

  const suggestions = [
    'How do I upload my design?',
    'Why is my image blurry?',
    'How do I make a gang sheet?',
    'What size should I use?',
  ];

  if (context.lastUploadStatus === 'low') {
    suggestions.unshift('How do I fix low DPI artwork?');
  }

  return [...new Set(suggestions)].slice(0, 4);
}

function buildAutomationPlan(context = {}) {
  const mode = context.productMode === 'transfer' ? 'transfer' : 'apparel';
  const quantity = Math.max(1, Number(context.quantity || 1));
  const currentSellPrice = Number(context.sellPrice || 0);
  const estimatedCost = Number(context.estimatedCost || 0);
  const sheetCount = Math.max(1, Number(context.sheetCount || 1));
  const currentSheet = context.sheetSize || '12x8';
  const recommendedSheet = context.recommendedSheet || currentSheet;
  const currentMargin = currentSellPrice > 0 ? (currentSellPrice - estimatedCost) / currentSellPrice : 0;
  const targetMargin = mode === 'transfer' ? 0.58 : 0.62;
  const notes = [];
  const actions = [];

  if (context.lastUploadStatus === 'low') {
    notes.push(`Artwork is below the ${ownerSettings.minUploadDpi} DPI target and should be replaced or resized down before production.`);
  }

  if (mode === 'transfer' && Number(context.currentLayerCount || 0) > 1) {
    if (sheetCount > 1 || recommendedSheet !== currentSheet) {
      actions.push({
        type: 'layout',
        label: 'Auto-fix layout',
        message: `Apply ${recommendedSheet} and run the gang-sheet optimizer to reduce waste and overflow.`,
        recommendedSheet,
      });
      notes.push(`The current transfer build can be packed more efficiently on ${recommendedSheet}.`);
    } else {
      actions.push({
        type: 'layout',
        label: 'Auto-polish layout',
        message: 'Re-run auto layout to tighten spacing and preserve pinned priorities.',
        recommendedSheet,
      });
    }
  } else {
    actions.push({
      type: 'layout',
      label: 'Auto-center artwork',
      message: 'Center the active design inside the current print zone for a cleaner presentation.',
      recommendedSheet,
    });
  }

  const suggestedSellPrice = currentSellPrice > 0
    ? Number(Math.max(currentSellPrice, estimatedCost > 0 ? estimatedCost / Math.max(0.1, 1 - targetMargin) : currentSellPrice).toFixed(2))
    : 0;

  const suggestedBasePrice = mode === 'transfer'
    ? Number(Math.max(ownerSettings.baseTransferPrice, suggestedSellPrice > 0 ? suggestedSellPrice / quantity : ownerSettings.baseTransferPrice).toFixed(2))
    : Number(Math.max(ownerSettings.baseApparelPrice, suggestedSellPrice > 0 ? suggestedSellPrice / quantity : ownerSettings.baseApparelPrice).toFixed(2));

  if (currentSellPrice > 0) {
    if (currentMargin < targetMargin) {
      notes.push(`Current margin is about ${Math.round(currentMargin * 100)}%. A healthier target is ${Math.round(targetMargin * 100)}% or better.`);
    } else {
      notes.push(`Current margin is healthy at about ${Math.round(currentMargin * 100)}%.`);
    }
  }

  actions.push({
    type: 'pricing',
    label: 'Suggest exact pricing',
    message: `Recommended sell price is $${suggestedSellPrice || currentSellPrice || suggestedBasePrice} with a base ${mode} price around $${suggestedBasePrice}.`,
  });

  return {
    mode,
    quantity,
    suggestedSellPrice,
    suggestedBasePrice,
    currentMargin: Number((currentMargin * 100).toFixed(1)),
    recommendedSheet,
    notes,
    actions,
  };
}

function buildHeuristicReply(message, context = {}) {
  const question = String(message || '').toLowerCase();
  const isAdmin = Boolean(context.isAdmin);
  const currentMode = context.productMode === 'transfer' ? 'transfer' : 'apparel';
  const dpiFloor = ownerSettings.minUploadDpi;
  const metrics = getDashboardMetrics();

  if (question.includes('upload') || question.includes('design')) {
    return 'Use the upload field in the Visual tools panel, choose your artwork, then drag and scale it on the canvas. When you are happy, save the design or send it to Shopify.';
  }

  if (question.includes('blurry') || question.includes('dpi') || question.includes('quality')) {
    return `Blurry prints usually mean the file is below ${dpiFloor} DPI. Upload a larger PNG, keep transparent backgrounds when possible, and scale the design less aggressively on the canvas.`;
  }

  if (question.includes('gang') || question.includes('sheet')) {
    return 'Switch to DTF transfer mode, upload multiple pieces, pin any priority artwork if needed, and use Auto layout gang sheet. The optimizer will recommend the best sheet size and show live utilization.';
  }

  if (question.includes('size')) {
    return currentMode === 'transfer'
      ? 'For DTF transfers, 11x11 is a strong default for standard chest prints, 12x16 works for larger graphics, and A3 is best when you want full gang-sheet capacity.'
      : 'For apparel, the front and back zones are already sized for standard decoration. Start with the default print area and adjust only if the mockup looks too small or crowded.';
  }

  if (question.includes('pricing') || question.includes('price')) {
    return isAdmin
      ? `Open the Pricing tab in the owner dashboard. Your current base prices are $${ownerSettings.baseApparelPrice} for apparel and $${ownerSettings.baseTransferPrice} for transfers, with DTF billed at $${ownerSettings.dtfPricePerSquareInch} per square inch.`
      : 'Pricing updates live as you change size, quantity, views, and gang-sheet usage. Increase quantity for automatic volume discounts.';
  }

  if (question.includes('shopify') || question.includes('connect')) {
    return 'Shopify support is built into the app flow. Make sure the backend API is reachable, product and variant data are passed into the designer, and Shopify integration stays enabled in the Settings tab.';
  }

  if (question.includes('order') || question.includes('jobs') || question.includes('queue')) {
    return `The jobs queue uses the backend jobs endpoints. Right now there are ${metrics.totalJobs} tracked job(s). If orders are not showing, confirm Queue Board is enabled and the design reached the cart/production flow successfully.`;
  }

  if (question.includes('print area') || question.includes('print zone')) {
    return 'Open the Print Areas tab in the admin dashboard to edit front, back, sleeve, and neck zones. You can change width, height, offsets, safe margins, bleed, and rotation rules there.';
  }

  return isAdmin
    ? 'I can help with pricing, Shopify setup, print areas, queue troubleshooting, and production settings. Ask a specific admin question and I will guide you step by step.'
    : 'I can help with uploads, blurry images, gang sheets, sizing, and checkout. Ask what you are trying to do and I will walk you through it.';
}

async function getAIResponse(message, context = {}, history = []) {
  const fallbackReply = buildHeuristicReply(message, context);

  if (!process.env.OPENAI_API_KEY || typeof fetch !== 'function') {
    return fallbackReply;
  }

  try {
    const recentHistory = Array.isArray(history)
      ? history.slice(-6).map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${String(item.content || '')}`).join('\n')
      : '';

    const systemPrompt = [
      `You are the embedded AI copilot for ${ownerSettings.storeName}, a premium DTF and apparel customization platform.`,
      'Be concise, accurate, and action-oriented.',
      'Help customers with uploads, sizing, image quality, gang sheets, checkout, and production readiness.',
      'Help admins with pricing, Shopify, print areas, queue troubleshooting, and settings.',
      `Live settings: ${JSON.stringify({
        minUploadDpi: ownerSettings.minUploadDpi,
        baseApparelPrice: ownerSettings.baseApparelPrice,
        baseTransferPrice: ownerSettings.baseTransferPrice,
        dtfPricePerSquareInch: ownerSettings.dtfPricePerSquareInch,
        gangSheetBasePrice: ownerSettings.gangSheetBasePrice,
        enableShopifyIntegration: ownerSettings.enableShopifyIntegration,
        enableApparel: ownerSettings.enableApparel,
        enableTransfer: ownerSettings.enableTransfer,
      })}`,
      `Knowledge base: ${SUPPORT_KNOWLEDGE.join(' ')}`,
      `Current context: ${JSON.stringify(context)}`,
      recentHistory ? `Recent history:\n${recentHistory}` : '',
      `User question: ${message}`,
    ].filter(Boolean).join('\n\n');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: systemPrompt,
        temperature: 0.4,
        max_output_tokens: 280,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed with status ${response.status}`);
    }

    const data = await response.json();
    const reply = typeof data.output_text === 'string'
      ? data.output_text
      : Array.isArray(data.output)
        ? data.output
            .flatMap((item) => Array.isArray(item.content)
              ? item.content.map((part) => part.text || '').filter(Boolean)
              : [])
            .join('\n')
        : '';

    return reply || fallbackReply;
  } catch (error) {
    console.error('AI fallback triggered:', error.message || error);
    return fallbackReply;
  }
}

async function processImageBuffer(inputBuffer, removeBackground, enhanceImage) {
  let image = sharp(inputBuffer).ensureAlpha();

  if (removeBackground) {
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const samplePixel = (x, y) => {
      const index = (y * info.width + x) * channels;
      return [data[index], data[index + 1], data[index + 2]];
    };

    const corners = [
      samplePixel(0, 0),
      samplePixel(info.width - 1, 0),
      samplePixel(0, info.height - 1),
      samplePixel(info.width - 1, info.height - 1),
    ];

    const average = corners.reduce(
      (acc, corner) => [acc[0] + corner[0], acc[1] + corner[1], acc[2] + corner[2]],
      [0, 0, 0]
    ).map((value) => value / corners.length);

    for (let index = 0; index < data.length; index += channels) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const distance = Math.sqrt(
        (red - average[0]) ** 2 +
        (green - average[1]) ** 2 +
        (blue - average[2]) ** 2
      );

      if (distance < 38 || (red > 240 && green > 240 && blue > 240)) {
        data[index + 3] = 0;
      }
    }

    image = sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels,
      },
    });
  }

  if (enhanceImage) {
    image = image.normalize().sharpen().modulate({ saturation: 1.08, brightness: 1.02 });
  }

  return await image.png().toBuffer();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/dashboard', (_req, res) => {
  res.json({ ok: true, settings: ownerSettings, metrics: getDashboardMetrics(), jobs });
});

app.get('/settings', (_req, res) => {
  res.json({ ok: true, settings: ownerSettings });
});

app.post('/settings', (req, res) => {
  const updates = req.body || {};

  Object.assign(ownerSettings, {
    storeName: typeof updates.storeName === 'string' ? updates.storeName : ownerSettings.storeName,
    supportEmail: typeof updates.supportEmail === 'string' ? updates.supportEmail : ownerSettings.supportEmail,
    themeAccent: typeof updates.themeAccent === 'string' ? updates.themeAccent : ownerSettings.themeAccent,
    enableApparel: typeof updates.enableApparel === 'boolean' ? updates.enableApparel : ownerSettings.enableApparel,
    enableTransfer: typeof updates.enableTransfer === 'boolean' ? updates.enableTransfer : ownerSettings.enableTransfer,
    allowReorders: typeof updates.allowReorders === 'boolean' ? updates.allowReorders : ownerSettings.allowReorders,
    allowQueueBoard: typeof updates.allowQueueBoard === 'boolean' ? updates.allowQueueBoard : ownerSettings.allowQueueBoard,
    autoCleanDefault: typeof updates.autoCleanDefault === 'boolean' ? updates.autoCleanDefault : ownerSettings.autoCleanDefault,
    smartEnhanceDefault: typeof updates.smartEnhanceDefault === 'boolean' ? updates.smartEnhanceDefault : ownerSettings.smartEnhanceDefault,
    enableVariantSync: typeof updates.enableVariantSync === 'boolean' ? updates.enableVariantSync : ownerSettings.enableVariantSync,
    enableMockupUploads: typeof updates.enableMockupUploads === 'boolean' ? updates.enableMockupUploads : ownerSettings.enableMockupUploads,
    enableTemplateLibrary: typeof updates.enableTemplateLibrary === 'boolean' ? updates.enableTemplateLibrary : ownerSettings.enableTemplateLibrary,
    enableShopifyIntegration: typeof updates.enableShopifyIntegration === 'boolean' ? updates.enableShopifyIntegration : ownerSettings.enableShopifyIntegration,
    enableCloudinaryIntegration: typeof updates.enableCloudinaryIntegration === 'boolean' ? updates.enableCloudinaryIntegration : ownerSettings.enableCloudinaryIntegration,
    enableZapierIntegration: typeof updates.enableZapierIntegration === 'boolean' ? updates.enableZapierIntegration : ownerSettings.enableZapierIntegration,
    enablePrintifyIntegration: typeof updates.enablePrintifyIntegration === 'boolean' ? updates.enablePrintifyIntegration : ownerSettings.enablePrintifyIntegration,
    minUploadDpi: typeof updates.minUploadDpi === 'number' ? updates.minUploadDpi : ownerSettings.minUploadDpi,
    blockLowDpiOrders: typeof updates.blockLowDpiOrders === 'boolean' ? updates.blockLowDpiOrders : ownerSettings.blockLowDpiOrders,
    maxLayersPerView: typeof updates.maxLayersPerView === 'number' ? updates.maxLayersPerView : ownerSettings.maxLayersPerView,
    enableGridSnap: typeof updates.enableGridSnap === 'boolean' ? updates.enableGridSnap : ownerSettings.enableGridSnap,
    gridStep: typeof updates.gridStep === 'number' ? updates.gridStep : ownerSettings.gridStep,
    allowNameNumberPersonalization: typeof updates.allowNameNumberPersonalization === 'boolean' ? updates.allowNameNumberPersonalization : ownerSettings.allowNameNumberPersonalization,
    autoUnderbaseForDarks: typeof updates.autoUnderbaseForDarks === 'boolean' ? updates.autoUnderbaseForDarks : ownerSettings.autoUnderbaseForDarks,
    productionFileType: typeof updates.productionFileType === 'string' ? updates.productionFileType : ownerSettings.productionFileType,
    requireOrderApproval: typeof updates.requireOrderApproval === 'boolean' ? updates.requireOrderApproval : ownerSettings.requireOrderApproval,
    approvalThresholdQty: typeof updates.approvalThresholdQty === 'number' ? updates.approvalThresholdQty : ownerSettings.approvalThresholdQty,
    baseApparelPrice: typeof updates.baseApparelPrice === 'number' ? updates.baseApparelPrice : ownerSettings.baseApparelPrice,
    baseTransferPrice: typeof updates.baseTransferPrice === 'number' ? updates.baseTransferPrice : ownerSettings.baseTransferPrice,
    dtfPricePerSquareInch: typeof updates.dtfPricePerSquareInch === 'number' ? updates.dtfPricePerSquareInch : ownerSettings.dtfPricePerSquareInch,
    gangSheetBasePrice: typeof updates.gangSheetBasePrice === 'number' ? updates.gangSheetBasePrice : ownerSettings.gangSheetBasePrice,
    gangSheetExtraItemFee: typeof updates.gangSheetExtraItemFee === 'number' ? updates.gangSheetExtraItemFee : ownerSettings.gangSheetExtraItemFee,
    gangSheetDiscount: typeof updates.gangSheetDiscount === 'number' ? updates.gangSheetDiscount : ownerSettings.gangSheetDiscount,
    extraViewFee: typeof updates.extraViewFee === 'number' ? updates.extraViewFee : ownerSettings.extraViewFee,
    backPrintFee: typeof updates.backPrintFee === 'number' ? updates.backPrintFee : ownerSettings.backPrintFee,
    sleevePrintFee: typeof updates.sleevePrintFee === 'number' ? updates.sleevePrintFee : ownerSettings.sleevePrintFee,
    size2XLFee: typeof updates.size2XLFee === 'number' ? updates.size2XLFee : ownerSettings.size2XLFee,
    size3XLFee: typeof updates.size3XLFee === 'number' ? updates.size3XLFee : ownerSettings.size3XLFee,
    discount10: typeof updates.discount10 === 'number' ? updates.discount10 : ownerSettings.discount10,
    discount25: typeof updates.discount25 === 'number' ? updates.discount25 : ownerSettings.discount25,
    productTemplatePriceAdjustments: updates.productTemplatePriceAdjustments && typeof updates.productTemplatePriceAdjustments === 'object'
      ? {
          ...ownerSettings.productTemplatePriceAdjustments,
          ...updates.productTemplatePriceAdjustments,
        }
      : ownerSettings.productTemplatePriceAdjustments,
    productTemplatePrintAreas: updates.productTemplatePrintAreas && typeof updates.productTemplatePrintAreas === 'object'
      ? {
          ...ownerSettings.productTemplatePrintAreas,
          ...updates.productTemplatePrintAreas,
        }
      : ownerSettings.productTemplatePrintAreas,
    printAreas: updates.printAreas && typeof updates.printAreas === 'object'
      ? {
          ...ownerSettings.printAreas,
          ...updates.printAreas,
        }
      : ownerSettings.printAreas,
    printAreaPresets: Array.isArray(updates.printAreaPresets)
      ? updates.printAreaPresets
      : ownerSettings.printAreaPresets,
  });

  res.json({ ok: true, settings: ownerSettings, metrics: getDashboardMetrics() });
});

app.get('/jobs', (_req, res) => {
  res.json({ jobs });
});

app.post('/jobs', (req, res) => {
  const job = req.body;

  if (!job?.id) {
    return res.status(400).json({ error: 'Job id is required.' });
  }

  const index = jobs.findIndex((item) => item.id === job.id);
  if (index >= 0) {
    jobs[index] = { ...jobs[index], ...job };
  } else {
    jobs.unshift(job);
  }

  res.json({ ok: true, job });
});

app.patch('/jobs/:id', (req, res) => {
  const index = jobs.findIndex((item) => item.id === req.params.id);

  if (index < 0) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  jobs[index] = { ...jobs[index], ...req.body };
  res.json({ ok: true, job: jobs[index] });
});

app.post('/ai-chat', async (req, res) => {
  const { message, history, context } = req.body || {};

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const reply = await getAIResponse(message.trim(), context || {}, Array.isArray(history) ? history : []);
    res.json({ ok: true, reply, suggestions: getAISuggestions(context || {}) });
  } catch (err) {
    console.error('AI chat failed:', err);
    res.status(500).json({ error: 'AI chat failed.' });
  }
});

app.post('/ai-automation', (req, res) => {
  try {
    const context = req.body?.context || {};
    const plan = buildAutomationPlan(context);
    res.json({ ok: true, plan });
  } catch (err) {
    console.error('AI automation failed:', err);
    res.status(500).json({ error: 'AI automation failed.' });
  }
});

app.post('/process-image', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const removeBackground = req.body.removeBackground === 'true';
    const enhanceImage = req.body.enhanceImage === 'true';
    const processedBuffer = await processImageBuffer(req.file.buffer, removeBackground, enhanceImage);

    res.json({
      processed: true,
      dataUrl: `data:image/png;base64,${processedBuffer.toString('base64')}`,
    });
  } catch (err) {
    console.error('Processing failed:', err);
    res.status(500).json({ error: 'Image processing failed.' });
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const mimeType = req.file.mimetype || 'image/png';
  const inlineFallbackUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
  const cloudinaryReady = isCloudinaryReady();

  try {
    if (!cloudinaryReady) {
      return res.json({
        url: inlineFallbackUrl,
        publicId: `inline-${Date.now()}`,
        storage: 'inline-fallback',
        warning: 'Cloudinary is not configured. Using inline storage fallback.',
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: cloudinaryEnv.folder,
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );

      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url, publicId: result.public_id, storage: 'cloudinary' });
  } catch (err) {
    console.error('Upload failed, using inline fallback:', err);
    res.json({
      url: inlineFallbackUrl,
      publicId: `inline-${Date.now()}`,
      storage: 'inline-fallback',
      warning: 'Cloud upload failed. Using inline storage fallback.',
    });
  }
});

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
  console.log(`Cloudinary uploads: ${isCloudinaryReady() ? 'enabled' : 'fallback mode'}`);
});