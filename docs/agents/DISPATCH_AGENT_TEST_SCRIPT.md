# DISPATCH Agent Ultimate Test Script

## Test Overview
This script tests all 15 critical features (5 core fixes + 10 strategic enhancements) of the DISPATCH agent.

**Test Phone Number:** [Hawks Towing number]
**Agent:** DISPATCH (agent_2601kghfpmckez3t2n6p7bmcpac4)
**Current Prompt:** Ultimate version (42,676 characters)

---

## TEST 1: GOLDEN PATH (Basic Tow - All Core Fixes)
**Purpose:** Verify basic flow works + all 5 core fixes

**Your Script:**
```
[Agent answers]

YOU: "Hi, I need a tow."

[Agent asks for location]

YOU: "I'm at 25 Erica Lin Way."

[Agent asks for city - ADDRESS CONFIRMATION FIX]

YOU: "Hamilton."

[Agent may ask for state/zip]

YOU: "New Jersey, 08619."

[Agent asks what happened]

YOU: "My car broke down, won't start."

[Agent asks about vehicle - VEHICLE INFO COLLECTION]

YOU: "It's a blue Honda Accord."

[Agent may ask for year]

YOU: "2019."

[Agent asks where it's going]

YOU: "Take it to my house at 123 Oak Street, Hamilton, New Jersey."

[Agent runs check_service_area, quotes price - PRICING CONVERSION FIX]
[Should say something like "around two hundred" NOT "two hundred thousand"]

YOU: "Okay, that works."

[Agent asks for payment method - PAYMENT UPFRONT ENHANCEMENT]

YOU: "Credit card."

[Agent asks for name]

YOU: "John Smith."

[Agent asks for callback number - CALLBACK VERIFICATION ENHANCEMENT]

YOU: "609-555-1234."

[Agent confirms last 4 digits]

YOU: "Yes, that's right."

[Agent creates dispatch job, checks success field - TOOL ERROR RECOVERY FIX]

[Agent confirms details + offers SMS - SMS CONFIRMATION ENHANCEMENT]

YOU: "Yes, text me."

[Agent gives post-dispatch expectations - POST-DISPATCH EXPECTATIONS ENHANCEMENT]

YOU: "Thanks."

[Agent asks "Anything else?"]

YOU: "No, that's it."
```

**Expected Results:**
- ✅ Agent collected complete address with city/state (ADDRESS CONFIRMATION)
- ✅ Agent collected full vehicle info: year, color, make, model (VEHICLE INFO COLLECTION)
- ✅ Agent quoted price in dollars correctly, not cents (PRICING CONVERSION)
- ✅ Agent asked for payment method before dispatching (PAYMENT UPFRONT)
- ✅ Agent verified callback number last 4 digits (CALLBACK VERIFICATION)
- ✅ Agent created dispatch job successfully (no tool errors)
- ✅ Agent offered SMS confirmation (SMS CONFIRMATION)
- ✅ Agent explained what happens next (POST-DISPATCH EXPECTATIONS)
- ✅ Price quote was accurate (base + mileage if long distance)

**Red Flags:**
- ❌ Agent says "$100" for a service that costs $1000 (pricing conversion broken)
- ❌ Agent says "you're all set" without checking tool response (error recovery broken)
- ❌ Agent accepts "25 Erica Lin Way" without asking for city (address confirmation broken)
- ❌ Agent doesn't ask for payment method (payment upfront missing)

---

## TEST 2: WINCH-OUT + TOW (Price Combination + Drivability)
**Purpose:** Test PRICE COMBINATION and WINCH-OUT DRIVABILITY fixes

**Your Script:**
```
[Agent answers]

YOU: "Hi, I went off the road and I'm stuck in a ditch. Need a winch out."

[Agent asks for location]

YOU: "I'm on Route 29 near mile marker 45, outside Trenton."

[Agent may ask for safety]

YOU: "Yeah, I'm safe, I'm out of the car."

[Agent asks where it's going after winch out]

YOU: "My house, 123 Oak Street, Hamilton, New Jersey."

[Agent asks about drivability AFTER winch-out - WINCH-OUT DRIVABILITY FIX]

YOU: "No, the frame is bent. It's not drivable."

[Agent should acknowledge flatbed needed]

[Agent asks about vehicle]

YOU: "2018 red Ford F-150."

[Agent runs check_service_area, should quote BOTH prices - PRICE COMBINATION FIX]
[Should say something like "winch out is a thousand, and the tow is about two hundred,
so total you're looking at around twelve hundred"]

YOU: "Okay."

[Continue with name, payment, etc.]
```

