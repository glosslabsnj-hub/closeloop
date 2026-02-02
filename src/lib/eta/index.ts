/**
 * ETA Module
 *
 * Provides ETA estimation capabilities for CloseLoop.
 * Step 1: Baseline estimation with safe ranges
 * Step 2: Mapbox provider integration with caching
 */

// Step 1: Baseline estimator
export {
  estimateEta,
  formatSpokenEta,
  normalizeJobType,
  DEFAULT_ETA_POLICY,
  type EtaPolicy,
  type EtaRange,
  type EtaInput,
  type EtaResult,
} from "./estimateEta";

// Step 2: Provider-enhanced estimator
export {
  estimateEtaWithProvider,
  isVagueAddress,
  computeEtaFromDuration,
  type EtaPolicyExtended,
  type EtaInputExtended,
  type EtaResultExtended,
  type EtaStatus,
  type RouteResult,
} from "./estimateEtaWithProvider";
