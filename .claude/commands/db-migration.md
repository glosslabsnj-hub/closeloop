Help me with a Supabase database migration for: $ARGUMENTS

**Migration conventions:**
- File naming: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- Use the current timestamp for the prefix
- Write idempotent SQL when possible (IF NOT EXISTS, etc.)
- Always consider existing data when adding NOT NULL columns (provide defaults)
- Respect the canonical data model:
  - `customers` is the single source of truth for identity (unique on tenant_id, phone_e164)
  - Sessions flow: sessions -> extracted payload -> derived entities
  - Never create entities for modules that are disabled

**Checklist before writing:**
1. Read existing schema by checking recent migrations in `supabase/migrations/`
2. Understand which tables are affected
3. Check for foreign key dependencies
4. Consider RLS (Row Level Security) policies if the table is tenant-scoped
5. Add appropriate indexes for query patterns

**Output:**
- The migration SQL file
- A brief explanation of what it does and why
- Any RLS policies needed
- Rollback instructions if the migration is destructive