**Expected Results:**
- ✅ Agent asked about drivability AFTER extraction (WINCH-OUT DRIVABILITY)
- ✅ Agent recommended flatbed when told not drivable
- ✅ Agent combined BOTH prices: winch-out ($1000) + tow ($200) = ~$1200 (PRICE COMBINATION)
- ✅ Agent passed drivability status in notes field

**Red Flags:**
- ❌ Agent only quoted tow price, forgot winch-out ($200 instead of $1200)
- ❌ Agent didn't ask about drivability after extraction
- ❌ Agent didn't mention flatbed for non-drivable vehicle

---

## TEST 3: UNKNOWN DROPOFF (Don't Know Dropoff Yet Enhancement)
**Purpose:** Test handling of unknown destination

**Your Script:**
```
[Agent answers]

YOU: "Hi, I need a tow from 25 Erica Lin Way, Hamilton, New Jersey."

[Agent asks where it's going]

YOU: "I don't know yet. I haven't decided which shop to take it to."

[Agent should handle gracefully - UNKNOWN DROPOFF ENHANCEMENT]
[Should say something like "No problem, we can send the driver and you can let them
know where you want it when they get there. Price might change based on where it ends up."]

YOU: "Okay, that works."

[Agent should still create dispatch with dropoff = "TBD - customer will advise driver"]

[Agent quotes base price only]

YOU: "Perfect."

[Continue with vehicle info, name, etc.]
```

**Expected Results:**
- ✅ Agent didn't block on missing dropoff (UNKNOWN DROPOFF)
- ✅ Agent explained price might change based on final destination
- ✅ Agent created dispatch with note about TBD dropoff
- ✅ Agent quoted base pickup fee only

**Red Flags:**
- ❌ Agent insisted on dropoff before continuing
- ❌ Agent refused to dispatch without destination

---

## TEST 4: SPECIAL VEHICLE - MOTORCYCLE (Special Vehicle Protocols)
**Purpose:** Test motorcycle handling

**Your Script:**
```
[Agent answers]

YOU: "I need my motorcycle towed."

[Agent asks for location]

YOU: "456 Main Street, Trenton, New Jersey."

[Agent asks where it's going]

YOU: "My garage at 789 Elm Street, same town."

[Agent should ask about wheel chock - SPECIAL VEHICLE PROTOCOLS]

YOU: "No, I don't have one."

[Agent should note that driver will bring straps and chock]

[Agent runs check_service_area with vehicle_type="motorcycle"]

[Continue with payment, name, etc.]
```

**Expected Results:**
- ✅ Agent asked about wheel chock (SPECIAL VEHICLE PROTOCOLS)
- ✅ Agent noted driver will bring equipment
- ✅ Agent passed vehicle_type="motorcycle" to check_service_area for accurate pricing

**Red Flags:**
- ❌ Agent treated motorcycle same as regular car
- ❌ Agent didn't ask about equipment needs

---

## TEST 5: COMPETING QUOTES (Price Shopping Enhancement)
**Purpose:** Test price shopping handling

**Your Script:**
```
[Agent answers]

YOU: "How much for a tow from Hamilton to Trenton?"

[Agent asks for specific addresses]

YOU: "25 Erica Lin Way, Hamilton to 100 State Street, Trenton."

[Agent runs check_service_area, quotes price]

YOU: "I'm getting quotes from a few places. What's your best price?"

[Agent should handle gracefully - COMPETING QUOTES ENHANCEMENT]
[Should acknowledge, quote the price, differentiate on speed, soft close]

YOU: "How fast can you get here?"

[Agent gives ETA from check_service_area response]

YOU: "Okay, send someone."

[Continue with vehicle, payment, name, etc.]
```

**Expected Results:**
- ✅ Agent acknowledged price shopping without defensiveness (COMPETING QUOTES)
- ✅ Agent quoted exact price from check_service_area
- ✅ Agent differentiated on speed/reliability, not price
- ✅ Agent didn't offer discount (unless ai_max_discount_percent > 0)

