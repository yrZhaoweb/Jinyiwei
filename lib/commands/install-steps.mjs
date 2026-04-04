import fs from "node:fs";

/**
 * Check if a path is a sensitive system directory that should never be used as a workspace.
 * @param {string} p
 * @returns {boolean}
 */
export function isSensitivePath(p) {
  const sensitive = ["/", "/bin", "/boot", "/dev", "/etc", "/home", "/lib", "/lib64", "/opt", "/proc", "/root", "/sbin", "/srv", "/sys", "/usr", "/var"];
  return sensitive.includes(p) || p.startsWith("/etc/") || p.startsWith("/root/") || p.startsWith("/home/");
}

/**
 * Recursively copy a directory using fs.cpSync (Node 16+).
 * @param {string} src
 * @param {string} dst
 * @throws {Error} If copy fails
 */
export function copyDirRecursive(src, dst) {
  try {
    fs.cpSync(src, dst, { recursive: true, errorOnExist: false });
  } catch (/** @type {any} */ err) {
    if (err.code === "ENOENT") {
      throw new Error(`Source directory does not exist: ${src}`);
    }
    if (err.code === "EACCES") {
      throw new Error(`Permission denied: ${src} -> ${dst}`);
    }
    throw err;
  }
}

