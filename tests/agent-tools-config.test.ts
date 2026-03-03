/**
 * Agent Tools Config Safety Tests
 *
 * @vitest-environment node
 *
 * Ensures critical invariants in the ElevenLabs agent tool configuration.
 * Reads the file as text since it uses Deno APIs incompatible with Vitest.
 *
 * IMPORTANT: If this test fails, a `tenant_id` parameter was set to
 * `required: false`. This MUST be `required: true` on all tools to
 * prevent silent booking/dispatch/order creation failures.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TOOLS_CONFIG_PATH = join(
  process.cwd(),
  "supabase/functions/_shared/agentToolsConfig.ts"
);

const source = readFileSync(TOOLS_CONFIG_PATH, "utf-8");
const lines = source.split("\n");

describe("Agent Tools Config: tenant_id invariants", () => {
  it("every tenant_id parameter must be required: true", () => {
    const violations: { line: number; context: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === 'name: "tenant_id",') {
        for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
          const fieldLine = lines[j].trim();
          if (fieldLine.startsWith("required:")) {
            if (fieldLine.includes("false")) {
              violations.push({
                line: j + 1,
                context: lines
                  .slice(i, j + 2)
                  .map((l) => l.trim())
                  .join(" | "),
              });
            }
            break;
          }
        }
      }
    }

    expect(
      violations,
      `tenant_id must be required:true everywhere. Violations at lines: ${violations.map((v) => v.line).join(", ")}`
    ).toEqual([]);
  });

  it("has at least 20 tenant_id parameters defined", () => {
    const matches = source.match(/name: "tenant_id"/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(20);
  });

  it("all tenant_id parameters use dynamic value {{tenant_id}}", () => {
    const missingDynamic: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'name: "tenant_id",') {
        let hasDynamic = false;
        for (let j = i + 1; j <= Math.min(i + 5, lines.length - 1); j++) {
          if (lines[j].includes("dynamicValue")) {
            if (lines[j].includes("{{tenant_id}}")) {
              hasDynamic = true;
            }
            break;
          }
          if (lines[j].trim() === "},") break;
        }
        if (!hasDynamic) {
          missingDynamic.push(i + 1);
        }
      }
    }

    expect(
      missingDynamic,
      `Lines missing dynamicValue: ${missingDynamic.join(", ")}`
    ).toEqual([]);
  });
});

describe("Deploy scripts: transfer_to_owner requires twilio_call_sid", () => {
  const deployScripts = [
    "scripts/deploy-service-agent.mjs",
    "scripts/deploy-dispatch-agent.mjs",
    "scripts/deploy-food-agent-tools.mjs",
    "scripts/deploy-medical-agent-tools.mjs",
    "scripts/deploy-sales-agent.mjs",
    "scripts/update-elevenlabs-agents.mjs",
  ];

  for (const scriptPath of deployScripts) {
    it(`${scriptPath} has twilio_call_sid required for transfer_to_owner`, () => {
      const scriptSource = readFileSync(join(process.cwd(), scriptPath), "utf-8");

      // Find transfer_to_owner tool definition and its required array
      const transferMatch = scriptSource.match(
        /["']transfer_to_owner["'][\s\S]*?\[([^\]]*)\]\s*\)/
      );
      expect(transferMatch).not.toBeNull();

      const requiredArray = transferMatch![1];
      expect(requiredArray).toContain("twilio_call_sid");
      expect(requiredArray).toContain("tenant_id");
    });
  }
});

describe("Agent Tools Config: mode coverage", () => {
  it("defines tools for all 6 business modes", () => {
    const modes = [
      "service",
      "dispatch",
      "food",
      "medical",
      "sales",
      "general",
    ];
    for (const mode of modes) {
      expect(source).toContain(mode);
    }
  });

  it("all tool URLs use BASE_URL (no hardcoded URLs)", () => {
    const urlMatches = source.match(/url: `\$\{BASE_URL\}\/[^`]+`/g) || [];
    expect(urlMatches.length).toBeGreaterThan(0);

    const hardcodedUrls = source.match(/url: ["']https?:\/\//g);
    expect(hardcodedUrls).toBeNull();
  });
});
