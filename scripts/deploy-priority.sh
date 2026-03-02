#!/bin/bash
# Deploy edge functions in priority order up to free plan limit (100)
# Already deployed: twilio-inbound (1)

PROJECT_REF="yltzlvzgwkidbeqaoevp"
export SUPABASE_ACCESS_TOKEN="sbp_5987aae9e2fb3d001e1d9dc80fa49041a90b9fc3"

# Priority order: Critical > Important > Availability > Voice > Context > Business > Payments > Notifications > Portal > Security > Docs > Recovery > Other
FUNCTIONS=(
  # CRITICAL (7 remaining - twilio-inbound already deployed)
  elevenlabs-webhook
  elevenlabs-init
  elevenlabs-create-booking
  elevenlabs-create-dispatch-job
  elevenlabs-create-food-order
  booking-handoff
  elevenlabs-conversation-token
  # IMPORTANT (12)
  stripe-webhook
  create-tenant
  delete-tenant
  delete-demo-profile
  create-demo-profile
  activate-demo-profile
  admin-reset-password
  calendar-oauth-start
  calendar-oauth-callback
  integration-oauth-start
  integration-oauth-callback
  process-knowledge-upload
  # AVAILABILITY/SCHEDULING (9)
  check-availability
  compute-available-slots
  availability-suggest
  elevenlabs-check-availability
  sync-availability
  refresh-calendar-list
  create-calendar-event
  calendly-proxy
  cron-calendar-sync
  # VOICE UTILITIES (11)
  elevenlabs-tts
  elevenlabs-transfer-call
  elevenlabs-lookup-booking
  elevenlabs-create-callback
  outbound-call
  test-call-phone
  twilio-sms-webhook
  send-sms
  get-voice-options
  cron-a2p-status-check
  ai-plan-response
  # CONTEXT/MEMORY (8)
  build-business-brain
  check-recovery-context
  copilot-context
  get-business-context
  get-agent-tools-config
  retrieve-business-memory
  retrieve-intent-rules
  retrieve-knowledge
  # BUSINESS MODE SPECIFIC (25)
  dispatch-handoff
  elevenlabs-lookup-dispatch-status
  elevenlabs-cancel-dispatch-job
  create-dispatch-request
  test-drive-handoff
  elevenlabs-search-inventory
  order-handoff
  elevenlabs-lookup-order-status
  check-impound
  get-impound-lot-info
  get-impound-release-info
  sales-lead-handoff
  sync-sales-inventory
  elevenlabs-lookup-active-job
  elevenlabs-initiate-referral-transfer
  elevenlabs-search-referral-network
  search-referral-network
  elevenlabs-check-calendly
  elevenlabs-check-service-area
  elevenlabs-suggest-availability
  elevenlabs-cancel-booking
  elevenlabs-add-to-waitlist
  elevenlabs-reschedule-booking
  ai-text-reply
  seed-test-tenants
  # PAYMENTS (7)
  create-checkout-session
  create-billing-portal-session
  create-payment-link
  get-usage-status
  process-commission-payout
  seed-stripe-prices
  track-usage
  # NOTIFICATIONS (5)
  cron-appointment-reminders
  send-review-request
  cron-review-requests
  cron-no-show-detection
  notify-job-update
  # PORTAL (3)
  portal-booking-action
  generate-portal-token
  verify-portal-token
  # SECURITY (3)
  manage-session-locks
  record-audit-event
  record-observation
  # DOCUMENT/ESTIMATE (5)
  estimate-generate-pdf
  estimate-public-view
  estimate-public-action
  estimate-send-email
  public-roi-report
  # LEAD RECOVERY (3)
  complete-lead-recovery
  execute-recovery-action
  process-recovery-response
)

DEPLOYED=1  # twilio-inbound already deployed
FAILED=0
MAX=100

for fn in "${FUNCTIONS[@]}"; do
  if [ $DEPLOYED -ge $MAX ]; then
    echo "LIMIT REACHED: $DEPLOYED functions deployed. Remaining need Pro plan."
    break
  fi

  echo -n "[$DEPLOYED/$MAX] Deploying $fn... "
  OUTPUT=$(npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" 2>&1)

  if echo "$OUTPUT" | grep -q "Deployed Functions"; then
    DEPLOYED=$((DEPLOYED + 1))
    echo "OK"
  elif echo "$OUTPUT" | grep -q "402"; then
    echo "LIMIT HIT (402)"
    FAILED=$((FAILED + 1))
    break
  else
    echo "FAILED: $(echo "$OUTPUT" | tail -1)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=== DEPLOYMENT SUMMARY ==="
echo "Deployed: $DEPLOYED / $MAX"
echo "Failed: $FAILED"
echo ""

# List functions NOT deployed (remaining)
echo "=== FUNCTIONS NOT DEPLOYED (need Pro plan) ==="
REMAINING_START=$((DEPLOYED - 1))  # -1 because twilio-inbound was pre-deployed
for i in $(seq $REMAINING_START $((${#FUNCTIONS[@]} - 1))); do
  echo "  - ${FUNCTIONS[$i]}"
done
