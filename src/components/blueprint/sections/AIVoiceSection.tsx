export function AIVoiceSection() {
  return (
    <section id="ai-voice" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-6 print:text-black">9. AI & Voice</h2>

      {/* Architecture */}
      <h3 className="text-xl font-semibold mb-3">Voice Architecture</h3>
      <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto font-mono mb-6 print:bg-gray-100 print:text-black">
{`Customer Phone ──▶ Twilio (SIP/PSTN) ──▶ handle-incoming-call (Supabase Edge)
                                                   │
                                            build-ai-context
                                            (tenant config, services,
                                             hours, FAQs, policies,
                                             customer history)
                                                   │
                                            ElevenLabs Conversational AI
                                            (WebSocket streaming)
                                                   │
                                            voice-agent-tools
                                            (book, dispatch, order, transfer)
                                                   │
                                            Post-call processing
                                            (classify, extract, summarize)`}
      </pre>

      {/* Agent Tools by Mode */}
      <h3 className="text-xl font-semibold mb-3">Agent Tools by Business Mode</h3>
      <p className="text-sm text-muted-foreground mb-3 print:text-gray-600">
        The AI agent has different tools available depending on the tenant's business mode:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Tool</th>
              <th className="text-center py-2 px-3 font-semibold">Service</th>
              <th className="text-center py-2 px-3 font-semibold">Dispatch</th>
              <th className="text-center py-2 px-3 font-semibold">Food</th>
              <th className="text-center py-2 px-3 font-semibold">Medical</th>
              <th className="text-center py-2 px-3 font-semibold">General</th>
              <th className="text-center py-2 px-3 font-semibold">Sales</th>
            </tr>
          </thead>
          <tbody>
            {[
              { tool: "check_availability", modes: [true, false, false, true, true, false] },
              { tool: "book_appointment", modes: [true, false, false, true, true, false] },
              { tool: "create_dispatch_job", modes: [false, true, false, false, false, false] },
              { tool: "place_food_order", modes: [false, false, true, false, false, false] },
              { tool: "create_reservation", modes: [false, false, true, false, false, false] },
              { tool: "transfer_call", modes: [true, true, true, true, true, true] },
              { tool: "send_booking_link", modes: [true, false, false, true, true, false] },
              { tool: "capture_lead", modes: [true, true, true, true, true, true] },
              { tool: "request_callback", modes: [true, true, true, true, true, true] },
              { tool: "get_business_hours", modes: [true, true, true, true, true, true] },
              { tool: "check_service_area", modes: [true, true, false, true, false, false] },
              { tool: "get_eta", modes: [false, true, true, false, false, false] },
              { tool: "schedule_test_drive", modes: [false, false, false, false, false, true] },
              { tool: "create_estimate", modes: [true, true, false, false, true, true] },
            ].map((row) => (
              <tr key={row.tool} className="border-b border-border/50">
                <td className="py-1.5 px-3 font-mono text-xs">{row.tool}</td>
                {row.modes.map((enabled, i) => (
                  <td key={i} className="py-1.5 px-3 text-center text-xs">
                    {enabled ? "Yes" : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Voice Settings */}
      <h3 className="text-xl font-semibold mb-3">Voice Settings</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Setting</th>
              <th className="text-left py-2 px-3 font-semibold">Options</th>
              <th className="text-left py-2 px-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Voice Tone</td>
              <td className="py-2 px-3 font-mono text-xs">professional, friendly, casual, warm, formal</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700 text-xs">Controls the speaking style and word choice</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">AI Mode</td>
              <td className="py-2 px-3 font-mono text-xs">full_auto, assist, transfer_only</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700 text-xs">How much autonomy the AI has — full booking vs. just message-taking</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Greeting Script</td>
              <td className="py-2 px-3 text-xs">Custom text with variables</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700 text-xs">The first thing the AI says when answering. Supports dynamic variables.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Language</td>
              <td className="py-2 px-3 font-mono text-xs">en, es, fr, and 20+ more</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700 text-xs">Primary language for the voice agent</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Call Outcomes */}
      <h3 className="text-xl font-semibold mb-3">Call Outcomes & Intent Classification</h3>
      <p className="text-sm text-muted-foreground mb-3 print:text-gray-600">
        After every call, the system classifies the outcome:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Outcome</th>
              <th className="text-left py-2 px-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              { outcome: "booked", desc: "Appointment or service was booked successfully" },
              { outcome: "transferred", desc: "Call was transferred to a human agent" },
              { outcome: "voicemail", desc: "Customer left a voicemail" },
              { outcome: "info_provided", desc: "AI answered customer's questions (hours, pricing, etc.)" },
              { outcome: "callback_requested", desc: "Customer wants a callback from the business" },
              { outcome: "order_placed", desc: "Food order was placed successfully" },
              { outcome: "dispatch_created", desc: "Dispatch job was created" },
              { outcome: "no_action", desc: "Call ended without a clear outcome (spam, hangup, etc.)" },
            ].map((row) => (
              <tr key={row.outcome} className="border-b border-border/50">
                <td className="py-2 px-3 font-mono text-xs">{row.outcome}</td>
                <td className="py-2 px-3 text-muted-foreground print:text-gray-700">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dynamic Variables */}
      <h3 className="text-xl font-semibold mb-3">Dynamic Variable System</h3>
      <p className="text-sm text-muted-foreground print:text-gray-600">
        The AI context system supports 300+ dynamic variables that are injected into the system prompt.
        These include business name, hours for today, service list, team member names, coverage areas,
        customer history, and more. Variables are resolved at call-start time from the tenant's live data,
        ensuring the AI always has current information.
      </p>
    </section>
  );
}
