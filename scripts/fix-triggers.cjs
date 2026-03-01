/**
 * Fix trigger formatting: "CREATE TRIGGER nameBEFORE" -> "CREATE TRIGGER name\n  BEFORE"
 * Fix nested DO $$ blocks
 * Fix double DROP TRIGGER lines
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

  // Fix: "CREATE TRIGGER nameBEFORE UPDATE ON" -> "CREATE TRIGGER name\n  BEFORE UPDATE ON"
  content = content.replace(
    /CREATE TRIGGER (\w+)(BEFORE|AFTER|INSTEAD OF)/gi,
    'CREATE TRIGGER $1\n  $2'
  );

  // Fix: "CREATE TRIGGER name\n  BEFORE UPDATE ON" where name already has newline
  // No-op since the above pattern won't match if there's already a newline

  // Fix nested DO $$ blocks in intelligence layer
  // Pattern: DO $$ BEGIN ... DO $$ BEGIN ... END $$; ... END $$;
  content = content.replace(
    /DO \$\$\s*\nBEGIN\s*\n\s*IF NOT EXISTS \(\s*\n\s*SELECT 1 FROM pg_publication_tables\s*\n\s*WHERE pubname = 'supabase_realtime' AND tablename = '(\w+)'\s*\n\s*\) THEN\s*\n\s*DO \$\$ BEGIN\s*\n\s*IF NOT EXISTS \(SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = '\1'\) THEN\s*\n\s*ALTER PUBLICATION supabase_realtime ADD TABLE public\.\1;\s*\n\s*END IF;\s*\nEND \$\$;\s*\n\s*END IF;\s*\nEND \$\$;/gi,
    (match, tableName) => {
      return `DO $$ BEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = '${tableName}') THEN\n    ALTER PUBLICATION supabase_realtime ADD TABLE public.${tableName};\n  END IF;\nEND $$;`;
    }
  );

  // Fix double DROP TRIGGER IF EXISTS lines (from script adding one + already existing one)
  content = content.replace(
    /DROP TRIGGER IF EXISTS (\w+)\s+ON\s+([\w.]+);\s*\n\s*\nDROP TRIGGER IF EXISTS \1 ON \2;\n/gi,
    'DROP TRIGGER IF EXISTS $1 ON $2;\n'
  );

  // Fix double DROP TRIGGER IF EXISTS (adjacent lines)
  content = content.replace(
    /(DROP TRIGGER IF EXISTS (\w+) ON ([\w.]+);\n)DROP TRIGGER IF EXISTS \2 ON \3;\n/gi,
    '$1'
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    totalFixed++;
    console.log(`FIXED: ${file}`);
  }
}

console.log(`\nTotal files modified: ${totalFixed} / ${files.length}`);
