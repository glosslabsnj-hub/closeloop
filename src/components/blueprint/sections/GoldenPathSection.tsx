export function GoldenPathSection() {
  const steps = [
    {
      number: 1,
      title: "Twilio Receives Inbound Call",
      description: "Customer dials the tenant's dedicated phone number. Twilio receives the call and hits our webhook.",
      files: "handle-incoming-call edge function",
      data: "From number (E.164), To number, Twilio CallSid",
    },
    {
      number: 2,
      title: "AI Context Assembly",
      description: "The system looks up the tenant by phone number, loads their full configuration (business info, services, hours, policies, FAQs, capabilities), and builds the AI system prompt.",
      files: "build-ai-context edge function",
      data: "CanonicalPayload: tenant config, services, hours, policies, FAQs, customer history, team availability",
    },
    {
      number: 3,
      title: "ElevenLabs Voice Agent Conversation",
      description: "The call is connected to the ElevenLabs Conversational AI agent. The agent speaks naturally using the assembled context, handling greetings, questions, objections, and gathering required information.",
      files: "ElevenLabs WebSocket connection, voice-agent-webhook",
      data: "Real-time audio streaming, transcript chunks, conversation state",
    },
    {
      number: 4,
      title: "Agent Tool Execution",
      description: "When the AI determines the caller's intent (book, dispatch, order, transfer), it calls the appropriate tool. Tools execute against the database and return confirmation.",
      files: "voice-agent-tools edge function",
      data: "Tool call payload → booking/dispatch/order/transfer confirmation",
    },
    {
      number: 5,
      title: "Post-Call Processing",
      description: "After the call ends, the system classifies the intent, extracts structured entities, generates a summary, and creates/updates the appropriate records.",
      files: "classify-intent, extract-entities, generate-call-summary",
      data: "Call outcome, extracted entities (name, date, service, address), conversation summary",
    },
    {
      number: 6,
      title: "Handoff Delivery",
      description: "The system delivers handoff notifications — SMS to the business owner, webhook to external systems, calendar event creation, Google Sheets logging, and any active workflow automations.",
      files: "Workflow engine, webhook-deliver, send-sms, google-sheets-append",
      data: "Handoff payload: customer info, outcome, summary, extracted data",
    },
    {
      number: 7,
      title: "Dashboard Update",
      description: "The conversation, lead, and any created entities (booking, order, dispatch job) appear in the dashboard via Supabase Realtime subscriptions. The business can review, act on, and manage everything.",
      files: "React Query invalidation, Supabase postgres_changes subscriptions",
      data: "New rows in conversations, leads, bookings/orders/dispatch_jobs tables",
    },
  ];

  return (
    <section id="golden-path" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-6 print:text-black">3. The Golden Path</h2>
      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        The end-to-end flow from an inbound customer call to a fully logged outcome.
        This is the critical path that every call follows — if any link breaks, the whole system fails.
      </p>

      {/* Visual flow */}
      <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto font-mono mb-8 print:bg-gray-100 print:text-black">
{`Customer Call → Twilio → handle-incoming-call → build-ai-context → ElevenLabs Agent
                                                                         │
                                                                    voice-agent-tools
                                                                    (book/dispatch/order)
                                                                         │
                                              classify-intent ← call ends ← Agent
                                              extract-entities
                                              generate-call-summary
                                                     │
                                              Handoff Delivery
                                              (SMS, webhook, calendar, sheets)
                                                     │
                                              Dashboard (Realtime)`}
      </pre>

      {/* Steps */}
      {steps.map((step) => (
        <div key={step.number} className="mb-6 border-l-2 border-primary/30 pl-4">
          <h3 className="text-lg font-semibold mb-1">
            Step {step.number}: {step.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-2 print:text-gray-700">{step.description}</p>
          <div className="text-xs space-y-0.5">
            <p><span className="font-semibold">Files:</span> <span className="text-muted-foreground">{step.files}</span></p>
            <p><span className="font-semibold">Data:</span> <span className="text-muted-foreground">{step.data}</span></p>
          </div>
        </div>
      ))}

      {/* Deterministic Routing */}
      <h3 className="text-xl font-semibold mb-3 mt-8">Deterministic Routing Rules</h3>
      <p className="text-sm text-muted-foreground mb-3 print:text-gray-600">
        The AI classifies each call's intent and routes to the correct entity type:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Intent</th>
              <th className="text-left py-2 px-3 font-semibold">Entity Created</th>
              <th className="text-left py-2 px-3 font-semibold">Business Modes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-mono text-xs">book_appointment</td>
              <td className="py-2 px-3">Booking</td>
              <td className="py-2 px-3 text-muted-foreground">service, medical, general</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-mono text-xs">dispatch_job</td>
              <td className="py-2 px-3">Dispatch Job</td>
              <td className="py-2 px-3 text-muted-foreground">dispatch</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-mono text-xs">place_order</td>
              <td className="py-2 px-3">Food Order</td>
              <td className="py-2 px-3 text-muted-foreground">food</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-mono text-xs">transfer</td>
              <td className="py-2 px-3">Call Transfer</td>
              <td className="py-2 px-3 text-muted-foreground">all modes</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-mono text-xs">info_request</td>
              <td className="py-2 px-3">Lead (info provided)</td>
              <td className="py-2 px-3 text-muted-foreground">all modes</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-mono text-xs">callback_request</td>
              <td className="py-2 px-3">Lead (callback)</td>
              <td className="py-2 px-3 text-muted-foreground">all modes</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
