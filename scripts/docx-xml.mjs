/**
 * docx-xml.mjs — pull one XML part out of a .docx.
 *
 *   import { xmlOf } from "./docx-xml.mjs";
 *   xmlOf("chapter.docx")                    // word/document.xml
 *   xmlOf("chapter.docx", "docProps/core.xml")
 *
 * WHY IT IS ITS OWN FILE
 * build-docs.mjs and check-doc-contrast.mjs both need to read a .docx, and
 * scripts/docx.mjs already had a reader. Two independent implementations of
 * "unzip one member" is exactly how they end up disagreeing about which part is
 * the document body, so there is one.
 *
 * NO DEPENDENCY, deliberately
 * The app has none at runtime and the build keeps that property: a .docx is a
 * zip, and `unzip -p` or PowerShell can open one without anything installed.
 */

import { execFileSync } from "node:child_process";

/**
 * Read one member of a zip as text.
 *
 * `unzip -p` first because it is the smallest thing that works, with the
 * PowerShell fallback for Windows installs without it. Both are invoked as
 * argument arrays, never through a shell, so a path containing spaces or quotes
 * cannot turn into a command.
 */
export function zipMember(file, member) {
  try {
    return execFileSync("unzip", ["-p", file, member], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (err) {
    if (err && err.code === "ENOENT") return zipMemberViaPowerShell(file, member);
    // `unzip` exits non-zero both for "not found" and for "corrupt". A missing
    // member is not a failure worth hiding, so fall through to PowerShell and
    // let that be the authority.
    const viaPs = zipMemberViaPowerShell(file, member, true);
    if (viaPs !== null) return viaPs;
    throw new Error(`could not read ${member} from ${file}: ${err.message}`);
  }
}

function zipMemberViaPowerShell(file, member, optional = false) {
  const esc = String(file).replace(/'/g, "''");
  const mem = String(member).replace(/'/g, "''");
  const ps =
    "Add-Type -AssemblyName System.IO.Compression.FileSystem;" +
    `$z=[IO.Compression.ZipFile]::OpenRead('${esc}');` +
    `$e=$z.Entries|Where-Object{$_.FullName -eq '${mem}'};` +
    "if($e){$s=New-Object IO.StreamReader($e.Open());$x=$s.ReadToEnd();$s.Close()};" +
    "$z.Dispose();$x";
  try {
    const out = execFileSync("powershell", ["-NoProfile", "-Command", ps], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
    return out && out.trim() ? out : (optional ? null : "");
  } catch (_) {
    return optional ? null : "";
  }
}

/** The document body, which is what every parser here wants. */
export function xmlOf(file, member = "word/document.xml") {
  return zipMember(file, member);
}