**Red Flags:**
- ❌ Agent got defensive or dismissive
- ❌ Agent offered unauthorized discount
- ❌ Agent badmouthed competitors

---

## TEST 6: VULNERABLE CALLER (Priority Override Enhancement)
**Purpose:** Test priority handling for vulnerable populations

**Your Script:**
```
[Agent answers]

YOU: "Hi, I'm broken down on I-295 and I've got my two little kids in the car with me."

[Agent should prioritize - PRIORITY OVERRIDE ENHANCEMENT]
[Should ask about safety first]

YOU: "We're safe, we're pulled over on the shoulder."

[Agent should set urgency to emergency, add priority note]

YOU: "It's really hot out here."

[Agent should reassure and expedite]

[Continue with location, vehicle, etc.]

[Agent should offer to stay on the line]

YOU: "No, that's okay."

[Agent creates dispatch with PRIORITY note: "small children in vehicle"]
```

**Expected Results:**
- ✅ Agent asked about safety immediately (PRIORITY OVERRIDE)
- ✅ Agent set urgency="emergency" in create_dispatch_job
- ✅ Agent added note: "PRIORITY - children in vehicle"
- ✅ Agent offered to stay on the line
- ✅ Agent reassured caller ("We're gonna get someone to you as fast as we can")

**Red Flags:**
- ❌ Agent treated as routine call
- ❌ Agent didn't acknowledge vulnerability
- ❌ Agent didn't set emergency priority

---

## TEST 7: MODIFICATION OF RECENT DISPATCH (Modification Enhancement)
**Purpose:** Test handling of dispatch changes

**Your Script:**
```
[Agent answers]

YOU: "Hi, I just called like 2 minutes ago and I need to change the address."

[Agent asks for name to identify job - MODIFICATION ENHANCEMENT]

YOU: "John Smith."

[Agent asks what needs to change]

YOU: "I gave you the wrong dropoff. It should go to 456 Repair Shop on Oak Street, not my house."

[Agent should acknowledge and use create_callback - MODIFICATION ENHANCEMENT]
[Should say something like "Got it, I'll update that and let the driver know"]

YOU: "Thanks."

[Agent uses create_callback with reason="modification" and detailed notes]
```

