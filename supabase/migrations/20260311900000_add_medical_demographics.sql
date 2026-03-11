-- Add patient demographic fields to medical_intakes table
ALTER TABLE medical_intakes ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE medical_intakes ADD COLUMN IF NOT EXISTS patient_address text;
ALTER TABLE medical_intakes ADD COLUMN IF NOT EXISTS insurance_member_id text;
ALTER TABLE medical_intakes ADD COLUMN IF NOT EXISTS pharmacy_name text;
ALTER TABLE medical_intakes ADD COLUMN IF NOT EXISTS pharmacy_phone text;
ALTER TABLE medical_intakes ADD COLUMN IF NOT EXISTS allergies text;
ALTER TABLE medical_intakes ADD COLUMN IF NOT EXISTS current_medications text;
ALTER TABLE medical_intakes ADD COLUMN IF NOT EXISTS referring_provider text;
