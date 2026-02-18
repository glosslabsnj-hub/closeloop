# FOOD & RESTAURANT EXPERTISE KNOWLEDGE BASE

This document provides universal food service industry knowledge for the AI phone order specialist. It covers ordering flows, dietary handling, delivery logistics, catering, reservations, and customer handling best practices across all food business verticals.

---

## ORDERING FLOW BEST PRACTICES

### Phone Order Taking
- Listen for the full item before confirming — customers often add modifiers mid-sentence
- Repeat items back as you go: "So that's a large pepperoni with extra cheese..."
- Ask about drinks and sides after the main items: "Did you want to add any drinks or sides to that?"
- If the customer pauses: "Take your time — anything else?" (not "Is that it?")
- For large orders (5+ items): repeat the full order at the end
- Always confirm the order total before finalizing if available

### Common Order Modifications
- **Size:** small, medium, large, family
- **Protein:** chicken, beef, pork, shrimp, tofu, no protein
- **Spice level:** mild, medium, hot, extra hot
- **Cooking preference:** rare, medium rare, medium, medium well, well done
- **Add/remove toppings:** extra cheese, no onions, light sauce, sauce on the side
- **Substitutions:** fries → salad, white → brown rice, regular → gluten-free crust

### Upselling (Natural, Not Pushy)
- "Want to make that a combo? Comes with fries and a drink."
- "We've got a special on [item] today — want to add that?"
- "That goes great with our [complementary item]."
- Never push upsells if the customer seems in a hurry or has already said no.

---

## DIETARY & ALLERGY HANDLING

### Common Dietary Restrictions
- **Vegetarian:** No meat, poultry, or fish. May eat eggs and dairy.
- **Vegan:** No animal products at all (no meat, dairy, eggs, honey).
- **Gluten-free:** No wheat, barley, rye. Watch for cross-contamination.
- **Nut allergy:** Extremely serious. Tree nuts and/or peanuts. Ask about severity.
- **Dairy-free / Lactose intolerant:** No milk, cheese, butter, cream.
- **Halal / Kosher:** Specific preparation requirements.
- **Keto / Low-carb:** No bread, rice, pasta, sugar.
- **Shellfish allergy:** No shrimp, crab, lobster, mussels, clams.

### Allergy Protocol
1. When customer mentions an allergy: take it seriously immediately
2. Say: "I want to make sure we handle that right."
3. Note the allergy in the order (special instructions field)
4. NEVER guarantee that any item is 100% free of allergens
5. If unsure about ingredients: "Let me have the kitchen confirm that for you" or route to callback
6. For severe allergies (anaphylaxis risk): "I'll make sure the kitchen is aware. They'll take extra care with your order."

### Dietary Tags (Common Menu Labels)
- GF = Gluten-Free
- V = Vegetarian
- VG = Vegan
- DF = Dairy-Free
- NF = Nut-Free
- SF = Shellfish-Free
- S = Spicy

---

## DELIVERY LOGISTICS

### Delivery Order Flow
1. Confirm delivery address FIRST (before taking the order)
2. Check service area with check_service_area tool
3. If out of area: "Unfortunately we don't deliver to that area. Would pickup work?"
4. If in area: proceed with order
5. Confirm delivery fee and minimum order amount
6. Ask for delivery instructions: apartment number, gate code, "leave at door"
7. Provide time estimate: prep time + delivery time

### Common Delivery Situations
- **No answer at door:** "Our driver will call when they arrive. Is this the best number?"
- **Wrong address given:** "Just to confirm, you said [address]? I want to make sure we get it right."
- **Delivery fee question:** Answer from delivery_fee_summary if available
- **Minimum order:** "There's a [amount] minimum for delivery. You're at [current total]."
- **Special delivery instructions:** gate codes, apartment buzzer, "use side entrance", "don't ring doorbell"

### Pickup Flow
1. Take the order
2. Give time estimate based on estimated_prep_minutes
3. Confirm pickup name: "What name should I put on the order?"
4. If caller asks about parking: check Business Brain / FAQs
5. "Your order will be ready for [name] in about [time]."

---

## RESERVATION HANDLING

### Reservation Flow
1. Date and time: "What date and time were you thinking?"
2. Party size: "How many in your party?"
3. Special occasions: "Is this for a special occasion?" (birthday, anniversary)
4. Seating preference: "Indoor or outdoor?" "Booth or table?"
5. Special requests: high chair, wheelchair accessible, near window
6. Dietary needs for the group: "Any dietary restrictions we should know about?"
7. Confirm: "Table for [N] at [time] on [date] under [name]. Sound good?"

### Large Party Reservations (8+)
- May require advance notice
- Some restaurants have separate group/event menus
- Suggest contacting catering if 20+ guests
- Pre-set menus may be available for large groups
- Deposit may be required

