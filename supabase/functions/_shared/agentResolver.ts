/**
 * Resolves the correct ElevenLabs agent ID based on business mode.
 * Falls back to global ELEVENLABS_AGENT_ID if mode-specific is not set.
 * 
 * Environment variables expected:
 * - ELEVENLABS_AGENT_ID_SERVICE  (service/booking businesses)
 * - ELEVENLABS_AGENT_ID_DISPATCH (dispatch/on-demand businesses)
 * - ELEVENLABS_AGENT_ID_FOOD     (food/restaurant businesses)
 * - ELEVENLABS_AGENT_ID_MEDICAL  (medical/healthcare businesses)
 * - ELEVENLABS_AGENT_ID_GENERAL  (general businesses)
 * - ELEVENLABS_AGENT_ID          (fallback)
 */

export type BusinessMode = "service" | "dispatch" | "food" | "medical" | "general";

const MODE_TO_ENV_KEY: Record<BusinessMode, string> = {
  service: "ELEVENLABS_AGENT_ID_SERVICE",
  dispatch: "ELEVENLABS_AGENT_ID_DISPATCH",
  food: "ELEVENLABS_AGENT_ID_FOOD",
  medical: "ELEVENLABS_AGENT_ID_MEDICAL",
  general: "ELEVENLABS_AGENT_ID_GENERAL",
};

export interface AgentResolution {
  agentId: string | null;
  source: string; // e.g., "mode:service", "fallback:global", "none"
  envKey: string; // the env key used
}

/**
 * Resolves the ElevenLabs agent ID for a given business mode.
 * 
 * Resolution order:
 * 1. Mode-specific agent (ELEVENLABS_AGENT_ID_<MODE>)
 * 2. Global fallback (ELEVENLABS_AGENT_ID)
 * 3. null (no agent configured)
 */
export function getAgentIdForMode(
  businessMode: string | null | undefined
): AgentResolution {
  // Normalize mode - default to "general" if not provided
  const normalizedMode = (businessMode || "general").toLowerCase() as BusinessMode;
  
  // Validate mode - if invalid, use general
  const validModes: BusinessMode[] = ["service", "dispatch", "food", "medical", "general"];
  const mode = validModes.includes(normalizedMode) ? normalizedMode : "general";
  
  // Try mode-specific agent first
  const modeEnvKey = MODE_TO_ENV_KEY[mode];
  const modeAgentId = Deno.env.get(modeEnvKey);
  
  if (modeAgentId) {
    console.log(`[agentResolver] Using mode-specific agent for ${mode}: ${modeAgentId.slice(0, 12)}...`);
    return { 
      agentId: modeAgentId, 
      source: `mode:${mode}`,
      envKey: modeEnvKey
    };
  }
  
  // Fallback to global agent
  const globalAgentId = Deno.env.get("ELEVENLABS_AGENT_ID");
  if (globalAgentId) {
    console.log(`[agentResolver] Falling back to global agent for ${mode}: ${globalAgentId.slice(0, 12)}...`);
    return { 
      agentId: globalAgentId, 
      source: "fallback:global",
      envKey: "ELEVENLABS_AGENT_ID"
    };
  }
  
  console.warn(`[agentResolver] No agent configured for mode ${mode}`);
  return { 
    agentId: null, 
    source: "none",
    envKey: modeEnvKey
  };
}

/**
 * Validates that all required agent IDs are configured.
 * Returns a list of missing configurations.
 */
export function validateAgentConfiguration(): { 
  isComplete: boolean; 
  configured: string[]; 
  missing: string[]; 
} {
  const configured: string[] = [];
  const missing: string[] = [];
  
  for (const [mode, envKey] of Object.entries(MODE_TO_ENV_KEY)) {
    if (Deno.env.get(envKey)) {
      configured.push(mode);
    } else {
      missing.push(mode);
    }
  }
  
  // Check global fallback
  if (Deno.env.get("ELEVENLABS_AGENT_ID")) {
    configured.push("global");
  } else {
    missing.push("global");
  }
  
  return {
    isComplete: missing.length === 0,
    configured,
    missing
  };
}
