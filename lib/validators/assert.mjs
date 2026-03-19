/**
 * @param {boolean} condition
 * @param {string} message
 * @param {string[]} errors
 */
export function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}
