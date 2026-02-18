Analyze or work with the database schema for: $ARGUMENTS

**Steps:**
1. Read recent migrations in `supabase/migrations/` to understand current schema
2. Identify the relevant tables, columns, constraints, and RLS policies
3. Map relationships and foreign keys

**Key schema rules:**
- `customers` table: single source of truth for identity (unique on tenant_id + phone_e164)
- All phone numbers must be E.164 normalized
- Sessions flow: sessions → extracted payload → derived entities
- Entities are only created for enabled modules (check enabled_modules)
- Tenant isolation via RLS policies on all user-facing tables

**Common operations:**
- Inspect a table: Read migration files that create/alter it
- Add a column: Create a new migration with ALTER TABLE
- Add an index: Consider query patterns and cardinality
- Add RLS: Ensure tenant_id-based filtering for multi-tenant safety
