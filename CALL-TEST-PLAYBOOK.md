# Flux Receptionist - Call Test Playbook

Test every mode by calling the demo lines below. After each call, check the dashboard at app.getfluxdata.com to verify everything showed up correctly.

**Your test phone**: Use your personal cell so caller ID works. The AI will see your number.

---

## MODE 1: SERVICE (Comfort Zone HVAC)
**Call: (855) 329-7357**

### Test 1A: Book an appointment
**You say:**
> "Hi, my AC stopped blowing cold air this morning. I need someone to come take a look."

**AI should:**
- Greet you as Comfort Zone HVAC
- Ask your name
- Ask about the issue (already told)
- Ask preferred date/time ("When works best?")
- Ask your address
- Confirm the booking back to you

**Check dashboard after:**
- [ ] Call appears in Calls page with your name and "AC repair" or similar as service
- [ ] Booking appears in Bookings page with correct date, service, and your info
- [ ] You get an SMS confirmation

### Test 1B: Ask a question (no booking)
**You say:**
> "What are your hours? Do you do weekend appointments?"

**AI should:**
- Answer with the business hours
- Offer to schedule if you want

**Check dashboard after:**
- [ ] Call appears in Calls page with "info_provided" or "message" outcome
- [ ] No booking created (correct)

### Test 1C: Emergency scenario
**You say:**
> "My furnace is making a loud banging noise and I smell gas. I need someone NOW."

**AI should:**
- Recognize urgency
- If configured: offer to transfer to owner or emergency line
- NOT just book a routine appointment for next week

**Check dashboard after:**
- [ ] Call shows as "hot" lead or "escalated" outcome
- [ ] Urgency is captured in the summary

---

## MODE 2: DISPATCH (Rapid Tow NJ)
**Call: (920) 481-3421**

### Test 2A: Request a tow
**You say:**
> "I broke down on Route 287 near exit 10. I need a tow to the Firestone on Main Street in Parsippany."

**AI should:**
- Ask your name and phone
- Confirm pickup location (Route 287 exit 10)
- Confirm drop-off (Firestone on Main St, Parsippany)
- Ask about vehicle (year, make, model)
- Tell you someone is on the way or give an ETA

**Check dashboard after:**
- [ ] Dispatch job appears in Dispatch page
- [ ] Pickup address shows Route 287
- [ ] Drop-off address shows Firestone location
- [ ] Job type shows "tow" or similar
- [ ] Priority is appropriate (normal or urgent based on situation)
- [ ] You get an SMS confirmation

### Test 2B: Ask about pricing
**You say:**
> "How much does a basic tow cost? I'm about 15 miles from the shop."

**AI should:**
- Provide pricing info if configured in the business brain
- Offer to dispatch if you want to proceed

**Check dashboard after:**
- [ ] Call appears with pricing inquiry in summary

### Test 2C: Lockout (non-tow dispatch)
**You say:**
> "I locked my keys in my car at the Walmart parking lot on Route 46. Can you send someone to unlock it?"

**AI should:**
- Recognize this as a lockout, not a tow
- Ask for vehicle info and exact location
- Create a dispatch for lockout service

**Check dashboard after:**
- [ ] Dispatch job type shows "lockout" or "lock out" (not "tow")

---

## MODE 3: SALES (Metro Motors)
**Call: (505) 405-7226**

### Test 3A: Ask about inventory
**You say:**
> "I'm looking for a used truck, something like a Ford F-150 or Chevy Silverado. What do you have?"

**AI should:**
- Search inventory
- Tell you about available trucks (we seeded 5 vehicles including trucks)
- Mention year, mileage, price
- Offer to schedule a test drive

**Check dashboard after:**
- [ ] Call appears with "truck" or vehicle interest noted
- [ ] If test drive scheduled: appears in Bookings/Test Drives page

### Test 3B: Schedule a test drive
**You say:**
> "Yeah, I'd love to come see that F-150. Can I come Saturday afternoon?"

**AI should:**
- Schedule a test drive for Saturday
- Confirm the vehicle and time
- Ask for your name and contact info

**Check dashboard after:**
- [ ] Test drive appears in Test Drives page with correct vehicle and date
- [ ] Lead appears in Sales Pipeline

### Test 3C: Ask about financing
**You say:**
> "Do you offer financing? My credit isn't great."

**AI should:**
- Provide whatever financing info is in the business brain
- Not make promises about approval
- Offer to connect with the finance team

---

## MODE 4: FOOD (Tony's Pizza)
**Call: (352) 780-6507**

### Test 4A: Place a pickup order
**You say:**
> "I'd like to order a large Margherita Pizza and an order of Garlic Knots for pickup."

