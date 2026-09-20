
  "Poppins",
  "League Spartan",
  "Playfair Display",
  "Pacifico",
  "Lobster",
  "Great Vibes",
  "Dancing Script",
  "Bangers",
  "Permanent Marker",
  "Black Ops One",
  "Racing Sans One",
  "Graduate",
  "Cinzel",
  "Russo One",
  "Archivo Black",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Raleway",
  "Nunito",
  "Work Sans",
]);

const fontLoadCache = new Map<string, Promise<void>>();
const SNAP_TO_CENTER_THRESHOLD = 8;
const SNAP_TO_CENTER_THRESHOLD = 4;
const LOW_RESOLUTION_UPLOAD_EDGE = 900;
const MAX_HISTORY_STATES = 60;

const VIEW_LABELS: Record<ViewName, string> = {
  front: "Front",
  back: "Back",
  leftSleeve: "Left Sleeve",
  rightSleeve: "Right Sleeve",
  neck: "Neck Label",
};

function isViewName(value: unknown): value is ViewName {
  return typeof value === "string" && VIEW_NAMES.includes(value as ViewName);
}

type CanvasSnapshot = ReturnType<Canvas["toJSON"]>;
type DraftPayload = {
  version: number;
  productHandle: string;
  variantId: string;
  selectedColor: string;
  selectedSize: string;
  transferSize: string;
  quantity: number;
  currentView: ViewName;
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [activeAiAction, setActiveAiAction] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [designIdeaPrompt, setDesignIdeaPrompt] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [previewScale, setPreviewScale] = useState(1);
  const [mockupNaturalSize, setMockupNaturalSize] = useState({ width: 0, height: 0 });
  const [mockupLoadFailed, setMockupLoadFailed] = useState(false);
  const [textControls, setTextControls] = useState<TextControlsState>(DEFAULT_TEXT_CONTROLS);
  const printableAreaRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const shouldDebugAiLogRef = useRef(false);
  const lastSentIframeHeightRef = useRef(0);
  const draftAutosaveTimerRef = useRef<number | null>(null);
  const lastSavedDraftRef = useRef("");
  const restoredDraftKeyRef = useRef("");
  const isRestoringDraftRef = useRef(false);
  const isClearingDraftRef = useRef(false);
  const suspendAutosaveRef = useRef(true);
  const historyPastRef = useRef<CanvasSnapshot[]>([]);
  const historyFutureRef = useRef<CanvasSnapshot[]>([]);
  const isApplyingHistoryRef = useRef(false);
  const historyTimerRef = useRef<number | null>(null);
  const isCanvasObjectInteractingRef = useRef(false);
  const pendingPreviewScaleUpdateRef = useRef(false);
  const updatePreviewScaleRef = useRef<(() => void) | null>(null);

  const viewsRef = useRef<Record<ViewName, CanvasSnapshot | null>>(createEmptyViews());
  const uploadedArtworkByViewRef = useRef<Record<ViewName, string>>(createEmptyUploadedArtworkByView());

  const getCanvas = () => fabricCanvasRef.current;
  const normalizedProductHandle = productHandle.trim();
  const normalizedVariantId = normalizeVariantId(variantId) || variantId;
  const draftStorageKey = `${DRAFT_STORAGE_KEY_PREFIX}:${normalizedProductHandle || "standalone"}:${
    normalizedVariantId || "default"
  }`;

  const cancelDraftAutosave = () => {
    if (draftAutosaveTimerRef.current === null) return;
    window.clearTimeout(draftAutosaveTimerRef.current);
    draftAutosaveTimerRef.current = null;
  };

  const captureViewSnapshot = (
    canvasOverride?: Canvas | null,
    viewOverride?: ViewName