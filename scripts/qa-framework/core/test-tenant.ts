/**
 * Test Tenant Management
 * Creates isolated test tenants with realistic business configs.
 * Cleans up all test data after tests complete.
 */
import { dbInsert, dbQuery, dbDelete, dbUpdate } from "./supabase-client.js";
import { TEST_PREFIX, TEST_CUSTOMER_PREFIX } from "./config.js";
import type { BusinessConfig, TestContext, ServiceConfig, StaffConfig } from "./types.js";
import { SUPABASE_URL, SERVICE_ROLE_KEY } from "./config.js";

// ── Create Test Tenant ──────────────────────────────────────────────

export async function createTestTenant(config: BusinessConfig): Promise<TestContext> {
  const tenantName = `${TEST_PREFIX} ${config.name}`;

  // Check if test tenant already exists
  const existing = await dbQuery("tenants", { name: tenantName });
  let tenantId: string;

  if (existing.length > 0) {
    tenantId = (existing[0] as any).id;
    console.log(`  Reusing existing test tenant: ${tenantName} (${tenantId.substring(0, 8)}...)`);
    // Update config to match current test
    await dbUpdate("tenants", { id: tenantId }, buildTenantData(config, tenantName));
  } else {
    const tenant = await dbInsert("tenants", {
      ...buildTenantData(config, tenantName),
    });
    tenantId = (tenant as any).id;
    console.log(`  Created test tenant: ${tenantName} (${tenantId.substring(0, 8)}...)`);
  }

  // Upsert assistant_settings
  const existingSettings = await dbQuery("assistant_settings", { tenant_id: tenantId });
  if (existingSettings.length > 0) {
    await dbUpdate("assistant_settings", { tenant_id: tenantId }, buildAssistantSettings(config));
  } else {
    await dbInsert("assistant_settings", {
      tenant_id: tenantId,
      ...buildAssistantSettings(config),
    });
  }

  // Create services
  const serviceIds: Record<string, string> = {};
  // Clean up dependent records before deleting services (FK constraints)
  try { await dbDelete("busy_blocks", { tenant_id: tenantId }); } catch { /* ignore */ }
  try { await dbDelete("bookings", { tenant_id: tenantId }); } catch { /* ignore */ }
  // Delete old test services
  await dbDelete("services", { tenant_id: tenantId });

  for (const svc of config.services) {
    const service = await dbInsert("services", {
      tenant_id: tenantId,
      name: svc.name,
      duration_minutes: svc.duration_minutes,
      price_type: svc.price_type,
      price_amount: svc.price_amount || null,
      confirmation_mode: svc.confirmation_mode || null,
      requires_dropoff: svc.requires_dropoff ?? false,
      booking_type: svc.booking_type || "direct_book",
      preparation_instructions: svc.preparation_instructions || null,
      is_active: true,
    });
    serviceIds[svc.name] = (service as any).id;
  }

  // Create staff if configured
  const staffIds: Record<string, string> = {};
  if (config.staff && config.staff.length > 0) {
    // Staff uses staff_members table
    await dbDelete("staff_members", { tenant_id: tenantId });
    for (const staff of config.staff) {
      // Map custom roles to valid DB roles (check constraint: owner, manager, staff)
      const dbRole = staff.role.includes("owner") ? "owner"
        : staff.role.includes("manager") || staff.role.includes("lead") || staff.role.includes("foreman") ? "manager"
        : "staff";
      const member = await dbInsert("staff_members", {
        tenant_id: tenantId,
        full_name: staff.name,
        role: dbRole,
        is_active: true,
      });
      staffIds[staff.name] = (member as any).id;
    }
  }

  return {
    tenantId,
    businessConfig: config,
    serviceIds,
    staffIds,
    createdRecords: [],
    variables: {},
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SERVICE_ROLE_KEY,
  };
}

function buildTenantData(config: BusinessConfig, tenantName: string) {
  return {
    name: tenantName,
    business_mode: config.mode,
    industry: config.industry,
    timezone: config.timezone,
    phone_public: config.phone,
    address: config.address,
    hours_json: config.hours,
    appointment_buffer_minutes: config.settings.buffer_minutes,
    max_advance_days: config.settings.max_advance_days,
  };
}

function buildAssistantSettings(config: BusinessConfig) {
  return {
    ai_booking_mode: config.settings.ai_booking_mode === "auto_confirm" ? "auto_book" : "pending_approval",
    same_day_enabled: config.settings.same_day_enabled,
    deposit_required: config.settings.deposit_required || false,
    deposit_amount: config.settings.deposit_amount || null,
    dropoff_instructions: config.settings.dropoff_instructions || null,
    voice_ai_enabled: true,
  };
}

// ── Cleanup ─────────────────────────────────────────────────────────

export async function cleanupTestTenant(ctx: TestContext): Promise<void> {
  const { tenantId } = ctx;

  // Clean up test records tracked during test
  for (const record of ctx.createdRecords.reverse()) {
    try {
      await dbDelete(record.table, { id: record.id });
    } catch {
      // Ignore cleanup errors
    }
  }

  // Clean up any test customers/bookings by name pattern
  const tables = ["bookings", "busy_blocks", "leads", "customers"];
  for (const table of tables) {
    try {
      // Delete all records for this test tenant created during tests
      const nameField = table === "leads" ? "full_name" : table === "customers" ? "name" : null;
      if (nameField) {
        await dbDelete(table, {
          tenant_id: tenantId,
          [nameField]: `ilike.${TEST_CUSTOMER_PREFIX}%`,
        });
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  // Clean up bookings and busy_blocks by tenant
  try {
    await dbDelete("busy_blocks", { tenant_id: tenantId, block_type: "eq.hold" });
    await dbDelete("bookings", { tenant_id: tenantId, notes: `ilike.%${TEST_CUSTOMER_PREFIX}%` });
  } catch {
    // Ignore
  }
}

export async function cleanupAllTestTenants(): Promise<void> {
  const testTenants = await dbQuery("tenants", {
    name: `ilike.${TEST_PREFIX}%`,
  });

  for (const tenant of testTenants) {
    const id = (tenant as any).id;
    console.log(`  Cleaning up test tenant: ${(tenant as any).name}`);

    // Delete in dependency order
    for (const table of ["busy_blocks", "bookings", "leads", "customers", "services", "staff_members", "assistant_settings"]) {
      try { await dbDelete(table, { tenant_id: id }); } catch { /* ignore */ }
    }
    try { await dbDelete("tenants", { id }); } catch { /* ignore */ }
  }
}
