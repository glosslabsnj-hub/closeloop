/**
 * Shared service resolver for availability tools.
 * Handles fuzzy matching of service names (& vs and, slashes, partial matches).
 * Supports add-on/secondary service detection.
 */

interface ResolvedService {
  id: string;
  name: string;
  duration_minutes: number;
  is_addon: boolean;
  service_category: string | null;
}

/**
 * Normalize a service name for comparison:
 * - lowercase
 * - replace & with "and"
 * - remove special chars (/, -, etc.)
 * - collapse whitespace
 */
function normalizeServiceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\/\-_.,!?()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve a service by name or ID, with fuzzy matching.
 * Returns the service with its duration and add-on status.
 *
 * When multiple services match via fuzzy search, prefers:
 * 1. Primary services over add-ons
 * 2. Shorter names (more specific matches) over longer names
 */
export async function resolveService(
  supabase: any,
  tenantId: string,
  opts: {
    serviceId?: string;
    serviceName?: string;
    durationOverride?: number;
  }
): Promise<{ service: ResolvedService | null; duration: number }> {
  const defaultDuration = opts.durationOverride || 60;

  const toResolved = (s: any): ResolvedService => ({
    id: s.id,
    name: s.name,
    duration_minutes: s.duration_minutes,
    is_addon: s.service_type === "secondary",
    service_category: s.service_category || null,
  });

  // Direct ID lookup
  if (opts.serviceId) {
    const { data: service } = await supabase
      .from("services")
      .select("id, name, duration_minutes, service_type, service_category")
      .eq("id", opts.serviceId)
      .eq("tenant_id", tenantId)
      .single();
    if (service) {
      return {
        service: toResolved(service),
        duration: service.duration_minutes || defaultDuration,
      };
    }
  }

  // Name-based lookup with fuzzy matching
  if (opts.serviceName) {
    // Get all active services for this tenant
    const { data: services } = await supabase
      .from("services")
      .select("id, name, duration_minutes, service_type, service_category")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (services && services.length > 0) {
      const normalizedSearch = normalizeServiceName(opts.serviceName);
      const searchWords = normalizedSearch.split(" ").filter(w => w.length > 2);

      // Strategy 1: Exact normalized match
      let match = services.find(
        (s: any) => normalizeServiceName(s.name) === normalizedSearch
      );

      // Strategy 2: Normalized contains — prefer shortest match (most specific)
      if (!match) {
        const candidates = services.filter(
          (s: any) => normalizeServiceName(s.name).includes(normalizedSearch)
        );
        if (candidates.length > 0) {
          // Prefer primary services, then shortest name
          candidates.sort((a: any, b: any) => {
            const aAddon = a.service_type === "secondary" ? 1 : 0;
            const bAddon = b.service_type === "secondary" ? 1 : 0;
            if (aAddon !== bAddon) return aAddon - bAddon;
            return a.name.length - b.name.length;
          });
          match = candidates[0];
        }
      }

      // Strategy 3: Search term contained in service name
      if (!match) {
        const candidates = services.filter(
          (s: any) => normalizedSearch.includes(normalizeServiceName(s.name))
        );
        if (candidates.length > 0) {
          candidates.sort((a: any, b: any) => {
            const aAddon = a.service_type === "secondary" ? 1 : 0;
            const bAddon = b.service_type === "secondary" ? 1 : 0;
            if (aAddon !== bAddon) return aAddon - bAddon;
            return b.name.length - a.name.length; // prefer longer (more specific) match
          });
          match = candidates[0];
        }
      }

      // Strategy 4: All significant words match
      if (!match && searchWords.length > 1) {
        match = services.find((s: any) => {
          const normalized = normalizeServiceName(s.name);
          return searchWords.every(w => normalized.includes(w));
        });
      }

      // Strategy 5: Most words match (best overlap)
      if (!match && searchWords.length > 0) {
        let bestMatch: any = null;
        let bestScore = 0;
        for (const s of services) {
          const normalized = normalizeServiceName(s.name);
          const score = searchWords.filter(w => normalized.includes(w)).length;
          if (score > bestScore && score >= Math.ceil(searchWords.length / 2)) {
            bestScore = score;
            bestMatch = s;
          }
        }
        match = bestMatch;
      }

      if (match) {
        return {
          service: toResolved(match),
          duration: match.duration_minutes || defaultDuration,
        };
      }
    }
  }

  return { service: null, duration: defaultDuration };
}
