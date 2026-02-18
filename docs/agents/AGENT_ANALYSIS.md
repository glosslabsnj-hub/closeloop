# ElevenLabs Agent Configuration Analysis

Generated: 2026-02-17 00:03:03

================================================================================


## SERVICE AGENT

**Agent ID:** `agent_4701kg1vwhzqfxmvzh032nhvx434`
**Name:** SERVICE & BOOKING

### Voice Settings
- Model: eleven_flash_v2
- Voice ID: i2SoWWnAm3qCyr53Jenw
- Stability: 0.47
- Speed: 0.96
- Similarity Boost: 0.63

### Conversation Settings
- Max Duration: 2400s (40 minutes)
- Turn Timeout: 7.0s
- Turn Mode: turn
- Turn Eagerness: eager

### LLM Settings
- Model: claude-sonnet-4-5
- Temperature: 0.02
- Max Tokens: -1
- System Prompt Length: 53365 characters

### First Message
> Hi, thanks for calling {{business_name}}. How can I help you today?

### Tools (10)
1. **suggest_availability**
   - Get available appointment times. Call when customer asks "What times do you have?" Returns up to 5 o...
2. **check_availability**
   - Check if a specific appointment time is available. Call this BEFORE confirming any appointment....
3. **create_booking**
   - Book the appointment after customer confirms. Only call AFTER checking availability AND getting expl...
4. **check_service_area**
   - Check if we can come to the customer's location. For mobile services (HVAC, plumber, detailing, clea...
5. **create_dispatch_job**
   - Send a technician out NOW for emergency service calls. Use for true emergencies only....
6. **create_callback**
   - Create a callback request. Use when: complex quote needed, manager requested, unclear pricing, or an...
7. **cancel_booking**
   - Cancel an existing booking. Ask for name to look it up....
8. **add_to_waitlist**
   - Add customer to waitlist when requested time is fully booked. Only use when waitlist_enabled is true...
9. **lookup_active_job**
   - Look up status of an active job or appointment. Try active_job_summary first before calling....
10. **transfer_to_owner**
   - Transfer the call to the business owner/manager. Use IMMEDIATELY when caller asks to speak to a pers...

### Dynamic Variables (158)
First 10 variables:
1. `tenant_id`: pending
2. `location_id`: default
3. `business_name`: Our Business
4. `businessname`: Our Business
5. `business_tagline`: not set
6. `years_in_business`: not set
7. `website_url`: not set
8. `business_mode`: general
9. `industry_type`: general
10. `enabled_modules`: ai_voice

--------------------------------------------------------------------------------


## SALES AGENT

**Agent ID:** `agent_2301kh5ertzwfas9e9badpers2cf`
**Name:** Sales

### Voice Settings
- Model: eleven_flash_v2
- Voice ID: i2SoWWnAm3qCyr53Jenw
- Stability: 0.5
- Speed: 1.0
- Similarity Boost: 0.8

### Conversation Settings
- Max Duration: 600s (10 minutes)
- Turn Timeout: 7.0s
- Turn Mode: turn
- Turn Eagerness: normal

### LLM Settings
- Model: claude-sonnet-4-5
- Temperature: 0.0
- Max Tokens: -1
- System Prompt Length: 8812 characters

### First Message
> Thanks for calling {{business_name}}. How can I help you today?

### Tools (0)
No tools configured

### Dynamic Variables (21)
First 10 variables:
1. `tenant_id`: pending
2. `business_name`: Our Business
3. `business_mode`: general
4. `enabled_modules`: ai_voice
5. `hours_today`: not set
6. `calendar_connected`: false
7. `service_summary`: not configured yet
8. `active_promotions`: none currently
9. `inventory_summary`: not configured
10. `financing_available`: false

--------------------------------------------------------------------------------


## DISPATCH AGENT

**Agent ID:** `agent_2601kghfpmckez3t2n6p7bmcpac4`
**Name:** DISPATCH

### Voice Settings
- Model: eleven_flash_v2
- Voice ID: i2SoWWnAm3qCyr53Jenw
- Stability: 0.3
- Speed: 0.96
- Similarity Boost: 0.75

### Conversation Settings
- Max Duration: 600s (10 minutes)
- Turn Timeout: 15.0s
- Turn Mode: turn
- Turn Eagerness: eager

### LLM Settings
- Model: claude-sonnet-4-5
- Temperature: 0.05
- Max Tokens: -1
- System Prompt Length: 8563 characters

### First Message
> Thanks for calling {{business_name}}. Do you need help right now, or looking to schedule something?

### Tools (0)
No tools configured

### Dynamic Variables (156)
First 10 variables:
1. `tenant_id`: pending
2. `location_id`: default
3. `business_name`: Our Business
4. `businessname`: Our Business
5. `business_tagline`: not set
6. `years_in_business`: not set
7. `website_url`: not set
8. `business_mode`: general
9. `enabled_modules`: ai_voice
10. `hipaa_mode`: false

--------------------------------------------------------------------------------


## FOOD AGENT

**Agent ID:** `agent_6501kghfd7pcf5dte8k61wnn0m58`
**Name:** FOOD & RESTURANT 

### Voice Settings
- Model: eleven_turbo_v2
- Voice ID: ePn9OncKq8KyJvrTRqTi
- Stability: 0.42
- Speed: 0.96
- Similarity Boost: 0.63

### Conversation Settings
- Max Duration: 600s (10 minutes)
- Turn Timeout: 7.0s
- Turn Mode: turn
- Turn Eagerness: eager

### LLM Settings
- Model: gemini-2.5-flash
- Temperature: 0.02
- Max Tokens: -1
- System Prompt Length: 7507 characters

### First Message
> Thanks for calling {{business_name}}. Are you looking to place an order or make a reservation?

### Tools (0)
No tools configured

### Dynamic Variables (156)
First 10 variables:
1. `tenant_id`: pending
2. `location_id`: default
3. `business_name`: Our Business
4. `businessname`: Our Business
5. `business_tagline`: not set
6. `years_in_business`: not set
7. `website_url`: not set
8. `business_mode`: general
9. `enabled_modules`: ai_voice
10. `hipaa_mode`: false

--------------------------------------------------------------------------------


## GENERAL AGENT

**Agent ID:** `agent_9601kghg3djcfbfvwxxfkrxqpmq9`
**Name:** GENERAL

### Voice Settings
- Model: eleven_turbo_v2
- Voice ID: ePn9OncKq8KyJvrTRqTi
- Stability: 0.42
- Speed: 0.96
- Similarity Boost: 0.63

### Conversation Settings
- Max Duration: 600s (10 minutes)
- Turn Timeout: 7.0s
- Turn Mode: turn
- Turn Eagerness: eager

### LLM Settings
- Model: gemini-2.5-flash
- Temperature: 0.02
- Max Tokens: -1
- System Prompt Length: 6739 characters

### First Message
> Thanks for calling {{business_name}}. How can I help you?

### Tools (0)
No tools configured

### Dynamic Variables (156)
First 10 variables:
1. `tenant_id`: pending
2. `location_id`: default
3. `business_name`: Our Business
4. `businessname`: Our Business
5. `business_tagline`: not set
6. `years_in_business`: not set
7. `website_url`: not set
8. `business_mode`: general
9. `enabled_modules`: ai_voice
10. `hipaa_mode`: false

--------------------------------------------------------------------------------