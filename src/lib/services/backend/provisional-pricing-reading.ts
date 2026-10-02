/**
 * Provisional lead-price matrix, OpenAPI 1.0.0-phase3.r.
 *
 * Money stays a decimal rupee string. A multiplier stays a decimal string or
 * a numerator and denominator. A question carries a prompt, not a level.
 * A preview level is supplied by the person using the screen. Nothing here
 * activates a price, writes a marketplace price, or maps a question to a level.
 */

export const PROVISIONAL_BANNER = "Provisional — not used for purchases";

const MONEY = /^\d{1,12}(\.\d{1,2})?$/;
const DECIMAL_MULTIPLIER = /^\d{1,6}(?:\.\d{1,4})?$/;
const RATIO = /^(\d+)\/(\d+)$/;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

export type BandDraft = {
  label: string;
  minInr: string;
  maxInr: string;
  basePriceInr: string;
};

export type LevelDraft = {
  level: string;
  multiplier: string;
};

export type QuestionDraft = {
  prompt: string;
};

export type PricingDraft = {
  note: string;
  bands: BandDraft[];
  levels: LevelDraft[];
  questions: QuestionDraft[];
};

export type PricingSaveBody = {
  note?: string;
  bands: {
    label: string;
    minInr: string;
    maxInr: string | null;
    basePriceInr: string;
  }[];
  levels: {
    level: number;
    multiplier: string | { numerator: number; denominator: number };
  }[];
  questions?: { position: number; prompt: string }[];
};

export type PricingPreviewBody = {
  configurationId?: string;
  budgetInr: string;
  budgetSource: "prospect_stated";
  qualificationLevel: number;
  rounding?: "nearest_100_inr";
};

export type PricingBandView = {
  id: string;
  position: number;
  label: string;
  minInr: string;
  maxInr: string | null;
  basePriceInr: string;
};

export type PricingLevelView = {
  level: number;
  multiplierText: string;
};

export type PricingQuestionView = {
  id: string;
  position: number;
  prompt: string;
};

export type PricingAssumption = {
  id: string;
  summary: string;
};

export type PricingGap = {
  afterInr: string;
  beforeInr: string;
};

export type PricingConfigurationView = {
  id: string;
  version: number;
  status: "provisional";
  note: string | null;
  createdAt: string;
  bands: PricingBandView[];
  levels: PricingLevelView[];
  questions: PricingQuestionView[];
  questionMapping: "not_configured";
  gaps: PricingGap[];
  purchasable: false;
  boundaryConventionConfirmed: false;
  unconfirmed: PricingAssumption[];
};

export type PricingVersionSummary = {
  id: string;
  version: number;
  bands: number;
  levels: number;
  questions: number;
  createdAt: string;
  purchasable: false;
};

export type PricingOverviewView = {
  configuration: PricingConfigurationView | null;
  versions: number;
  purchaseMessage: string;
  purchaseUsesFramework: false;
};

export type PricingPreviewView = {
  calculationId: string;
  configurationVersion: number;
  budgetInr: string;
  basePriceInr: string;
  bandLabel: string | null;
  qualificationLevel: number;
  levelStatement: string;
  questionStatement: string;
  multiplierText: string;
  exactText: string;
  roundingText: string;
  roundingRequested: string | null;
  message: string;
  purchaseMessage: string;
  creditsText: string;
  purchasable: false;
};

export type PricingFailure = {
  ok: false;
  configuration: null;
  preview: null;
  error: string;
  code: string | null;
  field: string | null;
};

export function blankPricingDraft(): PricingDraft {
  return {
    note: "",
    bands: [{ label: "", minInr: "", maxInr: "", basePriceInr: "" }],
    levels: [{ level: "", multiplier: "" }],
    questions: [],
  };
}

export function draftFromConfiguration(configuration: PricingConfigurationView): PricingDraft {
  return {
    note: configuration.note ?? "",
    bands: configuration.bands.map((band) => ({
      label: band.label,
      minInr: band.minInr,
      maxInr: band.maxInr ?? "",
      basePriceInr: band.basePriceInr,
    })),
    levels: configuration.levels.map((level) => ({
      level: String(level.level),
      multiplier: level.multiplierText,
    })),
    questions: configuration.questions.map((question) => ({ prompt: question.prompt })),
  };
}

