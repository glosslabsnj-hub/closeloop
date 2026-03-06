-- Add 'qa_seed' to lead_source enum for QA test runner seeding.
-- QA sessions insert test leads with source='qa_seed' to distinguish
-- seeded test data from real production data. Without this value,
-- all QA tests that seed leads (cancel-booking, reschedule, lookup-booking)
-- fail with: invalid input value for enum lead_source: "qa_seed"

ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'qa_seed';
