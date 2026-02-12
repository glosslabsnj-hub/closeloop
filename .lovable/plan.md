

## Problem

The AI sales agent only receives a high-level **aggregate summary** of inventory (e.g., "27 vehicles in stock. Chevrolet (4)"). It has **zero detail about individual vehicles** -- no year, model, trim, price, mileage, or features. So when a caller asks "What Chevrolets do you have?", the agent can only say "we have four" but can't describe any of them. That's useless for a car sales agent.

## Solution

Add a new **`inventory_detail`** dynamic variable that contains a compact, speech-ready listing of every available vehicle, grouped by make. This gives the agent enough detail to answer questions like:
- "What SUVs do you have under $8K?"
- "Tell me about the Chevrolets"
- "What's the cheapest car you have?"

## Changes

### 1. `buildBusinessContext.ts` -- Build per-vehicle detail string

Inside the existing sales context block (after the summary is built), query the full inventory and generate a compact text block:

```
CHEVROLET:
- 2014 Cruze LTZ, Sedan, 193K mi, $3,500 - Bluetooth, Climate Control, Low Price
- 2012 Equinox LS, SUV, 140K mi, $4,950 - AWD, Low Miles, Bluetooth
- 2013 Traverse LS, SUV, 131K mi, $5,999 - AWD, 3rd Row, Warranty
- 2015 Equinox LT, SUV, 80K mi, $8,498 - Low Miles, Bluetooth

FORD:
- 2011 Edge SEL, SUV, 125K mi, $5,999 - AWD, Leather, Navigation
...
```

Each line is kept short (~80 chars) so the full 27-vehicle list stays under ~3,000 characters -- well within ElevenLabs dynamic variable limits.

### 2. `voiceContextContract.ts` -- Register new variable

Add an `inventory_detail` entry that maps to the new `context.sales.inventory_detail` field.

### 3. `agentBasePrompts.ts` -- Update sales prompt

Update the sales agent prompt to reference `{{inventory_detail}}` and instruct the agent how to use it:

- When asked about specific makes/types, scan `inventory_detail` and describe matching vehicles naturally
- Quote prices and key features from the listing
- If a vehicle isn't in the list, say so honestly
- Keep `inventory_summary` as the quick overview; use `inventory_detail` for specific questions

## Technical Details

- The detail string is grouped by make, sorted by price ascending
- Mileage is formatted as "XXK mi" for speech readability
- Only the top 3-4 features per vehicle are included to keep it concise
- Price formatted as "$X,XXX" (no cents)
- The query reuses the same `sales_inventory` table already being queried for stats, so minimal additional DB load
- A safety cap of ~50 vehicles ensures the variable doesn't blow up for large dealers