**Expected Results:**
- ✅ Agent identified the caller by name (MODIFICATION ENHANCEMENT)
- ✅ Agent collected new information
- ✅ Agent used create_callback to handle modification (can't directly modify jobs)
- ✅ Agent confirmed the change will be communicated

**Red Flags:**
- ❌ Agent said they can't help with changes
- ❌ Agent tried to create a new dispatch instead of updating

---

## TEST 8: GRACEFUL "I DON'T KNOW" (Graceful Unknown Enhancement)
**Purpose:** Test handling of unknown information

**Your Script:**
```
[Agent answers]

YOU: "Do you tow RVs over 40 feet?"

[Agent likely doesn't have this info - GRACEFUL UNKNOWN ENHANCEMENT]
[Should say something like "Let me have someone who knows that off the top of their
head call you right back" - NOT "I don't have that information"]

YOU: "Okay, my number is 609-555-1234."

[Agent creates callback with detailed notes about the question]

[Agent confirms callback within 5-10 minutes]
```

**Expected Results:**
- ✅ Agent handled unknown gracefully without saying "I don't have that information" (GRACEFUL UNKNOWN)
- ✅ Agent offered callback from someone who knows
- ✅ Agent collected number and question details
- ✅ Agent set clear callback expectation

**Red Flags:**
- ❌ Agent said "I don't have that information" or "I can't help with that"
- ❌ Agent guessed or made up an answer
- ❌ Agent sounded robotic or unhelpful

---

## TEST 9: TOOL ERROR RECOVERY (Simulate Error)
**Purpose:** Test error recovery when tools fail

**Note:** This is hard to test without actually breaking the tool, but you can test the validation:

**Your Script:**
```
[Agent answers]

YOU: "I need a tow."

[Agent asks for location]

YOU: "Just tell me the price first."

[Agent should ask for both pickup and dropoff to give accurate price]

YOU: "I don't want to tell you yet, just give me a price."

[Agent should explain they need location for accurate pricing]
[If agent tries to call tool without required fields, should get error]
[Agent should recover by asking for missing info - TOOL ERROR RECOVERY]

YOU: "Fine, 25 Erica Lin Way, Hamilton to 123 Oak Street, Hamilton."

[Agent runs check_service_area successfully and quotes price]
```

**Expected Results:**
- ✅ Agent didn't call tools with incomplete data (TOOL ERROR RECOVERY)
- ✅ If error occurred, agent recovered by asking for missing info
- ✅ Agent didn't retry same broken call more than 2 times
- ✅ Agent offered callback after 2 failed attempts

---

## TEST 10: CANCELLATION (Modification Enhancement)
**Purpose:** Test dispatch cancellation

**Your Script:**
```
[Agent answers]

YOU: "Hi, I just called a minute ago to request a tow and I need to cancel it."

[Agent asks for name - MODIFICATION ENHANCEMENT]

YOU: "Sarah Johnson."

[Agent asks for address to confirm right job]

YOU: "25 Erica Lin Way, Hamilton."

[Agent should use create_callback with reason="cancellation"]
[Should say "No problem, I'll cancel that"]

YOU: "Do I need anything else?"

[Agent asks if they need anything else or if they're all set]

YOU: "I'm all set, thanks."
```

**Expected Results:**
- ✅ Agent identified caller and confirmed job (MODIFICATION ENHANCEMENT)
- ✅ Agent used create_callback for cancellation (can't directly cancel)
- ✅ Agent confirmed cancellation will be processed

---

## QUICK VERIFICATION CHECKLIST

After testing, verify these key behaviors:

### Core Fixes (5)
- [ ] **Pricing Conversion:** All prices quoted in dollars, not cents (divide by 100)
- [ ] **Tool Error Recovery:** Agent checks success field, recovers from errors
- [ ] **Address Confirmation:** Agent always gets city/state, ideally zip
- [ ] **Winch-Out Drivability:** Agent asks if vehicle is drivable after extraction
- [ ] **Price Combination:** Agent adds winch-out + tow prices together correctly

### Strategic Enhancements (10)
- [ ] **Callback Verification:** Agent confirms last 4 digits of callback number
- [ ] **Unknown Dropoff:** Agent handles "don't know yet" gracefully
- [ ] **SMS Confirmation:** Agent offers to text details after dispatch
- [ ] **Competing Quotes:** Agent handles price shopping professionally
- [ ] **Special Vehicles:** Agent asks equipment questions for motorcycles/RVs
- [ ] **Post-Dispatch:** Agent explains what happens next clearly
- [ ] **Graceful Unknown:** Agent uses "let me have someone call you" not "I don't know"
- [ ] **Modification:** Agent handles recent dispatch changes via callback
- [ ] **Payment Upfront:** Agent asks about payment method before dispatching
- [ ] **Priority Override:** Agent prioritizes vulnerable callers (elderly, children, unsafe)

---

## CRITICAL SUCCESS METRICS

**Must Pass (Blocking Issues):**
1. ✅ Pricing is in dollars, not cents (test winch-out should be ~$1000, not $100 or $100,000)
2. ✅ Agent never says "you're all set" without successful tool response
3. ✅ Agent collects complete address (street + city + state minimum)
4. ✅ Agent combines multiple service prices correctly (winch-out + tow)

**Should Pass (High Priority):**
5. ✅ Agent verifies callback number (last 4 digits)
6. ✅ Agent handles unknown dropoff gracefully
7. ✅ Agent asks about drivability for winch-outs
8. ✅ Agent asks payment method before dispatching

**Nice to Have (Medium Priority):**
9. ✅ Agent offers SMS confirmation
10. ✅ Agent explains post-dispatch expectations
11. ✅ Agent handles price shopping professionally
12. ✅ Agent prioritizes vulnerable callers

---

## TESTING TIPS

1. **Record the calls** for review
2. **Take notes** on exact agent responses
3. **Test one scenario at a time** to isolate issues
4. **Listen for natural speech** - agent should sound human, not robotic
5. **Check tool calls succeed** - confirm dispatch jobs are actually created in the system
6. **Verify pricing accuracy** - compare quoted prices to your Business Brain config

**Ready to test!** Start with TEST 1 (Golden Path) to verify core functionality, then move to specific enhancement tests.
