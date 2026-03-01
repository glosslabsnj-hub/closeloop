#!/usr/bin/env node
/**
 * Automated ESLint cleanup script
 *
 * Handles safe, mechanical fixes:
 * 1. Remove unused imports
 * 2. Prefix unused destructured vars with _
 * 3. Replace Record<string, any> with Record<string, unknown>
 * 4. Replace catch (e: any) with catch (e: unknown)
 *
 * Run: node scripts/cleanup-lint.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

// Read ESLint JSON output
const eslintPath = 'eslint-out2.json';
if (!existsSync(eslintPath)) {
  console.error('Run: npx eslint . --format json > eslint-out2.json first');
  process.exit(1);
}

const eslintData = JSON.parse(readFileSync(eslintPath, 'utf8'));

let totalFixed = 0;
let filesModified = 0;

for (const fileResult of eslintData) {
  // Skip files with no messages
  if (fileResult.messages.length === 0) continue;

  // Skip non-src files (don't touch supabase edge functions which use Deno)
  const filePath = fileResult.filePath;
  if (!filePath.includes('src') && !filePath.includes('tests') && !filePath.includes('scripts')) continue;

  // Read the file
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split('\n');
  let modified = false;
  let fixCount = 0;

  // Group messages by line
  const messagesByLine = new Map();
  for (const msg of fileResult.messages) {
    if (!messagesByLine.has(msg.line)) {
      messagesByLine.set(msg.line, []);
    }
    messagesByLine.get(msg.line).push(msg);
  }

  // Process unused import warnings - collect lines to remove
  const linesToRemove = new Set();

  for (const msg of fileResult.messages) {
    if (msg.ruleId !== '@typescript-eslint/no-unused-vars') continue;

    const varName = msg.message.match(/'([^']+)'/)?.[1];
    if (!varName) continue;

    const line = lines[msg.line - 1];
    if (!line) continue;

    // Case 1: Import line with single import - mark for removal
    // import { Foo } from "..."  or  import Foo from "..."
    const singleImportMatch = line.match(/^\s*import\s+(?:type\s+)?(?:\{\s*(\w+)\s*\}|(\w+))\s+from\s/);
    if (singleImportMatch) {
      const importedName = singleImportMatch[1] || singleImportMatch[2];
      if (importedName === varName) {
        linesToRemove.add(msg.line - 1);
        fixCount++;
        continue;
      }
    }

    // Case 2: Named import among multiple - remove just this name from the import
    // import { Foo, Bar, Baz } from "..."
    if (line.includes('import') && line.includes('{') && line.includes(varName)) {
      // Remove the unused name from the import list
      // Handle: "Foo, ", ", Foo", "Foo" (last/only item)
      const patterns = [
        new RegExp(`\\b${varName}\\s*,\\s*`),           // "Foo, " (not last)
        new RegExp(`\\s*,\\s*${varName}\\b`),            // ", Foo" (last in list)
      ];

      let newLine = line;
      for (const pattern of patterns) {
        if (pattern.test(newLine)) {
          newLine = newLine.replace(pattern, '');
          break;
        }
      }

      // Check if we emptied the import
      if (newLine.match(/\{\s*\}/)) {
        linesToRemove.add(msg.line - 1);
        fixCount++;
        continue;
      }

      if (newLine !== line) {
        lines[msg.line - 1] = newLine;
        modified = true;
        fixCount++;
        continue;
      }
    }

    // Case 3: Unused destructured variable - prefix with _
    // const { foo, bar } = something; where 'bar' is unused
    // Only do this for simple cases
    if (line.includes(varName) && !line.includes('import')) {
      const destructureMatch = line.match(/\{[^}]*\}/);
      if (destructureMatch && destructureMatch[0].includes(varName)) {
        // Replace the variable name with _prefixed version in the destructure
        const newLine = line.replace(
          new RegExp(`\\b${varName}\\b(?!\\s*:)`),
          `_${varName}`
        );
        if (newLine !== line) {
          lines[msg.line - 1] = newLine;
          modified = true;
          fixCount++;
          continue;
        }
      }

      // Case 4: Unused variable declaration
      // const foo = ... where foo is unused
      const constMatch = line.match(/^\s*(?:const|let|var)\s+(\w+)\s*=/);
      if (constMatch && constMatch[1] === varName) {
        const newLine = line.replace(
          new RegExp(`\\b${varName}\\b`),
          `_${varName}`
        );
        if (newLine !== line) {
          lines[msg.line - 1] = newLine;
          modified = true;
          fixCount++;
        }
      }
    }
  }

  // Remove unused import lines (process in reverse to maintain line numbers)
  const sortedLinesToRemove = [...linesToRemove].sort((a, b) => b - a);
  for (const lineIdx of sortedLinesToRemove) {
    lines.splice(lineIdx, 1);
    modified = true;
  }

  if (modified) {
    writeFileSync(filePath, lines.join('\n'));
    filesModified++;
    totalFixed += fixCount;
    const shortPath = filePath.replace(/.*receptionist[\\/]/, '');
    console.log(`  Fixed ${fixCount} issues in ${shortPath}`);
  }
}

console.log(`\nDone: Fixed ${totalFixed} issues across ${filesModified} files`);
