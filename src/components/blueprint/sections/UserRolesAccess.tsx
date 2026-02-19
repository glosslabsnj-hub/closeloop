export function UserRolesAccess() {
  const roles = [
    { role: "super_admin", label: "Super Admin", description: "Platform operator — full access to all tenants and admin panel", canManage: true, canView: true, canEdit: true, canAdmin: true, canDrive: false },
    { role: "owner", label: "Owner", description: "Business owner — full access within their tenant", canManage: true, canView: true, canEdit: true, canAdmin: false, canDrive: false },
    { role: "manager", label: "Manager", description: "Operations manager — can manage bookings, leads, and team", canManage: true, canView: true, canEdit: true, canAdmin: false, canDrive: false },
    { role: "staff", label: "Staff", description: "Staff member — can view and update assigned items", canManage: false, canView: true, canEdit: true, canAdmin: false, canDrive: false },
    { role: "viewer", label: "Viewer", description: "Read-only access to dashboard and reports", canManage: false, canView: true, canEdit: false, canAdmin: false, canDrive: false },
    { role: "driver", label: "Driver", description: "Driver portal access only — jobs, vehicle, impound log", canManage: false, canView: false, canEdit: false, canAdmin: false, canDrive: true },
  ];

  return (
    <section id="user-roles" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-6 print:text-black">2. User Roles & Access</h2>

      <h3 className="text-xl font-semibold mb-3">Role Definitions</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Role</th>
              <th className="text-left py-2 px-3 font-semibold">Description</th>
              <th className="text-center py-2 px-3 font-semibold">Manage</th>
              <th className="text-center py-2 px-3 font-semibold">View</th>
              <th className="text-center py-2 px-3 font-semibold">Edit</th>
              <th className="text-center py-2 px-3 font-semibold">Admin</th>
              <th className="text-center py-2 px-3 font-semibold">Drive</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.role} className="border-b border-border/50">
                <td className="py-2 px-3 font-mono text-xs font-medium">{r.role}</td>
                <td className="py-2 px-3 text-muted-foreground print:text-gray-700 text-xs">{r.description}</td>
                <td className="py-2 px-3 text-center">{r.canManage ? "Yes" : "—"}</td>
                <td className="py-2 px-3 text-center">{r.canView ? "Yes" : "—"}</td>
                <td className="py-2 px-3 text-center">{r.canEdit ? "Yes" : "—"}</td>
                <td className="py-2 px-3 text-center">{r.canAdmin ? "Yes" : "—"}</td>
                <td className="py-2 px-3 text-center">{r.canDrive ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-xl font-semibold mb-3">Admin Access</h3>
      <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
        The admin panel (<code className="text-xs bg-muted px-1 py-0.5 rounded">/admin/*</code>) is gated by the <code className="text-xs bg-muted px-1 py-0.5 rounded">AdminLayout</code> component.
        On mount, it checks <code className="text-xs bg-muted px-1 py-0.5 rounded">isSuperAdmin</code> from AuthContext and redirects non-super_admin users to <code className="text-xs bg-muted px-1 py-0.5 rounded">/login</code>.
        Super admins can switch between tenants using the AdminTenantSwitcher to impersonate any tenant's dashboard.
      </p>

      <h3 className="text-xl font-semibold mb-3">Tenant Isolation</h3>
      <p className="text-sm text-muted-foreground mb-2 print:text-gray-600">
        Every data table includes a <code className="text-xs bg-muted px-1 py-0.5 rounded">tenant_id</code> column with Row-Level Security (RLS) policies that ensure:
      </p>
      <ul className="text-sm space-y-1 mb-4">
        <li className="text-muted-foreground print:text-gray-700">• Users can only read/write data belonging to their own tenant</li>
        <li className="text-muted-foreground print:text-gray-700">• Tenant membership is verified via the <code className="text-xs bg-muted px-1 py-0.5 rounded">tenant_users</code> table</li>
        <li className="text-muted-foreground print:text-gray-700">• Super admins bypass tenant RLS for admin operations</li>
        <li className="text-muted-foreground print:text-gray-700">• Edge functions use service-role keys with explicit tenant scoping</li>
      </ul>

      <h3 className="text-xl font-semibold mb-3">Customer Identity</h3>
      <p className="text-sm text-muted-foreground print:text-gray-600">
        Customers are unique per <code className="text-xs bg-muted px-1 py-0.5 rounded">tenant_id + phone_e164</code>.
        When a returning customer calls, the system matches them by phone number and loads their full history —
        previous bookings, orders, preferences, and AI-learned facts.
      </p>
    </section>
  );
}
