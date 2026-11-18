import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import QRCode from "qrcode";

interface Verse {
  text: string;
  reference: string;
}

interface GcashAccount {
  accountName: string;
  number: string;
  qrImage: string;
}

interface BdoAccount {
  accountName: string;
  accountNumber: string;
  branch: string;
  swiftCode: string;
  qrImage: string;
}

interface GivingConfig {
  churchName: string;
  title: string;
  verse: Verse;
  gcash: GcashAccount;
  bdo: BdoAccount;
  abroadPageUrl: string;
}

type TemplateValues = Record<string, string>;

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUTPUT_DIR = join(ROOT, "output");
const DOCS_DIR = join(ROOT, "docs");
const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;
const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function loadConfig(): GivingConfig {
  const raw = readFileSync(join(ROOT, "config.json"), "utf8");
  return JSON.parse(raw) as GivingConfig;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** {{key}} is HTML-escaped; {{{key}}} is inserted raw (for markup we build ourselves). */
function render(templateName: string, values: TemplateValues): string {
  const template = readFileSync(join(ROOT, "templates", templateName), "utf8");
  return template
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, key: string) => lookup(values, key, templateName))
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => escapeHtml(lookup(values, key, templateName)));
}

function lookup(values: TemplateValues, key: string, templateName: string): string {
  const value = values[key];
  if (value === undefined) {
    throw new Error(`Template ${templateName} uses {{${key}}} but no value was provided.`);
  }
  return value;
}

function imageToDataUri(relativePath: string): string | null {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  const mime = MIME_TYPES[extname(fullPath).toLowerCase()];
  if (!mime) throw new Error(`${relativePath}: use a .png, .jpg, or .webp image.`);
  return `data:${mime};base64,${readFileSync(fullPath).toString("base64")}`;
}

function qrMarkup(dataUri: string | null, label: string, file: string): string {
  if (dataUri) return `<img src="${dataUri}" alt="${escapeHtml(label)} QR code">`;
  return `<div class="qr-missing"><span>Add the official ${escapeHtml(label)} QR as</span><b>${escapeHtml(file)}</b></div>`;
}

async function abroadQrMarkup(url: string): Promise<string> {
  if (!url.trim()) {
    return `<div class="qr-missing small"><span>Set</span><b>abroadPageUrl</b><span>in config.json</span></div>`;
  }
  const dataUri = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
    color: { dark: "#2A1638", light: "#FFF8EC" },
  });
  return `<img src="${dataUri}" alt="QR code for giving from abroad">`;
}

function screenshot(htmlPath: string, pngPath: string): void {
  const chrome = process.env.CHROME_PATH ?? DEFAULT_CHROME;
  if (!existsSync(chrome)) {
    console.warn(`Chrome not found at ${chrome}. Set CHROME_PATH to export the PNG.`);
    return;
  }
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${SLIDE_WIDTH},${SLIDE_HEIGHT}`,
      "--virtual-time-budget=8000",
      `--screenshot=${pngPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: "ignore" },
  );
}

async function main(): Promise<void> {
  const config = loadConfig();
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });

  const gcashQr = imageToDataUri(config.gcash.qrImage);
  const bdoQr = imageToDataUri(config.bdo.qrImage);

  const shared: TemplateValues = {
    churchName: config.churchName,
    title: config.title,
    verseText: config.verse.text,
    verseReference: config.verse.reference,
    gcashName: config.gcash.accountName,
    gcashNumber: config.gcash.number,
    bdoName: config.bdo.accountName,
    bdoAccount: config.bdo.accountNumber,
    bdoBranch: config.bdo.branch,
    bdoSwift: config.bdo.swiftCode,
  };

  const slideHtml = render("slide.html", {
    ...shared,
    gcashQr: qrMarkup(gcashQr, "GCash", config.gcash.qrImage),
    bdoQr: qrMarkup(bdoQr, "BDO", config.bdo.qrImage),
    abroadQr: await abroadQrMarkup(config.abroadPageUrl),
  });
  const slidePath = join(OUTPUT_DIR, "offering-slide.html");
  writeFileSync(slidePath, slideHtml);

  writeFileSync(join(DOCS_DIR, "index.html"), render("abroad.html", shared));

  const pngPath = join(OUTPUT_DIR, "offering-slide.png");
  screenshot(slidePath, pngPath);

  console.log("Built:");
  console.log(`  ${pngPath}  (put this on the TV)`);
  console.log(`  ${slidePath}`);
  console.log(`  ${join(DOCS_DIR, "index.html")}  (Give from abroad page)`);
  if (!gcashQr) console.warn(`  ! Missing ${config.gcash.qrImage}, showing a placeholder.`);
  if (!bdoQr) console.warn(`  ! Missing ${config.bdo.qrImage}, showing a placeholder.`);
  if (!config.abroadPageUrl.trim()) console.warn("  ! abroadPageUrl is empty, corner QR is a placeholder.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
