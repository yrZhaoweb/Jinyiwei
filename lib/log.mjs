/**
 * Zero-dependency colored CLI output helpers.
 * Respects NO_COLOR / FORCE_COLOR environment variables.
 */

const isColorSupported =
  !process.env.NO_COLOR &&
  (process.env.FORCE_COLOR || (process.stdout.isTTY && process.env.TERM !== "dumb"));

/** @param {string} code */
function wrap(code, resetCode = "0") {
  if (!isColorSupported) return (/** @type {string} */ s) => s;
  return (/** @type {string} */ s) => `\x1b[${code}m${s}\x1b[${resetCode}m`;
}

export const bold = wrap("1", "22");
export const dim = wrap("2", "22");
export const green = wrap("32", "39");
export const red = wrap("31", "39");
export const yellow = wrap("33", "39");
export const cyan = wrap("36", "39");
export const magenta = wrap("35", "39");
export const gray = wrap("90", "39");

export const symbols = {
  tick: isColorSupported ? green("✔") : "[OK]",
  cross: isColorSupported ? red("✖") : "[FAIL]",
  arrow: isColorSupported ? cyan("➜") : "->",
  info: isColorSupported ? cyan("ℹ") : "[i]",
  warn: isColorSupported ? yellow("⚠") : "[!]",
  step: isColorSupported ? magenta("▸") : ">",
  bullet: isColorSupported ? dim("●") : "*",
};

/**
 * Print a step header.
 * @param {number} current
 * @param {number} total
 * @param {string} message
 */
export function step(current, total, message) {
  const counter = dim(`[${current}/${total}]`);
  console.log(`\n  ${symbols.step} ${counter} ${bold(message)}`);
}

/**
 * Print a success line.
 * @param {string} message
 */
export function ok(message) {
  console.log(`  ${symbols.tick} ${message}`);
}

/**
 * Print a failure line.
 * @param {string} message
 */
export function fail(message) {
  console.error(`  ${symbols.cross} ${message}`);
}

/**
 * Print an info line.
 * @param {string} message
 */
export function info(message) {
  console.log(`  ${symbols.info} ${message}`);
}

/**
 * Print a warning line.
 * @param {string} message
 */
export function warn(message) {
  console.log(`  ${symbols.warn} ${yellow(message)}`);
}

/**
 * Print a detail/bullet line (indented).
 * @param {string} message
 */
export function detail(message) {
  console.log(`    ${symbols.bullet} ${dim(message)}`);
}

/**
 * Print a banner.
 * @param {string} version
 */
export function banner(version) {
  console.log();
  console.log(`  ${bold(cyan("锦衣卫 Jinyiwei"))} ${dim(`v${version}`)}`);
  console.log(`  ${dim("OpenClaw governance plugin")}`);
  console.log();
}

/**
 * Print a boxed summary.
 * @param {"ok" | "fail"} status
 * @param {string} message
 */
export function summary(status, message) {
  console.log();
  if (status === "ok") {
    console.log(`  ${green("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
    console.log(`  ${symbols.tick} ${bold(green(message))}`);
    console.log(`  ${green("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
  } else {
    console.log(`  ${red("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
    console.log(`  ${symbols.cross} ${bold(red(message))}`);
    console.log(`  ${red("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
  }
  console.log();
}
