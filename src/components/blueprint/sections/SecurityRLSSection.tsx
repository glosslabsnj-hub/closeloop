export function SecurityRLSSection() {
  return (
    <section id="security-rls" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-6 print:text-black">13. Security & RLS</h2>

      {/* RLS Patterns */}
      <h3 className="text-xl font-semibold mb-3">Row-Level Security Patterns</h3>
      <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
        Every data table in Supabase uses Row-Level Security (RLS) to enforce tenant isolation.
        Three main patterns are used:
      </p>

      <div className="space-y-4 mb-8">
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-2">Pattern 1: Direct Tenant Match</h4>
          <p className="text-sm text-muted-foreground mb-2 print:text-gray-600">
            Used for most tables. The policy checks that the row's tenant_id matches the user's active tenant.
          </p>
          <pre className="text-xs bg-muted/50 p-3 rounded font-mono print:bg-gray-100 print:text-black">
{`CREATE POLICY "tenant_isolation" ON bookings
  USING (tenant_id = get_user_tenant_id(auth.uid()));`}
          </pre>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-2">Pattern 2: Membership Check</h4>
          <p className="text-sm text-muted-foreground mb-2 print:text-gray-600">
            Used for the tenant_users table itself. Checks that the user is a member of the tenant.
          </p>
          <pre className="text-xs bg-muted/50 p-3 rounded font-mono print:bg-gray-100 print:text-black">
{`CREATE POLICY "users_see_own_tenants" ON tenant_users
  USING (user_id = auth.uid());`}
          </pre>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-2">Pattern 3: Service Role Bypass</h4>
          <p className="text-sm text-muted-foreground mb-2 print:text-gray-600">
            Edge functions use the Supabase service role key, bypassing RLS. They enforce tenant scoping
            explicitly in code by always including tenant_id in queries.
          </p>
          <pre className="text-xs bg-muted/50 p-3 rounded font-mono print:bg-gray-100 print:text-black">
{`// Edge function pattern
const { data } = await supabase
  .from('bookings')
  .select('*')
  .eq('tenant_id', tenantId);  // Always scope by tenant`}
          </pre>
        </div>
      </div>

      {/* Auth Patterns */}
      <h3 className="text-xl font-semibold mb-3">Auth Patterns in Edge Functions</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Pattern</th>
              <th className="text-left py-2 px-3 font-semibold">Used For</th>
              <th className="text-left py-2 px-3 font-semibold">How It Works</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">JWT Auth</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">Dashboard API calls</td>
              <td className="py-2 px-3 text-xs text-muted-foreground">Bearer token from Supabase Auth, decoded to get user_id</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Webhook Signature</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">Twilio, Stripe, Google webhooks</td>
              <td className="py-2 px-3 text-xs text-muted-foreground">HMAC signature verification against provider secrets</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Phone Number Lookup</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">Inbound calls</td>
              <td className="py-2 px-3 text-xs text-muted-foreground">Tenant identified by the called phone number (from phone_numbers table)</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">API Key</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">ElevenLabs tools</td>
              <td className="py-2 px-3 text-xs text-muted-foreground">Shared secret between ElevenLabs agent config and edge function</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Service Role</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">Cron jobs, internal calls</td>
              <td className="py-2 px-3 text-xs text-muted-foreground">Supabase service_role key with explicit tenant scoping</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* HIPAA */}
      <h3 className="text-xl font-semibold mb-3">HIPAA Compliance Mode</h3>
      <p className="text-sm text-muted-foreground mb-3 print:text-gray-600">
        Medical-mode tenants can enable HIPAA compliance, which activates additional protections:
      </p>
      <ul className="text-sm space-y-1 mb-6">
        <li className="text-muted-foreground print:text-gray-700">• AI memory/learning is disabled to prevent storing PHI</li>
        <li className="text-muted-foreground print:text-gray-700">• Call transcripts are flagged as PHI and access-logged</li>
        <li className="text-muted-foreground print:text-gray-700">• Export/download of patient data requires additional confirmation</li>
        <li className="text-muted-foreground print:text-gray-700">• Intelligence features that analyze conversation patterns are restricted</li>
        <li className="text-muted-foreground print:text-gray-700">• Webhook payloads are sanitized to remove PHI fields</li>
        <li className="text-muted-foreground print:text-gray-700">• The <code className="text-xs bg-muted px-1 py-0.5 rounded">hipaa_mode</code> flag in tenant_config controls all HIPAA gating</li>
      </ul>

      {/* Tenant Isolation Guarantees */}
      <h3 className="text-xl font-semibold mb-3">Tenant Isolation Guarantees</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Layer</th>
              <th className="text-left py-2 px-3 font-semibold">Mechanism</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Database</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">RLS policies on every table with tenant_id</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">API</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">JWT contains user_id, resolved to tenant via tenant_users</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Edge Functions</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">Always scope queries by tenant_id, never trust client-sent tenant IDs</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Frontend</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">AuthContext provides tenant context, all hooks auto-scope</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Phone Numbers</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">Each tenant gets dedicated number(s), inbound calls resolve tenant by number</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Storage</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">Supabase Storage buckets use RLS policies matching tenant_id</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Customer Uniqueness */}
      <h3 className="text-xl font-semibold mb-3">Customer Identity Uniqueness</h3>
      <p className="text-sm text-muted-foreground print:text-gray-600">
        Customers are identified by the composite key <code className="text-xs bg-muted px-1 py-0.5 rounded">tenant_id + phone_e164</code>.
        This means the same phone number can exist as different customers across different tenants,
        but within a single tenant, one phone number = one customer. When a returning customer calls,
        the system automatically matches them and loads their full history for AI context.
      </p>
    </section>
  );
}