**AI should:**
- Repeat the order back to you
- Give you a total (Margherita $14.99 + Garlic Knots $6.99 = ~$21.98 + tax)
- Give you a prep time estimate
- Give you an order number
- Ask for your name

**Check dashboard after:**
- [ ] Order appears in Orders page with correct items
- [ ] Total is reasonable (not $0.00)
- [ ] Status is "pending"
- [ ] Order appears in Kitchen Display
- [ ] You get an SMS confirmation

### Test 4B: Delivery order
**You say:**
> "Can I get a Pepperoni Pizza and a Caesar Salad delivered to 456 Elm Street, Apartment 3B?"

**AI should:**
- Take the order
- Confirm the delivery address
- Give total and estimated delivery time
- Ask for your name and phone

**Check dashboard after:**
- [ ] Order shows as "delivery" type with address
- [ ] Items are correct

### Test 4C: Ask about the menu
**You say:**
> "What kind of pizza do you have? Do you have any specials?"

**AI should:**
- Describe menu items from the menu knowledge base
- Not make up items that don't exist

---

## MODE 5: MEDICAL (Garden State Family Medicine)
**Call: (734) 849-2892**

### Test 5A: New patient intake
**You say:**
> "I'd like to make an appointment. I'm a new patient. My name is John Smith."

**AI should:**
- Ask for consent to collect your information
- Ask reason for visit
- Ask preferred date
- Ask date of birth
- Ask about insurance (provider, member ID)
- Ask about allergies
- Ask about current medications
- Ask about preferred pharmacy
- Confirm everything back

**Check dashboard after:**
- [ ] Intake appears in Medical Intake page
- [ ] Type shows "new_patient"
- [ ] Click the row - detail sheet shows all demographics you provided
- [ ] Date of birth is correct
- [ ] Insurance info is captured
- [ ] Allergies and medications are captured

### Test 5B: Prescription refill
**You say:**
> "I need to refill my blood pressure medication. My name is Jane Doe, date of birth September 12, 1975."

**AI should:**
- Classify this as a prescription refill
- Ask which medication
- Ask for pharmacy info
- Not schedule a full appointment (just the refill request)

**Check dashboard after:**
- [ ] Intake type shows "prescription_refill"
- [ ] Notes mention the medication

### Test 5C: Urgent concern
**You say:**
> "I've had a really bad headache for three days and now my vision is getting blurry. Should I come in today?"

**AI should:**
- Recognize urgency
- NOT diagnose
- Recommend they come in as soon as possible or suggest ER if symptoms warrant
- Create an urgent intake

**Check dashboard after:**
- [ ] Urgency level shows "urgent" or "soon" (not "routine")

---

## MODE 6: GENERAL (Summit Advisory Group)
**Call: (458) 309-3057**

### Test 6A: Request a callback
**You say:**
> "Hi, I'd like to speak with someone about your consulting services. Can someone call me back this afternoon?"

**AI should:**
- Take your name and phone
- Ask what you're calling about
- Note "this afternoon" as best time
- Confirm a callback will be scheduled

**Check dashboard after:**
- [ ] Callback request appears in Calls page (callback section)
- [ ] Your name and phone are correct
- [ ] Reason is captured
- [ ] Best time shows "afternoon" or similar
- [ ] Urgency is appropriate

### Test 6B: Ask a general question
**You say:**
> "What kind of services do you offer?"

**AI should:**
- Describe the business's services from knowledge base
- Offer to connect you with someone or schedule a callback

### Test 6C: Leave a message
**You say:**
> "Can you just let them know that Mike called about the project proposal? They'll know what it's about."

**AI should:**
- Capture the message
- Confirm it'll be delivered

**Check dashboard after:**
- [ ] Call summary captures the message about "project proposal"

---

## CROSS-MODE CHECKS (do after testing all modes)

### SMS Delivery
- [ ] Did you receive SMS confirmations for bookings?
- [ ] Did you receive SMS for dispatch assignments?
- [ ] Did you receive SMS for food order confirmation?

### Dashboard Accuracy
- [ ] Needs Attention Banner shows pending items accurately
- [ ] Call counts match what you actually called
- [ ] No phantom/duplicate entries

### AI Quality
- [ ] AI never said "I don't have that information" when it should have known
- [ ] AI never made up services/pricing that don't exist
- [ ] AI voice was clear and natural
- [ ] AI handled interruptions (you talking over it) gracefully
- [ ] AI didn't loop or repeat itself

---

## REPORTING ISSUES

After testing, note each issue in this format:

```
MODE: [service/dispatch/sales/food/medical/general]
TEST: [which test, e.g. 2A]
ISSUE: [what went wrong]
EXPECTED: [what should have happened]
ACTUAL: [what actually happened]
SEVERITY: [blocking / annoying / cosmetic]
```

Send the list to Claude Code and I'll fix every issue.
