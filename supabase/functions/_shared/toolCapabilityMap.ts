/**
 * TOOL-CAPABILITY MAPPING
 * Maps each tool to the capabilities that enable it.
 * Used for dynamic tool injection into agents.
 */

export interface ToolCapabilityMapping {
  toolName: string;
  requiredCapabilities: string[]; // ANY of these enables the tool
  conflictsWith?: string[]; // If any of these are enabled, exclude tool
  priority: number; // Higher = more important when hitting tool limits
}

export const TOOL_CAPABILITY_MAP: ToolCapabilityMapping[] = [
  // ===== SCHEDULING TOOLS =====
  {
    toolName: "check_availability",
    requiredCapabilities: ["booking", "calendar_sync", "reservations", "scheduled_dispatch"],
    priority: 90,
  },
  {
    toolName: "suggest_availability",
    requiredCapabilities: ["booking", "calendar_sync", "reservations", "scheduled_dispatch"],
    priority: 90,
  },
  {
    toolName: "create_booking",
    requiredCapabilities: ["booking", "scheduled_dispatch"],
    priority: 95,
  },
  {
    toolName: "cancel_booking",
    requiredCapabilities: ["booking"],
    priority: 70,
  },
  {
    toolName: "add_to_waitlist",
    requiredCapabilities: ["booking", "reservations"],
    priority: 60,
  },
  
  // ===== DISPATCH TOOLS =====
  {
    toolName: "check_service_area",
    requiredCapabilities: ["dispatch_queue", "mobile_service", "delivery", "emergency_dispatch"],
    priority: 95,
  },
  {
    toolName: "create_dispatch_job",
    requiredCapabilities: ["dispatch_queue", "emergency_dispatch"],
    priority: 100,
  },
  {
    toolName: "lookup_dispatch_status",
    requiredCapabilities: ["dispatch_queue"],
    priority: 80,
  },
  
  // ===== UNIVERSAL TOOLS =====
  {
    toolName: "create_callback",
    requiredCapabilities: ["*"], // Always available
    priority: 50,
  },
];

/**
 * Get all tool names that should be enabled for a given capability set
 */
export function getToolsForCapabilities(
  capabilities: Record<string, boolean>
): string[] {
  const enabledTools = new Set<string>();
  
  for (const mapping of TOOL_CAPABILITY_MAP) {
    // Check if any required capability is enabled
    const hasRequiredCap = mapping.requiredCapabilities.some(cap => 
      cap === "*" || capabilities[cap] === true
    );
    
    // Check for conflicts
    const hasConflict = mapping.conflictsWith?.some(cap => 
      capabilities[cap] === true
    ) ?? false;
    
    if (hasRequiredCap && !hasConflict) {
      enabledTools.add(mapping.toolName);
    }
  }
  
  return Array.from(enabledTools);
}

/**
 * Check if a specific tool should be enabled for capabilities
 */
export function isToolEnabledForCapabilities(
  toolName: string,
  capabilities: Record<string, boolean>
): boolean {
  const mapping = TOOL_CAPABILITY_MAP.find(m => m.toolName === toolName);
  if (!mapping) return false;
  
  const hasRequiredCap = mapping.requiredCapabilities.some(cap => 
    cap === "*" || capabilities[cap] === true
  );
  
  const hasConflict = mapping.conflictsWith?.some(cap => 
    capabilities[cap] === true
  ) ?? false;
  
  return hasRequiredCap && !hasConflict;
}
