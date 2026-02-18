#!/bin/bash

# UPDATE DISPATCH AGENT PROMPT TO COMPREHENSIVE VERSION
# This script updates the live DISPATCH agent with the comprehensive 76,574 character system prompt

ELEVENLABS_API_KEY="0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b"
AGENT_ID="agent_2601kghfpmckez3t2n6p7bmcpac4"
BASE_URL="https://api.elevenlabs.io"

echo "📖 Reading comprehensive dispatch prompt..."
PROMPT_FILE="./dispatch_agent_system_prompt_COMPREHENSIVE.txt"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "❌ Error: Prompt file not found: $PROMPT_FILE"
  exit 1
fi

PROMPT=$(cat "$PROMPT_FILE")
CHAR_COUNT=${#PROMPT}

echo "   - Characters: $(printf "%'d" $CHAR_COUNT)"
echo "   - Improvement: ~9x larger than current prompt (8,563 chars)"
echo ""

echo "🚀 Updating DISPATCH agent via ElevenLabs API..."
echo "   Agent ID: $AGENT_ID"

# Create the JSON payload with escaped prompt
# We need to properly escape the prompt for JSON
ESCAPED_PROMPT=$(echo "$PROMPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")

# Create the update payload
UPDATE_PAYLOAD=$(cat <<EOF
{
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": $ESCAPED_PROMPT
      }
    }
  }
}
EOF
)

# Make the API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
  "$BASE_URL/v1/convai/agents/$AGENT_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD")

# Extract HTTP status code from last line
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo ""
  echo "✅ DISPATCH agent updated successfully!"
  echo "   - New prompt length: $(printf "%'d" $CHAR_COUNT) characters"
  echo "   - Previous prompt length: 8,563 characters"
  echo "   - Improvement: ~9x larger"
  echo "   - Coverage: 245+ dispatch scenarios"
  echo ""
  echo "🎯 What Changed:"
  echo "   - 3-tier urgency detection (Emergency/Urgent/Standard)"
  echo "   - 245+ comprehensive scenario coverage"
  echo "   - Pricing transparency BEFORE dispatch (builds trust)"
  echo "   - 5-step objection handling protocol"
  echo "   - 15+ upsell opportunities (natural, not pushy)"
  echo "   - Impound call patterns (empathy-first)"
  echo "   - Safety protocols for all situations"
  echo "   - Geographic edge cases (rural, GPS, landmarks)"
  echo "   - Seasonal & weather-specific handling"
  echo "   - Vehicle condition & special handling"
  echo "   - Authorization & documentation flows"
  echo ""
  echo "📋 Next Steps:"
  echo "   1. ✅ System prompt updated"
  echo "   2. ⏳ Configure 7 tools via ElevenLabs dashboard"
  echo "   3. ⏳ Test 20+ scenarios"
  echo "   4. ⏳ Monitor live calls for first week"
else
  echo ""
  echo "❌ Error updating agent (HTTP $HTTP_CODE)"
  echo "Response:"
  echo "$BODY"
  exit 1
fi
