-- P0-5: Enforce NOT NULL on customer_id for entity tables
--
-- CLAUDE.md: "customers is the single source of truth for identity"
-- food_orders, dispatch_jobs, and reservations all allowed NULL customer_id,
-- which violates the identity contract.
--
-- Strategy: First clean up any orphaned rows with NULL customer_id,
-- then add the NOT NULL constraint.

-- Step 1: Delete orphaned food_orders with no customer (or set a placeholder)
-- Using DELETE since orders without a customer identity have no business value
DELETE FROM public.food_orders WHERE customer_id IS NULL;

-- Step 2: Delete orphaned dispatch_jobs with no customer
DELETE FROM public.dispatch_jobs WHERE customer_id IS NULL;

-- Step 3: Delete orphaned reservations with no customer
DELETE FROM public.reservations WHERE customer_id IS NULL;

-- Step 4: Add NOT NULL constraints
ALTER TABLE public.food_orders ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.dispatch_jobs ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN customer_id SET NOT NULL;
