import JSZip from "jszip";

const dispose = Symbol("dispose");

declare global {
  interface SymbolConstructor {
    dispose: typeof dispose;
  }

  interface Disposable {
    [Symbol.dispose]: () => void;
  }
}

Symbol.dispose = dispose;

interface Elements {
  archive: HTMLInputElement;
  perfect: HTMLInputElement;
  parry: HTMLInputElement;
  generate: HTMLButtonElement;
  error: HTMLDivElement;
  downloadRow: HTMLDivElement;
  download: HTMLAnchorElement;
}

const elements = {
  archive: document.getElementById("archive"),
  perfect: document.getElementById("perfect"),
  parry: document.getElementById("parry"),
  generate: document.getElementById("generate"),
  error: document.getElementById("error"),
  downloadRow: document.getElementById("download-row"),
  download: document.getElementById("download"),
} as Elements;

function uiDisable() {
  const { archive, perfect, parry, generate } = elements;
  archive.disabled = true;
  perfect.disabled = true;
  parry.disabled = true;
  generate.disabled = true;
}

function uiEnable() {
  const { archive, perfect, parry, generate } = elements;
  archive.disabled = false;
  perfect.disabled = false;
  parry.disabled = false;
  generate.disabled = false;
}

function uiLock() {
  uiDisable();
  return { [Symbol.dispose]: () => uiEnable() };
}

function displayError(error: string) {
  const children = [...elements.error.childNodes];
  for (const child of children) {
    elements.error.removeChild(child);
  }

  elements.error.appendChild(document.createTextNode(error));
  elements.error.classList.remove("hidden");
}

function hideError() {
  elements.error.classList.add("hidden");
}

function displayDownload(href: string) {
  elements.download.href = href;
  elements.downloadRow.classList.remove("hidden");
}

function hideDownload() {
  elements.downloadRow.classList.add("hidden");
  URL.revokeObjectURL(elements.download.href);
  elements.download.href = "";
}

const DURATION_PREFIX = `"durationSeconds">`;
const DURATION_POSTFIX = `</`;

function patchDuration(contents: string, newDuration: number, fname: string) {
  const prefixStart = contents.indexOf(DURATION_PREFIX);
  if (prefixStart === -1) {
    throw new Error(`Malformed ${fname}: no \`${DURATION_PREFIX}\` sequence`);
  }

  const valueStart = prefixStart + DURATION_PREFIX.length;
  const valueEnd = contents.indexOf(DURATION_POSTFIX, valueStart);
  if (valueEnd === -1) {
    throw new Error(`Malformed ${fname}: no \`${DURATION_POSTFIX}\` sequence after \`${DURATION_PREFIX}\``);
  }

  return contents.slice(0, valueStart) + (newDuration / 1000).toFixed(6) + contents.slice(valueEnd);
}

const HBTB0_PATH = 'Data/Nemesis_Engine/mod/hbtb/1hm_behavior/#hbtb$0.txt';
const HBTB3_PATH = 'Data/Nemesis_Engine/mod/hbtb/1hm_behavior/#hbtb$3.txt';

async function generate() {
  using _lock = uiLock();
  hideError();
  hideDownload();

  try {
    const parry = Number(elements.parry.value);
    const perfect = Number(elements.perfect.value);
    const file = elements.archive.files?.[0];

    if (!file) {
      throw new Error("Hellblade Timed Block archive not selected");
    }

    if (Number.isNaN(perfect) || elements.perfect.value.length === 0) {
      throw new Error("Pefect parry time empty or not a number");
    }

    if (Number.isNaN(parry) || elements.parry.value.length === 0) {
      throw new Error("Parry time empty or not a number");
    }

    const zip = await JSZip.loadAsync(file);

    const hbtb0 = zip.file(HBTB0_PATH);
    const hbtb3 = zip.file(HBTB3_PATH);

    if (!hbtb0) {
      throw new Error(`Can't find ${HBTB0_PATH} file in archive`);
    }

    if (!hbtb3) {
      throw new Error(`Can't find ${HBTB3_PATH} file in archive`);
    }

    const hbtb0Contents = await hbtb0.async('string');
    const hbtb3Contents = await hbtb3.async('string');

    const newHbtb0Contents = patchDuration(hbtb0Contents, perfect, '#hbtb$0.txt');
    const newHbtb3Contents = patchDuration(hbtb3Contents, parry, '#hbtb$3.txt');

    const patchZip = new JSZip();
    patchZip.file(HBTB0_PATH.replace(/^Data\//i, ""), new TextEncoder().encode(newHbtb0Contents));
    patchZip.file(HBTB3_PATH.replace(/^Data\//i, ""), new TextEncoder().encode(newHbtb3Contents));

    const patchZipContents = await patchZip.generateAsync({ type: 'uint8array' });
    const patchZipBlob = new Blob([patchZipContents], { type: 'application/octet-stream' });
    const patchZipOUrl = URL.createObjectURL(patchZipBlob);

    displayDownload(patchZipOUrl);
  } catch (error) {
    if (error instanceof Error) {
      displayError(error.message);
    } else {
      displayError(String(error));
    }
  }
}

elements.generate.addEventListener('click', generate);