### Reservation Policies
- Late arrivals: most restaurants hold tables for 15 minutes
- No-shows: some restaurants charge a no-show fee
- Cancellations: typically 24-hour notice requested
- Walk-ins: availability varies by day/time

---

## CATERING

### Catering Inquiry Flow
1. Event type: "What's the occasion?"
2. Guest count: "How many people are you feeding?"
3. Date and time: "When is the event?"
4. Location: on-site or off-site delivery
5. Dietary requirements: allergies, vegetarian options needed
6. Budget: "Do you have a per-person budget in mind?"
7. If complex → create_callback: "Let me have our catering team call you with options and pricing."

### Common Catering Types
- **Corporate lunch:** sandwich platters, boxed lunches, salad bars
- **Birthday/celebration:** custom cakes, party platters, themed menus
- **Wedding:** full-service catering, tastings, on-site staff
- **Holiday event:** buffet-style, family-style, cocktail hour
- **Daily office meals:** recurring orders, group ordering

### Catering Lead Times
- Simple orders (platters, trays): 24-48 hours
- Custom menus: 3-5 business days
- Large events (50+): 1-2 weeks
- Weddings/formal events: 4-8 weeks

---

## RESTAURANT TYPES & TERMINOLOGY

### Pizza
- **Sizes:** personal (8"), small (10"), medium (12"), large (14"), X-large (16"), party (18")
- **Crust types:** thin, hand-tossed, deep dish, stuffed, gluten-free
- **Half & half:** different toppings on each half
- **Well-done / light:** refers to bake time/cheese color

### Chinese / Asian
- **Spice levels:** mild, medium, hot, Szechuan
- **Protein options:** chicken, beef, pork, shrimp, tofu, combo
- **Rice options:** white, brown, fried, lo mein substitute
- **Combo meals:** typically include entrée + rice + egg roll/soup

### Mexican
- **Protein:** carne asada, al pastor, carnitas, pollo, barbacoa, lengua, vegetarian
- **Spice:** mild, medium, hot, no spice
- **Style:** burrito, bowl, tacos, quesadilla, nachos, enchiladas
- **Extras:** guacamole, sour cream, extra cheese, jalapeños

### Indian
- **Spice levels:** mild, medium, spicy, Indian hot
- **Bread:** naan, garlic naan, roti, paratha
- **Rice:** basmati, jeera rice, biryani
- **Common dishes:** tikka masala, butter chicken, palak paneer, dal

### Italian
- **Pasta types:** spaghetti, penne, fettuccine, rigatoni, linguine
- **Sauces:** marinara, Alfredo, pesto, vodka, meat sauce, oil & garlic
- **Protein add-ons:** chicken, shrimp, meatballs, sausage

### Bakery / Desserts
- **Custom cakes:** need 48-72 hours lead time, size/flavor/design
- **Cupcakes/pastries:** often available same-day
- **Dietary options:** sugar-free, gluten-free, vegan

---

## COMMON CUSTOMER QUESTIONS

### Menu & Pricing
- "What's good here?" → Suggest popular items or specials if available
- "What do you recommend?" → "Our [popular item] is really popular" (from Business Brain data)
- "How much is [item]?" → Quote from menu if available, otherwise "Let me check on that"
- "Do you have [item]?" → Check Business Brain menu. If not found: "I don't see that on our menu, but we have [similar item]."

### Operations
- "How long will it take?" → estimated_prep_minutes for pickup, add delivery time for delivery
- "Are you open?" → hours_today from Business Brain
- "Where are you located?" → location_summary, business_address
- "Do you deliver to [area]?" → Use check_service_area tool
- "Do you have parking?" → Check FAQs or knowledge base

### Payment
- "Do you take cash?" → Check from FAQs/knowledge_summary
- "Can I use my gift card?" → "I'll note that and the team will apply it"
- "Do you have a loyalty program?" → Check from FAQs if available

### Complaints
- Wrong item: "I'm sorry about that. Let me have the team call you to make it right."
- Cold food: "That's not okay. Let me get someone on the line to help."
- Late delivery: "I apologize for the delay. Let me check on that for you."
- Always empathize first, never argue, offer to make it right or escalate.

---

## PEAK TIMES & SCHEDULING

### Typical Busy Periods
- **Lunch rush:** 11:30 AM – 1:30 PM
- **Dinner rush:** 5:30 PM – 8:00 PM
- **Friday/Saturday evenings:** highest demand for reservations
- **Sunday brunch:** 10:00 AM – 1:00 PM
- **Game days / holidays:** plan for higher volume

### Managing Wait Times
- During busy periods: be upfront about wait times
- "We're pretty busy right now, so it might take a bit longer than usual."
- Offer alternatives: "Pickup might be faster if you can swing by."
- For reservations during peak: "Friday nights fill up fast. Want me to check Saturday instead?"
