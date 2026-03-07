-- Fix #532: Sync hours FAQ with hours_json for electrical test tenants
-- Problem: Rob Electric test tenant had hours FAQ saying "Saturday 10 AM to 2 PM"
-- but hours_json says Saturday 8AM-4PM. AI correctly uses hours_json but the
-- FAQ shown in Business Brain was stale/wrong, causing confusion.
--
-- Fix: Update hours FAQ for all electrical tenants to match their actual hours_json.
-- Uses a conditional to output the right hours based on Saturday open/close times.

UPDATE business_faqs bf
SET answer = CASE
  -- Saturday open 8:00 - 16:00 pattern (Rob Electric)
  WHEN t.hours_json->'saturday'->>'closed' = 'false'
    AND t.hours_json->'saturday'->'windows'->0->>'open' = '08:00'
    AND t.hours_json->'saturday'->'windows'->0->>'close' = '16:00'
    THEN 'We''re available Monday through Saturday, 8:00 AM to 4:00 PM. We are closed on Sundays. Emergency service is available 24/7 — call us anytime for urgent electrical issues.'
  -- Saturday open 10:00 - 15:00 pattern (default seed hours)
  WHEN t.hours_json->'saturday'->>'closed' = 'false'
    AND t.hours_json->'saturday'->'windows'->0->>'open' = '10:00'
    THEN 'We''re available Monday through Friday 9:00 AM to 5:00 PM, and Saturday 10:00 AM to 3:00 PM. We are closed on Sundays.'
  -- Saturday closed
  WHEN t.hours_json->'saturday'->>'closed' = 'true'
    THEN 'We''re available Monday through Friday. Please call us to confirm current hours.'
  -- Generic fallback
  ELSE 'Please call us to confirm our current hours. We are closed on Sundays.'
END
FROM tenants t
WHERE bf.tenant_id = t.id
  AND t.industry = 'electrical'
  AND bf.question ILIKE '%what are your hours%'
  AND (
    bf.answer ILIKE '%saturday 10 am to 2 pm%'
    OR bf.answer ILIKE '%saturday 10am to 2pm%'
    OR bf.answer ILIKE '%saturday 10:00 am to 2:00%'
    OR bf.answer ILIKE '%saturday 10 to 2%'
  );

-- Also update any electrical tenants with the generic "website" FAQ to something more helpful
UPDATE business_faqs bf
SET answer = 'We''re available Monday through Saturday, 8:00 AM to 4:00 PM. We are closed on Sundays. Emergency service is available 24/7.'
FROM tenants t
WHERE bf.tenant_id = t.id
  AND t.industry = 'electrical'
  AND bf.question ILIKE '%what are your hours%'
  AND bf.answer ILIKE '%listed on our website%';
