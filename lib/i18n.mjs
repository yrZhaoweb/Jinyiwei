import en from "./i18n/en.mjs";
import zh from "./i18n/zh.mjs";

const locales = { en, zh };

/**
 * Detect locale from LANG / LC_ALL / JINYIWEI_LANG environment variables.
 * Falls back to "en".
 * @returns {"en" | "zh"}
 */
function detectLocale() {
  const explicit = process.env.JINYIWEI_LANG;
  if (explicit && locales[explicit]) return explicit;

  const raw = process.env.LC_ALL || process.env.LANG || "";
  if (/^zh/i.test(raw)) return "zh";
  return "en";
}

/** @type {"en" | "zh"} */
let currentLocale = detectLocale();

/**
 * Get a translated message, interpolating `{key}` placeholders.
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params) {
  const dict = locales[currentLocale] ?? locales.en;
  let msg = dict[key] ?? locales.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replaceAll(`{${k}}`, String(v));
    }
  }
  return msg;
}

/**
 * Override the current locale.
 * @param {"en" | "zh"} locale
 */
export function setLocale(locale) {
  if (locales[locale]) currentLocale = locale;
}

/**
 * @returns {"en" | "zh"}
 */
export function getLocale() {
  return currentLocale;
}
