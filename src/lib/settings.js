// src/lib/settings.js
const LS_KEY = "sms_settings";

const DEFAULTS = {
  fontSizeFactor: 0.9, // 0.9 of 1.2
  accessibilityFont:"default", // "default" | "dyslexic"
};

let state = null;

/* -------------------- helpers -------------------- */
function load() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(LS_KEY)) || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

/* -------------------- appliers -------------------- */
function applyFontSizeFactor(factor) {
  document.documentElement.style.setProperty(
    "--font-size-factor",
    String(factor)
  );
}
function ensureDyslexicLink() {
  if (document.querySelector('link[data-font="open-dyslexic"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.cdnfonts.com/css/open-dyslexic";
  link.setAttribute("data-font", "open-dyslexic");
  document.head.appendChild(link);
}
function applyAccessibilityFont(mode) {
  if (mode === "dyslexic") {
    ensureDyslexicLink();
    document.documentElement.style.setProperty(
      "--font-family-accessibility",
      "Open-Dyslexic"
    );
  } else {
    document.documentElement.style.setProperty(
      "--font-family-accessibility",
      "Inter, sans-serif"
    );
  }
}

/* -------------------- lifecycle -------------------- */
export function initSettings() {
  state = load();
  applyFontSizeFactor(state.fontSizeFactor);
  applyAccessibilityFont(state.accessibilityFont);
}

/* -------------------- API -------------------- */
export function getSettings() {
  return { ...state };
}

export function setFontSizeFactor(factor) {
  state.fontSizeFactor = factor;
  applyFontSizeFactor(state.fontSizeFactor);
  save();
  broadcast();
}

export function setAccessibilityFont(mode) {
  state.accessibilityFont = mode; // "default" | "dyslexic"
  applyAccessibilityFont(state.accessibilityFont);
  save();
  broadcast();
}

/* -------------------- pub/sub -------------------- */
const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function broadcast() {
  for (const fn of listeners) fn(getSettings());
}

/* -------------------- enabled stores -------------------- */
let enabledStores = {
  ah: true,
  dirk: true,
  jumbo: true,
  aldi: true,
  hoogvliet: true,
};

export function getEnabledStores() {
  return { ...enabledStores };
}

export function setEnabledStore(store, enabled) {
  enabledStores[store] = enabled;
  broadcast();
}
