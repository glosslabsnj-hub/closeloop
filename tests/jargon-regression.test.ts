/**
 * Jargon Regression Tests
 *
 * @vitest-environment node
 *
 * Ensures user-facing UI components don't use technical jargon.
 * These are terms that real business owners (plumber, salon, restaurant)
 * would not understand. Developer/debug pages are excluded.
 *
 * Gates: overall/non_technical_usable
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { readdirSync, statSync } from "node:fs";

const ROOT = process.cwd();
const PAGES_DIR = join(ROOT, "src/pages/app");
const COMPONENTS_DIR = join(ROOT, "src/components");

// Pages/dirs that are explicitly developer-facing (excluded from jargon checks)
const EXCLUDED_PATHS = [
  "src/pages/debug",
  "src/pages/admin",
  "src/components/admin",
  "src/components/ai/ElevenLabsSetupGuide", // Developer setup guide
  "src/integrations",
];

function isExcluded(filePath: string): boolean {
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");
  return EXCLUDED_PATHS.some((excluded) => rel.startsWith(excluded));
}

function collectTsxFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectTsxFiles(fullPath));
    } else if (entry.endsWith(".tsx") && !isExcluded(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

// Collect all user-facing TSX files
const userFacingFiles = [
  ...collectTsxFiles(PAGES_DIR),
  ...collectTsxFiles(COMPONENTS_DIR),
];

/**
 * Check for a jargon term in user-facing STRING LITERALS only.
 * We look for the term inside quotes or JSX text content,
 * not in variable names, imports, or comments.
 */
function findJargonInStrings(source: string, term: string): string[] {
  const matches: string[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip import lines, comments, and variable/type declarations
    if (line.trimStart().startsWith("import ")) continue;
    if (line.trimStart().startsWith("//")) continue;
    if (line.trimStart().startsWith("*")) continue;
    if (line.trimStart().startsWith("/*")) continue;

    // Check for the term in string literals (quoted text) or JSX text
    const lowerLine = line.toLowerCase();
    const lowerTerm = term.toLowerCase();

    if (lowerLine.includes(lowerTerm)) {
      // Verify it's in a string context, not a variable name
      // Look for term inside quotes or JSX text (after > and before <)
      const inQuotes = new RegExp(`["'\`][^"'\`]*${term}[^"'\`]*["'\`]`, "i").test(line);
      const inJsx = new RegExp(`>[^<]*${term}[^<]*<`, "i").test(line);
      // Also check for template literals and plain JSX text
      const inTemplate = new RegExp(`\\$\\{[^}]*\\}[^"'\`]*${term}`, "i").test(line);

      if (inQuotes || inJsx || inTemplate) {
        matches.push(`Line ${i + 1}: ${line.trim()}`);
      }
    }
  }
  return matches;
}

describe("Jargon check: no 'Configuration Failed' in error messages", () => {
  for (const file of userFacingFiles) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const source = readFileSync(file, "utf-8");

    if (source.includes("Configuration Failed")) {
      it(`${rel} should not use "Configuration Failed"`, () => {
        const matches = findJargonInStrings(source, "Configuration Failed");
        expect(
          matches,
          `${rel} uses "Configuration Failed" — should be "Couldn't save your settings"\n${matches.join("\n")}`
        ).toHaveLength(0);
      });
    }
  }

  it("passes when no jargon found (placeholder)", () => {
    expect(true).toBe(true);
  });
});

describe("Jargon check: no window.location.reload in user-facing components", () => {
  for (const file of userFacingFiles) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const source = readFileSync(file, "utf-8");

    if (source.includes("window.location.reload")) {
      it(`${rel} should not use window.location.reload()`, () => {
        expect(
          false,
          `${rel} uses window.location.reload() — use React Query refetch() or navigate() instead`
        ).toBe(true);
      });
    }
  }

  it("passes when no reload found (placeholder)", () => {
    expect(true).toBe(true);
  });
});

describe("Jargon check: sensitive terms are not in user-facing error messages", () => {
  // These exact phrases should never appear in user-facing error messages
  const FORBIDDEN_ERROR_PHRASES = [
    "Something went wrong",   // Too generic — should be contextual
    "Internal Server Error",  // Technical HTTP status
    "500 error",             // HTTP code
    "CORS error",            // Browser technical term
    "null reference",        // Programming term
    "undefined is not",      // Programming term
  ];

  for (const phrase of FORBIDDEN_ERROR_PHRASES) {
    it(`no user-facing component uses "${phrase}" as error text`, () => {
      const violations: string[] = [];

      for (const file of userFacingFiles) {
        const source = readFileSync(file, "utf-8");
        const matches = findJargonInStrings(source, phrase);
        if (matches.length > 0) {
          const rel = relative(ROOT, file).replace(/\\/g, "/");
          violations.push(`${rel}: ${matches.join(", ")}`);
        }
      }

      expect(
        violations,
        `Found "${phrase}" in user-facing components:\n${violations.join("\n")}`
      ).toHaveLength(0);
    });
  }
});
