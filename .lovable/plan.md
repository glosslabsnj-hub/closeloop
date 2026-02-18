

# Create Tint Kings Demo Tenant

## Corrections from Your Feedback
- Business name: **Tint Kings** (not "Tink Kings")
- Full car tint duration: **4-5 hours (270 minutes avg)**, not 3 hours

---

## What Gets Created

### 1. Tenant Record
| Field | Value |
|-------|-------|
| Name | Tint Kings |
| Business Mode | service |
| Industry | auto-services |
| Timezone | America/New_York |
| Address | 302 W Trenton Ave, Morrisville, PA 19067 |
| Modules | ai_voice, instant_text_back, booking |

### 2. Service Catalog (12 services)

**Automotive Tinting**

| Service | Starting Price | Duration | Notes |
|---------|---------------|----------|-------|
| Full Vehicle Ceramic Tint - Sedan | $700 | 270 min | All windows, premium ceramic |
| Full Vehicle Ceramic Tint - SUV/Truck | $850 | 300 min | Larger vehicles |
| Front Two Windows Only | $150 | 60 min | Driver + passenger |
| Rear Side Windows Only | $250 | 90 min | Rear sides + quarters |
| Rear Windshield Only | $200 | 60 min | Back glass |
| Windshield Ceramic Tint | $250 | 60 min | Front windshield, IR rejection |
| Full Front Package | $350 | 120 min | Windshield + front 2 |
| Sunroof Tint | $100 | 30 min | Panoramic or standard |
| Tint Removal (per window) | $30 | 20 min | Old film strip + clean |

**Residential and Commercial**

| Service | Starting Price | Duration | Notes |
|---------|---------------|----------|-------|
| Home Window Tinting | $800 | 180 min | Per-project, UV/heat/privacy |
| Commercial Window Film | $700 | 180 min | Storefronts, offices |
| Security Film Installation | $1500 | 240 min | Shatter-resistant |

All services use `starting_at` pricing with `price_factors` explaining what causes variation.

### 3. Business FAQs (8 entries)
Covering: ceramic vs standard tint, curing time (3-5 days), warranty, legal limits, residential benefits, preparation, service area (PA + NJ), and scheduling.

### 4. Operating Hours
Monday-Saturday: 8:00 AM - 6:00 PM, Closed Sunday (typical for auto service shops -- can adjust if you know his actual hours).

---

## Technical Steps

1. Call the `create-tenant` edge function with Tint Kings config
2. Insert all 12 services into the `services` table with proper categories and price factors
3. Insert 8 FAQs into `business_faqs`
4. Insert operating hours into `hours_json` on the tenant record
5. Update `assistant_settings` with a tinting-specific greeting script

---

## Build Error Fix (Separate)
The workflow config build errors are pre-existing (the `*_workflow_config` tables don't exist in the database). These will be fixed alongside the tenant setup by converting the Supabase queries to use `any` type assertions so the TypeScript compiler doesn't reject the table names.

