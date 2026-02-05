/**
 * get-agent-tools-config: Returns the ElevenLabs agent tools configuration
 * for a given business mode.
 *
 * Used by:
 * - Dashboard to display available tools per mode
 * - External systems to configure ElevenLabs agents
 * - Documentation generation
 *
 * Query parameters:
 * - mode: business mode (service, dispatch, food, medical, general)
 * - format: output format (default, elevenlabs)
 * - summary: if "true", return summary of all modes
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getAgentToolsConfig,
  getElevenLabsToolsForMode,
  getAgentsSummary,
  AGENT_TOOLS_REGISTRY,
  type BusinessMode,
} from "../_shared/agentToolsConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_MODES: BusinessMode[] = ["service", "dispatch", "food", "medical", "general"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") as BusinessMode | null;
    const format = url.searchParams.get("format") || "default";
    const summaryOnly = url.searchParams.get("summary") === "true";

    // Return summary of all modes
    if (summaryOnly) {
      const summary = getAgentsSummary();
      return new Response(
        JSON.stringify({
          success: true,
          agents: summary,
          available_modes: VALID_MODES,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate mode
    if (!mode || !VALID_MODES.includes(mode)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid or missing mode. Must be one of: ${VALID_MODES.join(", ")}`,
          available_modes: VALID_MODES,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get configuration for mode
    const config = getAgentToolsConfig(mode);

    // Return in requested format
    if (format === "elevenlabs") {
      // Return tools in ElevenLabs API format
      const tools = getElevenLabsToolsForMode(mode);
      return new Response(
        JSON.stringify({
          success: true,
          mode,
          agent_name: config.agentName,
          industries: config.industries,
          tool_count: config.toolCount,
          tools,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Default format - return full configuration
    return new Response(
      JSON.stringify({
        success: true,
        config,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[get-agent-tools-config] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
