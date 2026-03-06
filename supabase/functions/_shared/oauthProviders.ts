/**
 * OAuth Provider Configuration Registry
 *
 * Code-based config for all supported OAuth providers.
 * Each provider specifies auth/token URLs, scopes, and env var names
 * for client credentials (stored as Supabase secrets).
 */

export interface OAuthProviderConfig {
  id: string;
  name: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Env var name for client ID */
  clientIdEnv: string;
  /** Env var name for client secret */
  clientSecretEnv: string;
  /** Env var name for redirect URI (optional — falls back to computed) */
  redirectUriEnv?: string;
  /** Extra params to add to the auth URL */
  extraAuthParams?: Record<string, string>;
  /** Extra params to add to the token exchange */
  extraTokenParams?: Record<string, string>;
  /** Where to store: 'integrations' table (default) or 'calendar_connections' */
  storageTarget: "integrations" | "calendar_connections";
  /** Display name for success page */
  displayName: string;
  /** Post-connect: fetch user/account info? */
  fetchAccountInfo?: (accessToken: string) => Promise<Record<string, unknown>>;
}

// ─── Provider Definitions ───────────────────────────────────────────────────

const googleCalendar: OAuthProviderConfig = {
  id: "google_calendar",
  name: "Google Calendar",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.freebusy",
  ],
  clientIdEnv: "GOOGLE_CALENDAR_CLIENT_ID",
  clientSecretEnv: "GOOGLE_CALENDAR_CLIENT_SECRET",
  redirectUriEnv: "GOOGLE_CALENDAR_REDIRECT_URI",
  extraAuthParams: { access_type: "offline", prompt: "consent" },
  storageTarget: "calendar_connections",
  displayName: "Google Calendar",
};

const microsoftCalendar: OAuthProviderConfig = {
  id: "microsoft_calendar",
  name: "Microsoft Outlook",
  authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  scopes: ["openid", "offline_access", "Calendars.ReadWrite", "User.Read"],
  clientIdEnv: "MS_CALENDAR_CLIENT_ID",
  clientSecretEnv: "MS_CALENDAR_CLIENT_SECRET",
  redirectUriEnv: "MS_CALENDAR_REDIRECT_URI",
  storageTarget: "calendar_connections",
  displayName: "Microsoft Outlook",
};

const quickbooks: OAuthProviderConfig = {
  id: "quickbooks",
  name: "QuickBooks Online",
  authUrl: "https://appcenter.intuit.com/connect/oauth2",
  tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  scopes: ["com.intuit.quickbooks.accounting"],
  clientIdEnv: "QUICKBOOKS_CLIENT_ID",
  clientSecretEnv: "QUICKBOOKS_CLIENT_SECRET",
  extraAuthParams: { response_type: "code" },
  storageTarget: "integrations",
  displayName: "QuickBooks Online",
};

const hubspot: OAuthProviderConfig = {
  id: "hubspot",
  name: "HubSpot",
  authUrl: "https://app.hubspot.com/oauth/authorize",
  tokenUrl: "https://api.hubapi.com/oauth/v1/token",
  scopes: [
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
    "crm.objects.deals.read",
    "crm.objects.deals.write",
  ],
  clientIdEnv: "HUBSPOT_CLIENT_ID",
  clientSecretEnv: "HUBSPOT_CLIENT_SECRET",
  storageTarget: "integrations",
  displayName: "HubSpot CRM",
};

const squarePos: OAuthProviderConfig = {
  id: "square_pos",
  name: "Square",
  authUrl: "https://connect.squareup.com/oauth2/authorize",
  tokenUrl: "https://connect.squareup.com/oauth2/token",
  scopes: [
    "ORDERS_READ",
    "ORDERS_WRITE",
    "ITEMS_READ",
    "PAYMENTS_READ",
    "MERCHANT_PROFILE_READ",
    "APPOINTMENTS_READ",
    "APPOINTMENTS_WRITE",
    "APPOINTMENTS_ALL_READ",
    "APPOINTMENTS_ALL_WRITE",
    "CUSTOMERS_READ",
    "CUSTOMERS_WRITE",
  ],
  clientIdEnv: "SQUARE_CLIENT_ID",
  clientSecretEnv: "SQUARE_CLIENT_SECRET",
  extraAuthParams: { session: "false" },
  storageTarget: "integrations",
  displayName: "Square",
};

const stripeConnect: OAuthProviderConfig = {
  id: "stripe_connect",
  name: "Stripe",
  authUrl: "https://connect.stripe.com/oauth/authorize",
  tokenUrl: "https://connect.stripe.com/oauth/token",
  scopes: ["read_write"],
  clientIdEnv: "STRIPE_CONNECT_CLIENT_ID",
  clientSecretEnv: "STRIPE_SECRET_KEY",
  extraAuthParams: { response_type: "code" },
  extraTokenParams: { grant_type: "authorization_code" },
  storageTarget: "integrations",
  displayName: "Stripe",
};

const jobber: OAuthProviderConfig = {
  id: "jobber",
  name: "Jobber",
  authUrl: "https://api.getjobber.com/api/oauth/authorize",
  tokenUrl: "https://api.getjobber.com/api/oauth/token",
  scopes: ["read_clients", "write_clients", "read_jobs", "write_jobs", "read_schedule"],
  clientIdEnv: "JOBBER_CLIENT_ID",
  clientSecretEnv: "JOBBER_CLIENT_SECRET",
  storageTarget: "integrations",
  displayName: "Jobber",
};

const housecallPro: OAuthProviderConfig = {
  id: "housecallpro",
  name: "Housecall Pro",
  authUrl: "https://api.housecallpro.com/oauth/authorize",
  tokenUrl: "https://api.housecallpro.com/oauth/token",
  scopes: ["read", "write"],
  clientIdEnv: "HOUSECALLPRO_CLIENT_ID",
  clientSecretEnv: "HOUSECALLPRO_CLIENT_SECRET",
  storageTarget: "integrations",
  displayName: "Housecall Pro",
};

// ─── Registry ───────────────────────────────────────────────────────────────

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google_calendar: googleCalendar,
  microsoft_calendar: microsoftCalendar,
  quickbooks: quickbooks,
  hubspot: hubspot,
  square_pos: squarePos,
  stripe_connect: stripeConnect,
  jobber: jobber,
  housecallpro: housecallPro,
};

/**
 * Get provider config by ID. Throws if not found.
 */
export function getOAuthProvider(providerId: string): OAuthProviderConfig {
  const provider = OAUTH_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${providerId}`);
  }
  return provider;
}

/**
 * List all supported OAuth provider IDs.
 */
export function listOAuthProviderIds(): string[] {
  return Object.keys(OAUTH_PROVIDERS);
}
