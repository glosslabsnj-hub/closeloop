/**
 * Shared service resolver for availability tools.
 * Handles fuzzy matching of service names (& vs and, slashes, partial matches).
 */

interface ResolvedService {
  id: string;
  name: string;
  duration_minutes: number;
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
 * Returns the service with its duration, or null if not found.
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

  // Direct ID lookup
  if (opts.serviceId) {
    const { data: service } = await supabase
      .from("services")
      .select("id, name, duration_minutes")
      .eq("id", opts.serviceId)
      .eq("tenant_id", tenantId)
      .single();
    if (service) {
      return {
        service: { id: service.id, name: service.name, duration_minutes: service.duration_minutes },
        duration: service.duration_minutes || defaultDuration,
      };
    }
  }

  // Name-based lookup with fuzzy matching
  if (opts.serviceName) {
    // Get all active services for this tenant
    const { data: services } = await supabase
      .from("services")
      .select("id, name, duration_minutes")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (services && services.length > 0) {
      const normalizedSearch = normalizeServiceName(opts.serviceName);
      const searchWords = normalizedSearch.split(" ").filter(w => w.length > 2);

      // Strategy 1: Exact normalized match
      let match = services.find(
        (s: any) => normalizeServiceName(s.name) === normalizedSearch
      );

      // Strategy 2: Normalized contains
      if (!match) {
        match = services.find(
          (s: any) => normalizeServiceName(s.name).includes(normalizedSearch)
        );
      }

      // Strategy 3: Search term contained in service name
      if (!match) {
        match = services.find(
          (s: any) => normalizedSearch.includes(normalizeServiceName(s.name))
        );
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
          service: { id: match.id, name: match.name, duration_minutes: match.duration_minutes },
          duration: match.duration_minutes || defaultDuration,
        };
      }
    }
  }

  return { service: null, duration: defaultDuration };
}