function entry(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function column(formData: FormData, name: string): string[] {
  return formData.getAll(name).map((value) => (typeof value === "string" ? value.trim() : ""));
}

export function draftFromForm(formData: FormData): PricingDraft {
  const labels = column(formData, "bandLabel");
  const mins = column(formData, "bandMin");
  const maxes = column(formData, "bandMax");
  const bases = column(formData, "bandBase");
  const bandCount = Math.max(labels.length, mins.length, maxes.length, bases.length);
  const bands: BandDraft[] = [];
  for (let index = 0; index < bandCount; index += 1) {
    const band = {
      label: labels[index] ?? "",
      minInr: mins[index] ?? "",
      maxInr: maxes[index] ?? "",
      basePriceInr: bases[index] ?? "",
    };
    if (band.label || band.minInr || band.maxInr || band.basePriceInr) bands.push(band);
  }

  const levelNumbers = column(formData, "levelNumber");
  const multipliers = column(formData, "levelMultiplier");
  const levelCount = Math.max(levelNumbers.length, multipliers.length);
  const levels: LevelDraft[] = [];
  for (let index = 0; index < levelCount; index += 1) {
    const level = { level: levelNumbers[index] ?? "", multiplier: multipliers[index] ?? "" };
    if (level.level || level.multiplier) levels.push(level);
  }

  return {
    note: entry(formData.get("note")),
    bands,
    levels,
    questions: column(formData, "questionPrompt")
      .filter((prompt) => prompt.length > 0)
      .map((prompt) => ({ prompt })),
  };
}

export function localSaveError(draft: PricingDraft): { field: string; error: string } | null {
  if (draft.bands.length < 1 || draft.bands.length > 30) {
    return { field: "bands", error: "Provide between 1 and 30 budget bands." };
  }
  if (draft.levels.length < 1 || draft.levels.length > 50) {
    return { field: "levels", error: "Provide between 1 and 50 qualification levels." };
  }
  for (const band of draft.bands) {
    if (!band.label || band.label.length > 80) {
      return { field: "bands", error: "Each band needs a label of at most 80 characters." };
    }
    if (!MONEY.test(band.minInr) || !MONEY.test(band.basePriceInr) || (band.maxInr !== "" && !MONEY.test(band.maxInr))) {
      return {
        field: "bands",
        error: "Enter each amount as rupees with at most two decimal places, such as 1500.00.",
      };
    }
  }
  const seen = new Set<string>();
  for (const level of draft.levels) {
    if (!POSITIVE_INTEGER.test(level.level)) {
      return { field: "levels", error: "Each qualification level must be a positive integer." };
    }
    if (seen.has(level.level)) return { field: "levels", error: `Level ${level.level} is repeated.` };
    seen.add(level.level);
    if (!DECIMAL_MULTIPLIER.test(level.multiplier) && !RATIO.test(level.multiplier)) {
      return {
        field: "levels",
        error: "Enter each multiplier as a decimal such as 1.35, or as a ratio such as 27/20.",
      };
    }
  }
  if (draft.note.length > 500) {
    return { field: "note", error: "The note must be at most 500 characters." };
  }
  if (draft.questions.length > 100) {
    return { field: "questions", error: "Provide at most 100 qualification questions." };
  }
  for (const question of draft.questions) {
    if (question.prompt.length > 500) {
      return { field: "questions", error: "Each question needs a prompt of at most 500 characters." };
    }
  }
  return null;
}

function multiplierValue(value: string): string | { numerator: number; denominator: number } {
  const ratio = RATIO.exec(value);
  if (ratio) return { numerator: Number(ratio[1]), denominator: Number(ratio[2]) };
  return value;
}

export function pricingConfigurationBody(draft: PricingDraft): PricingSaveBody {
  const body: PricingSaveBody = {
    bands: draft.bands.map((band) => ({
      label: band.label,
      minInr: band.minInr,
      maxInr: band.maxInr === "" ? null : band.maxInr,
      basePriceInr: band.basePriceInr,
    })),
    levels: draft.levels.map((level) => ({
      level: Number(level.level),
      multiplier: multiplierValue(level.multiplier),
    })),
  };
  if (draft.note) body.note = draft.note;
  if (draft.questions.length > 0) {
    body.questions = draft.questions.map((question, index) => ({
      position: index + 1,
      prompt: question.prompt,
    }));
  }
  return body;
}

const SAVE_KEYS = new Set(["note", "bands", "levels", "questions"]);
const BAND_KEYS = new Set(["label", "minInr", "maxInr", "basePriceInr"]);
const LEVEL_KEYS = new Set(["level", "multiplier"]);
const QUESTION_KEYS = new Set(["position", "prompt"]);

export function saveBodyStaysInsideContract(body: PricingSaveBody): boolean {
  const top = Object.keys(body);
  if (top.some((key) => !SAVE_KEYS.has(key))) return false;
  for (const band of body.bands) {
    if (Object.keys(band).some((key) => !BAND_KEYS.has(key))) return false;
    if (typeof band.minInr !== "string" || typeof band.basePriceInr !== "string") return false;
    if (band.maxInr !== null && typeof band.maxInr !== "string") return false;
  }
  for (const level of body.levels) {
    if (Object.keys(level).some((key) => !LEVEL_KEYS.has(key))) return false;
    if (!Number.isSafeInteger(level.level)) return false;
    if (typeof level.multiplier === "string") continue;
    if (!Number.isSafeInteger(level.multiplier.numerator) || !Number.isSafeInteger(level.multiplier.denominator)) {
      return false;
    }
  }
  for (const question of body.questions ?? []) {
    if (Object.keys(question).some((key) => !QUESTION_KEYS.has(key))) return false;
  }
  return true;
}

export function explicitTrue(formData: FormData, name: string): boolean {
  return formData.getAll(name).some((value) => value === "true");
}

export function previewFromForm(formData: FormData): { body: PricingPreviewBody } | { error: string; field: string } {
  const budgetInr = entry(formData.get("budgetInr"));
  const levelText = entry(formData.get("qualificationLevel"));
  const configurationId = entry(formData.get("configurationId"));
  if (!MONEY.test(budgetInr)) {
    return { field: "budgetInr", error: "Enter the budget as rupees with at most two decimal places." };
  }
  if (!POSITIVE_INTEGER.test(levelText)) {
    return {
      field: "qualificationLevel",
      error: "Supply the qualification level as a positive integer. It is not inferred from the questions.",
    };
  }
  if (configurationId && !/^[0-9a-f-]{36}$/i.test(configurationId)) {
    return { field: "configurationId", error: "That configuration was not recognised." };
  }
  const body: PricingPreviewBody = {
    budgetInr,
    budgetSource: "prospect_stated",
    qualificationLevel: Number(levelText),
  };
  if (configurationId) body.configurationId = configurationId;
  if (explicitTrue(formData, "demonstrateRounding")) body.rounding = "nearest_100_inr";
  return { body };
}

const PREVIEW_KEYS = new Set([
  "configurationId",
  "budgetInr",
  "budgetSource",
  "qualificationLevel",
  "rounding",
]);

export function previewBodyStaysInsideContract(body: PricingPreviewBody): boolean {
  if (Object.keys(body).some((key) => !PREVIEW_KEYS.has(key))) return false;
  if (typeof body.budgetInr !== "string") return false;
  if (body.budgetSource !== "prospect_stated") return false;
  if (!Number.isSafeInteger(body.qualificationLevel)) return false;
  if (body.rounding !== undefined && body.rounding !== "nearest_100_inr") return false;
  return true;
}

export function formatProvisionalInr(value: string | null): string {
  if (!value) return "not a whole number of paise";
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return value;
  const whole = match[1] ?? "";
  const fraction = (match[2] ?? "00").padEnd(2, "0");
  if (whole.length > 15) return `₹${whole}.${fraction}`;
  return `₹${Number(whole).toLocaleString("en-IN")}.${fraction}`;
}

export function exactCalculationText(exact: {
  inr: string | null;
  paiseNumerator: string;
  paiseDenominator: string;
  paiseRemainder: string;
}): string {
  if (exact.inr) return `Exact calculation ${formatProvisionalInr(exact.inr)}.`;
  return (
    `Exact calculation ${exact.paiseNumerator}/${exact.paiseDenominator} paise, remainder ${exact.paiseRemainder}. ` +
    "This is not a whole number of paise, so it is not shown as a rounded rupee amount."
  );
}

export function roundingDemonstrationText(rounding: {
  requested: string | null;
  demonstratedInr: string | null;
  rule: string | null;
}): string {
  if (rounding.requested !== "nearest_100_inr") {
    return "No rounding demonstration was requested. The exact calculation is the amount.";
  }
  if (!rounding.demonstratedInr) {
    return "A nearest-₹100 demonstration was requested, and the service did not return a demonstrated figure. The exact calculation is unchanged.";
  }
  const rule = rounding.rule ? ` ${rounding.rule}` : "";
  return `Demonstrated nearest ₹100: ${formatProvisionalInr(rounding.demonstratedInr)}. This demonstration is not confirmed.${rule}`;
}

export function creditsExplanation(credits: number | null, withheld: string | null): string {
  if (typeof credits === "number") {
    return `${credits.toLocaleString("en-IN")} credits follow the settled unit of 1 rupee = 1 credit. This preview cannot be bought.`;
  }
  if (withheld === "not_a_whole_rupee") {
    return "No credit figure is stated, because the exact amount is not a whole rupee and rounding is not confirmed. This preview cannot be bought.";
  }
  return "No credit figure is stated. This preview cannot be bought.";
}

export function pricingFailure(
  status: number,
  body: { error?: unknown; code?: unknown; field?: unknown },
): PricingFailure {
  const error = typeof body.error === "string" && body.error
    ? body.error
    : `The pricing service returned ${status}.`;
  return {
    ok: false,
    configuration: null,
    preview: null,
    error,
    code: typeof body.code === "string" ? body.code : null,
    field: typeof body.field === "string" ? body.field : null,
  };
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function rupeeString(value: unknown): string | null {
  return typeof value === "string" && MONEY.test(value) ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function assumptions(value: unknown): PricingAssumption[] | null {
  if (!Array.isArray(value)) return null;
  const items: PricingAssumption[] = [];
  for (const item of value) {
    const row = record(item);
    if (!row || typeof row.id !== "string" || typeof row.summary !== "string") return null;
    items.push({ id: row.id, summary: row.summary });
  }
  return items;
}

function gaps(value: unknown): PricingGap[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const items: PricingGap[] = [];
  for (const item of value) {
    const row = record(item);
    const afterInr = row ? rupeeString(row.afterInr) : null;
    const beforeInr = row ? rupeeString(row.beforeInr) : null;
    if (!afterInr || !beforeInr) return null;
    items.push({ afterInr, beforeInr });
  }
  return items;
}

export function readConfiguration(body: unknown): PricingConfigurationView | null {
  const row = record(body);
  if (!row) return null;
  if (row.status !== "provisional" || row.purchasable !== false) return null;
  if (row.questionMapping !== "not_configured") return null;
  if (row.boundaryConventionConfirmed !== false) return null;
  const version = integer(row.version);
  if (typeof row.id !== "string" || version === null) return null;
  if (!Array.isArray(row.bands) || !Array.isArray(row.levels)) return null;

  const bands: PricingBandView[] = [];
  for (const item of row.bands) {
    const band = record(item);
    if (!band || typeof band.id !== "string" || typeof band.label !== "string") return null;
    const position = integer(band.position);
    if (position === null) return null;
    const minInr = rupeeString(band.minInr);
    const basePriceInr = rupeeString(band.basePriceInr);
    let maxInr: string | null = null;
    if (band.maxInr !== null) {
      const parsedMax = rupeeString(band.maxInr);
      if (!parsedMax) return null;
      maxInr = parsedMax;
    }
    if (!minInr || !basePriceInr) return null;
    bands.push({ id: band.id, position, label: band.label, minInr, maxInr, basePriceInr });
  }

  const levels: PricingLevelView[] = [];
  for (const item of row.levels) {
    const level = record(item);
    const multiplier = level ? record(level.multiplier) : null;
    const levelNumber = level ? integer(level.level) : null;
    if (!level || !multiplier || levelNumber === null || typeof multiplier.text !== "string") return null;
    levels.push({ level: levelNumber, multiplierText: multiplier.text });
  }

  const questions: PricingQuestionView[] = [];
  if (row.questions !== undefined) {
    if (!Array.isArray(row.questions)) return null;
    for (const item of row.questions) {
      const question = record(item);
      if (!question || typeof question.id !== "string" || typeof question.prompt !== "string") return null;
      const position = integer(question.position);
      if (position === null) return null;
      if ("level" in question || "qualificationLevel" in question) return null;
      questions.push({ id: question.id, position, prompt: question.prompt });
    }
  }

  const unconfirmed = assumptions(row.unconfirmed ?? []);
  const parsedGaps = gaps(row.gaps);
  if (!unconfirmed || !parsedGaps) return null;
  return {
    id: row.id,
    version,
    status: "provisional",
    note: typeof row.note === "string" ? row.note : null,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    bands,
    levels,
    questions,
    questionMapping: "not_configured",
    gaps: parsedGaps,
    purchasable: false,
    boundaryConventionConfirmed: false,
    unconfirmed,
  };
}

export function readVersionPage(body: unknown): PricingVersionSummary[] | null {
  const row = record(body);
  if (!row || !Array.isArray(row.configurations)) return null;
  const versions: PricingVersionSummary[] = [];
  for (const item of row.configurations) {
    const version = record(item);
    if (!version || version.status !== "provisional" || version.purchasable !== false) return null;
    const versionNumber = integer(version.version);
    if (typeof version.id !== "string" || versionNumber === null) return null;
    versions.push({
      id: version.id,
      version: versionNumber,
      bands: typeof version.bands === "number" ? version.bands : 0,
      levels: typeof version.levels === "number" ? version.levels : 0,
      questions: typeof version.questions === "number" ? version.questions : 0,
      createdAt: typeof version.createdAt === "string" ? version.createdAt : "",
      purchasable: false,
    });
  }
  return versions;
}

export function readOverview(body: unknown): PricingOverviewView | null {
  const row = record(body);
  const versionCount = row ? integer(row.versions) : null;
  if (!row || versionCount === null) return null;
  const purchase = record(row.purchase);
  if (!purchase || purchase.purchaseUsesFramework !== false || purchase.code !== "lead_price_not_configured") {
    return null;
  }
  if (typeof purchase.message !== "string" || !purchase.message) return null;
  if (row.configuration === null) {
    return {
      configuration: null,
      versions: versionCount,
      purchaseMessage: purchase.message,
      purchaseUsesFramework: false,
    };
  }
  const configuration = readConfiguration(row.configuration);
  if (!configuration) return null;
  return {
    configuration,
    versions: versionCount,
    purchaseMessage: purchase.message,
    purchaseUsesFramework: false,
  };
}

export function readPreview(body: unknown): PricingPreviewView | null {
  const row = record(body);
  if (!row) return null;
  if (row.purchasable !== false || row.levelSource !== "supplied" || row.questionMapping !== "not_configured") {
    return null;
  }
  if (row.configurationStatus !== undefined && row.configurationStatus !== "provisional") return null;
  const configurationVersion = integer(row.configurationVersion);
  const qualificationLevel = integer(row.qualificationLevel);
  if (typeof row.calculationId !== "string" || configurationVersion === null || qualificationLevel === null) return null;
  const budgetInr = rupeeString(row.budgetInr);
  const basePriceInr = rupeeString(row.basePriceInr);
  const exact = record(row.exact);
  const rounding = record(row.rounding);
  const purchase = record(row.purchase);
  const multiplier = record(row.multiplier);
  if (!budgetInr || !basePriceInr || !exact || !rounding || !purchase || !multiplier) return null;
  if (purchase.purchaseUsesFramework !== false || typeof purchase.message !== "string") return null;
  if (rounding.confirmed !== false) return null;
  if (typeof exact.paiseNumerator !== "string" || typeof exact.paiseDenominator !== "string") return null;
  if (typeof exact.paiseRemainder !== "string") return null;
  const exactInr = exact.inr === null ? null : rupeeString(exact.inr);
  if (exact.inr !== null && exactInr === null) return null;
  if (typeof multiplier.text !== "string" || typeof row.message !== "string") return null;
  const creditUnit = row.creditUnit === undefined ? null : record(row.creditUnit);
  if (creditUnit && (creditUnit.confirmed !== true || creditUnit.inrPerCredit !== "1")) return null;
  if (!("credits" in row)) return null;
  const credits = row.credits === null ? null : integer(row.credits);
  if (row.credits !== null && credits === null) return null;
  const withheld = row.creditsWithheldBecause === null || row.creditsWithheldBecause === undefined
    ? null
    : row.creditsWithheldBecause;
  if (withheld !== null && typeof withheld !== "string") return null;
  const band = record(row.band);
  const demonstrated = rounding.demonstratedInr === null ? null : rupeeString(rounding.demonstratedInr);
  if (rounding.demonstratedInr !== null && demonstrated === null) return null;
  if (rounding.requested !== null && rounding.requested !== "nearest_100_inr") return null;
  const requested = rounding.requested === "nearest_100_inr" ? "nearest_100_inr" : null;

  return {
    calculationId: row.calculationId,
    configurationVersion,
    budgetInr,
    basePriceInr,
    bandLabel: band && typeof band.label === "string" ? band.label : null,
    qualificationLevel,
    levelStatement: `Qualification level ${qualificationLevel} was supplied for this preview. It is not an AI qualification.`,
    questionStatement: "No question-to-level mapping is configured. The questions do not select this level.",
    multiplierText: multiplier.text,
    exactText: exactCalculationText({
      inr: exactInr,
      paiseNumerator: exact.paiseNumerator,
      paiseDenominator: exact.paiseDenominator,
      paiseRemainder: exact.paiseRemainder,
    }),
    roundingText: roundingDemonstrationText({
      requested: requested === "nearest_100_inr" ? "nearest_100_inr" : null,
      demonstratedInr: demonstrated,
      rule: typeof rounding.rule === "string" ? rounding.rule : null,
    }),
    roundingRequested: requested === "nearest_100_inr" ? "nearest_100_inr" : null,
    message: row.message,
    purchaseMessage: purchase.message,
    creditsText: creditsExplanation(credits, withheld),
    purchasable: false,
  };
}
