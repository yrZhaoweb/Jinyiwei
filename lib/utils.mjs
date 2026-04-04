/**
 * Remove empty items, trim whitespace, and dedupe strings.
 * @param {Array<string | null | undefined>} values
 * @returns {string[]}
 */
export function uniqueStrings(values) {
  return [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))];
}

/**
 * Parse a comma/newline separated list into unique strings.
 * @param {string | string[] | undefined | null} value
 * @returns {string[]}
 */
export function parseDelimitedList(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  if (typeof value !== "string") {
    return [];
  }

  return uniqueStrings(value.split(/[\n,]/g));
}

/**
 * @param {string[]} channels
 * @returns {string}
 */
export function formatChannelList(channels) {
  return channels.length > 0 ? channels.join(", ") : "local only";
}
