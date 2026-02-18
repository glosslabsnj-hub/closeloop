# Supabase Migrations

## Naming Convention

Migrations use the Supabase-generated format: `YYYYMMDDHHMMSS_<uuid-or-description>.sql`

## Important Notes

- **Never rename or modify applied migrations.** Supabase tracks applied migrations by filename.
- Some migrations have timestamp collisions (e.g., multiple `20260204120000_*` files) or are slightly out of chronological order (e.g., `20260131180000_*` appears after `20260202*` files). These have already been applied successfully and must not be reordered.
- New migrations should use `supabase migration new <description>` to generate the correct timestamp prefix.
