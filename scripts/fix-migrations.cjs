/**
 * Makes all migration SQL files idempotent by adding:
 * - IF NOT EXISTS to CREATE TABLE
 * - IF NOT EXISTS to CREATE INDEX / CREATE UNIQUE INDEX
 * - DROP POLICY IF EXISTS before CREATE POLICY
 * - DROP TRIGGER IF EXISTS before CREATE TRIGGER
 * - ON CONFLICT (id) DO NOTHING to INSERT INTO storage.buckets
 */
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // 1. CREATE TABLE public.X ( → CREATE TABLE IF NOT EXISTS public.X (
  content = content.replace(
    /CREATE TABLE(?!\s+IF\s+NOT\s+EXISTS)\s+(public\.\w+)/gi,
    'CREATE TABLE IF NOT EXISTS $1'
  );

  // 2. CREATE INDEX X → CREATE INDEX IF NOT EXISTS X
  content = content.replace(
    /CREATE INDEX(?!\s+IF\s+NOT\s+EXISTS)\s+/gi,
    'CREATE INDEX IF NOT EXISTS '
  );

  // 3. CREATE UNIQUE INDEX X → CREATE UNIQUE INDEX IF NOT EXISTS X
  content = content.replace(
    /CREATE UNIQUE INDEX(?!\s+IF\s+NOT\s+EXISTS)\s+/gi,
    'CREATE UNIQUE INDEX IF NOT EXISTS '
  );

  // 4. CREATE POLICY "name" ON table → DROP POLICY IF EXISTS "name" ON table;\nCREATE POLICY "name" ON table
  // Match: CREATE POLICY "some name"\n  ON public.table_name
  content = content.replace(
    /(?<!DROP POLICY IF EXISTS [^\n]*\n)CREATE POLICY\s+"([^"]+)"\s*\n?\s*ON\s+([\w.]+)/gi,
    (match, policyName, tableName) => {
      return `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\nCREATE POLICY "${policyName}"\n  ON ${tableName}`;
    }
  );

  // Also handle single-line: CREATE POLICY "name" ON table
  content = content.replace(
    /(?<!DROP POLICY IF EXISTS [^\n]*\n)CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w.]+)/gi,
    (match, policyName, tableName) => {
      // Check if already has DROP before it
      return `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\nCREATE POLICY "${policyName}" ON ${tableName}`;
    }
  );

  // Clean up any double DROP POLICY IF EXISTS lines that might have been introduced
  content = content.replace(
    /(DROP POLICY IF EXISTS "[^"]+"\s+ON\s+[\w.]+;\n){2,}/gi,
    (match) => {
      const lines = match.trim().split('\n').filter(Boolean);
      return lines[lines.length - 1] + '\n';
    }
  );

  // 5. CREATE TRIGGER name ... ON table → DROP TRIGGER IF EXISTS name ON table;\nCREATE TRIGGER ...
  content = content.replace(
    /(?<!DROP TRIGGER IF EXISTS [^\n]*\n)CREATE TRIGGER\s+(\w+)\s*([\s\S]*?)\s+ON\s+(public\.\w+)/gi,
    (match, triggerName, between, tableName) => {
      return `DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};\nCREATE TRIGGER ${triggerName}${between} ON ${tableName}`;
    }
  );

  // Clean up double DROP TRIGGER IF EXISTS
  content = content.replace(
    /(DROP TRIGGER IF EXISTS \w+ ON [\w.]+;\n){2,}/gi,
    (match) => {
      const lines = match.trim().split('\n').filter(Boolean);
      return lines[lines.length - 1] + '\n';
    }
  );

  // 6. INSERT INTO storage.buckets ... VALUES ... without ON CONFLICT
  content = content.replace(
    /(INSERT INTO storage\.buckets\s*\([^)]+\)\s*\n?\s*VALUES\s*\([^)]+\))(?!\s*ON CONFLICT)/gi,
    '$1\nON CONFLICT (id) DO NOTHING'
  );

  // 7. ALTER PUBLICATION supabase_realtime ADD TABLE → make idempotent
  content = content.replace(
    /ALTER PUBLICATION supabase_realtime ADD TABLE (public\.\w+);/gi,
    (match, tableName) => {
      return `DO $$ BEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = '${tableName.replace('public.', '')}') THEN\n    ALTER PUBLICATION supabase_realtime ADD TABLE ${tableName};\n  END IF;\nEND $$;`;
    }
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    totalFixed++;
    console.log(`FIXED: ${file}`);
  }
}

console.log(`\nTotal files modified: ${totalFixed} / ${files.length}`);
