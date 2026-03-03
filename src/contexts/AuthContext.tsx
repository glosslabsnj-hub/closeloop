import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, TenantUser, UserRoleType, Subscription, AssistantSettings } from "@/types/database";
import { toast } from "sonner";

interface AdminSettings {
  admin_active_tenant_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  tenant: Tenant | null;
  tenantUser: TenantUser | null;
  userRole: UserRoleType | null;
  isSuperAdmin: boolean;
  subscription: Subscription | null;
  assistantSettings: AssistantSettings | null;
  hasActiveSubscription: boolean;
  // Admin tenant switching
  effectiveTenantId: string | null;
  effectiveTenant: Tenant | null;
  setActiveTenantId: (tenantId: string) => Promise<void>;
  // Methods
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, businessName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshTenant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [userRole, setUserRole] = useState<UserRoleType | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [assistantSettings, setAssistantSettings] = useState<AssistantSettings | null>(null);
  
  // Admin-specific state for tenant switching
  // Restore from localStorage on mount to prevent flash of wrong tenant on page reload
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(() => {
    try {
      const cached = localStorage.getItem("flux_admin_active_tenant_id");
      return cached ? { admin_active_tenant_id: cached } : null;
    } catch { return null; }
  });
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);

  // Guard against concurrent fetchTenantData calls — stores the in-flight promise
  // so concurrent callers can await the same fetch instead of returning early
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  // Computed: The effective tenant ID that should be used for all operations
  // During initialization (loading=true), isSuperAdmin hasn't been determined yet
  // but adminSettings may already be restored from localStorage. Use it as a
  // synchronous bridge to prevent effectiveTenantId from briefly being null.
  const effectiveTenantId = (isSuperAdmin || (loading && adminSettings?.admin_active_tenant_id))
    && adminSettings?.admin_active_tenant_id
    ? adminSettings.admin_active_tenant_id
    : tenant?.id || null;

  // Computed: The effective tenant object
  // For super admins, this returns the actively selected test tenant
  const effectiveTenant = isSuperAdmin && activeTenant
    ? activeTenant
    : tenant;

  // Fetch admin settings (admin_active_tenant_id) for super admins
  // If no settings exist, auto-create with current tenant as default
  // skipTenantFetch: when true, only sync adminSettings state — tenant data was already pre-fetched
  const fetchAdminSettings = useCallback(async (userId: string, defaultTenantId: string | null, skipTenantFetch = false) => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("admin_active_tenant_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Failed to fetch admin settings:", error);
        return;
      }

      // If no admin_settings row exists and we have a default tenant, auto-create it
      if (!data && defaultTenantId) {
        console.log("[AuthContext] Auto-creating admin_settings for super admin");
        const { error: upsertError } = await supabase
          .from("admin_settings")
          .upsert({
            user_id: userId,
            admin_active_tenant_id: defaultTenantId,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });

        if (upsertError) {
          console.warn("Failed to auto-create admin settings:", upsertError);
        } else {
          setAdminSettings({ admin_active_tenant_id: defaultTenantId });
          // Persist to localStorage so page reload has synchronous backup
          try { if (defaultTenantId) localStorage.setItem("flux_admin_active_tenant_id", defaultTenantId); } catch {}
          // The default tenant is already set as `tenant`, so set it as active too
          return;
        }
      }

      setAdminSettings(data);
      // Persist to localStorage for instant restore on page reload
      try {
        if (data?.admin_active_tenant_id) {
          localStorage.setItem("flux_admin_active_tenant_id", data.admin_active_tenant_id);
        }
      } catch {}

      // If admin has an active tenant selected, fetch that tenant's data + subscription
      // Skip if caller already pre-fetched the data (avoids redundant queries + renders)
      if (data?.admin_active_tenant_id && !skipTenantFetch) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", data.admin_active_tenant_id)
          .single();

        if (tenantData) {
          setActiveTenant(tenantData as Tenant);

          // Fetch subscription for the effective tenant (not the admin's own)
          const { data: subData } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("tenant_id", data.admin_active_tenant_id)
            .maybeSingle();
          setSubscription(subData);

          const { data: settingsData } = await supabase
            .from("assistant_settings")
            .select("*")
            .eq("tenant_id", data.admin_active_tenant_id)
            .maybeSingle();
          setAssistantSettings(settingsData);
        }
      }
    } catch (error) {
      console.error("Error fetching admin settings:", error);
    }
  }, []);

  // Set the active tenant for admin testing
  const setActiveTenantId = useCallback(async (tenantId: string) => {
    if (!user || !isSuperAdmin) {
      console.warn("setActiveTenantId called without super admin privileges");
      return;
    }

    try {
      // Upsert admin settings
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          user_id: user.id,
          admin_active_tenant_id: tenantId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      // Update local state + localStorage immediately
      setAdminSettings(prev => ({ ...prev, admin_active_tenant_id: tenantId }));
      try { localStorage.setItem("flux_admin_active_tenant_id", tenantId); } catch {};

      // Fetch tenant, subscription, and assistant settings in parallel
      const [tenantRes, subRes, settingsRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
        supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("assistant_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
      ]);

      if (tenantRes.data) {
        setActiveTenant(tenantRes.data as Tenant);
        toast.success(`Switched to ${tenantRes.data.name}`);
      }

      // Always update subscription and settings state (even if null)
      setSubscription(subRes.data);
      setAssistantSettings(settingsRes.data);

      console.log("[AuthContext] Tenant switch complete:", {
        tenantId,
        subscription: subRes.data?.status,
        hasSettings: !!settingsRes.data,
      });
    } catch (error: any) {
      console.error("Failed to set active tenant:", error);
      toast.error("Failed to switch tenant");
    }
  }, [user, isSuperAdmin]);

  const fetchTenantData = (userId: string): Promise<void> => {
    // If a fetch is already in flight, return the same promise so callers
    // (especially initializeAuth) await the real result instead of skipping
    if (fetchPromiseRef.current) return fetchPromiseRef.current;

    const promise = (async () => {
    try {
      // Fetch user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      const isAdmin = roleData?.role === "super_admin";
      if (isAdmin) {
        setIsSuperAdmin(true);
        setUserRole("super_admin");
      }

      // Fetch tenant user(s) - super admins may have multiple
      // Use .limit(1) for non-admins to avoid ambiguity, but fetch first for admins
      const { data: tenantUserList } = await supabase
        .from("tenant_users")
        .select("*")
        .eq("user_id", userId)
        .limit(10); // Support multiple for super admins

      const tenantUserData = tenantUserList?.[0] || null;

      if (tenantUserData) {
        setTenantUser(tenantUserData);
        if (!isAdmin) {
          setUserRole(tenantUserData.role);
        }

        // Fetch tenant
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantUserData.tenant_id)
          .single();

        if (tenantData) {
          // For super admins with a cached tenant switch, fetch the CACHED tenant's
          // subscription/settings BEFORE calling setTenant to prevent an intermediate
          // render where effectiveTenant briefly shows the wrong tenant (the default
          // tenant_users[0] instead of the admin's cached selection).
          let cachedTenantId: string | null = null;
          if (isAdmin) {
            try { cachedTenantId = localStorage.getItem("flux_admin_active_tenant_id"); } catch {}
          }

          if (isAdmin && cachedTenantId && cachedTenantId !== tenantData.id) {
            // Pre-fetch the cached admin tenant's data BEFORE setting any state
            const [cachedTenantRes, cachedSubRes, cachedSettingsRes] = await Promise.all([
              supabase.from("tenants").select("*").eq("id", cachedTenantId).single(),
              supabase.from("subscriptions").select("*").eq("tenant_id", cachedTenantId).maybeSingle(),
              supabase.from("assistant_settings").select("*").eq("tenant_id", cachedTenantId).maybeSingle(),
            ]);

            // Set default tenant AND cached tenant in the same synchronous block
            // so React 18 batches them into a single render — no intermediate flash
            setTenant(tenantData as Tenant);
            if (cachedTenantRes.data) {
              setActiveTenant(cachedTenantRes.data as Tenant);
              setSubscription(cachedSubRes.data);
              setAssistantSettings(cachedSettingsRes.data);
            } else {
              // Cached tenant no longer exists — fall back to default
              try { localStorage.removeItem("flux_admin_active_tenant_id"); } catch {}
              setAdminSettings(null);
              const [defaultSubRes, defaultSettingsRes] = await Promise.all([
                supabase.from("subscriptions").select("*").eq("tenant_id", tenantUserData.tenant_id).maybeSingle(),
                supabase.from("assistant_settings").select("*").eq("tenant_id", tenantUserData.tenant_id).maybeSingle(),
              ]);
              setSubscription(defaultSubRes.data);
              setAssistantSettings(defaultSettingsRes.data);
            }
            // skipTenantFetch=true: tenant data already pre-fetched above, only sync adminSettings
            await fetchAdminSettings(userId, tenantData.id, true);
          } else {
            // Normal user or admin viewing their own default tenant
            // Set tenant first, then fetch subscription/settings
            setTenant(tenantData as Tenant);

            const [subRes, settingsRes] = await Promise.all([
              supabase.from("subscriptions").select("*").eq("tenant_id", tenantUserData.tenant_id).maybeSingle(),
              supabase.from("assistant_settings").select("*").eq("tenant_id", tenantUserData.tenant_id).maybeSingle(),
            ]);
            setSubscription(subRes.data);
            setAssistantSettings(settingsRes.data);

            if (isAdmin) {
              await fetchAdminSettings(userId, tenantData.id);
            }
          }
        }
      } else if (isAdmin) {
        // Super admin with no tenant_users - still fetch admin settings
        await fetchAdminSettings(userId, null);
      }
    } catch (error) {
      console.error("Error fetching tenant data:", error);
    } finally {
      fetchPromiseRef.current = null;
    }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  };

  const refreshTenant = async () => {
    if (user) {
      await fetchTenantData(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Listener for ONGOING auth changes (does NOT control isLoading)
    let hadSession = false;
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        // Detect session expiry: had a session before, now it's gone
        if (hadSession && !session && event === "SIGNED_OUT") {
          toast.info("Your session has expired. Please sign in again.");
        }
        if (session) hadSession = true;

        setSession(session);
        setUser(session?.user ?? null);

        // Fire and forget - don't await, don't set loading
        // Only re-fetch on actual auth events (sign-in, token refresh), not on
        // INITIAL_SESSION which is redundant with initializeAuth above.
        if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          fetchTenantData(session.user.id);
        } else if (!session) {
          setTenant(null);
          setTenantUser(null);
          setUserRole(null);
          setIsSuperAdmin(false);
          setSubscription(null);
          setAssistantSettings(null);
        }
      }
    );

    // INITIAL load (controls isLoading)
    const initializeAuth = async () => {
      try {
        let { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        // Defensive retry: if getSession returned null but localStorage has a session
        // token, Supabase may not have finished its internal async recovery. Wait briefly
        // and try once more to avoid false redirects to /login on full page reload.
        if (!session) {
          const hasStoredSession = Object.keys(localStorage).some(
            k => k.startsWith("sb-") && k.endsWith("-auth-token")
          );
          if (hasStoredSession) {
            console.warn("[AuthContext] getSession() returned null but localStorage has session token — retrying");
            await new Promise(r => setTimeout(r, 300));
            if (!isMounted) return;
            const retry = await supabase.auth.getSession();
            session = retry.data.session;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        // Fetch tenant data BEFORE setting loading false
        if (session?.user) {
          await fetchTenantData(session.user.id);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      authSub.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, businessName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: businessName ? { businessName } : undefined,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try { localStorage.removeItem("flux_admin_active_tenant_id"); } catch {};
    try { localStorage.removeItem("flux_admin_active_mode"); } catch {};
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Super admins ALWAYS bypass subscription gating - this is critical for admin testing
  // Check isSuperAdmin first to prevent any race conditions during initialization
  const hasActiveSubscription = React.useMemo(() => {
    if (isSuperAdmin) return true;
    if (subscription?.status === "past_due") return false;
    return subscription?.status === "active" || subscription?.status === "trialing";
  }, [isSuperAdmin, subscription?.status]);

  // For super admins, expose the *effective* tenant as `tenant` so the whole app updates
  // when switching the active test tenant.
  const tenantForApp = effectiveTenant;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        tenant: tenantForApp,
        tenantUser,
        userRole,
        isSuperAdmin,
        subscription,
        assistantSettings,
        hasActiveSubscription,
        effectiveTenantId,
        effectiveTenant: tenantForApp,
        setActiveTenantId,
        signIn,
        signUp,
        signOut,
        refreshTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
