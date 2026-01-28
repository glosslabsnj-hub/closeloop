import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, TenantUser, UserRoleType, Subscription, AssistantSettings } from "@/types/database";

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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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

  const fetchTenantData = async (userId: string) => {
    try {
      // Fetch user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleData?.role === "super_admin") {
        setIsSuperAdmin(true);
        setUserRole("super_admin");
        return;
      }

      // Fetch tenant user
      const { data: tenantUserData } = await supabase
        .from("tenant_users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (tenantUserData) {
        setTenantUser(tenantUserData);
        setUserRole(tenantUserData.role);

        // Fetch tenant
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantUserData.tenant_id)
          .single();

        if (tenantData) {
          setTenant(tenantData as Tenant);

          // Fetch subscription
          const { data: subData } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("tenant_id", tenantUserData.tenant_id)
            .maybeSingle();
          
          setSubscription(subData);

          // Fetch assistant settings
          const { data: settingsData } = await supabase
            .from("assistant_settings")
            .select("*")
            .eq("tenant_id", tenantUserData.tenant_id)
            .maybeSingle();
          
          setAssistantSettings(settingsData);
        }
      }
    } catch (error) {
      console.error("Error fetching tenant data:", error);
    }
  };

  const refreshTenant = async () => {
    if (user) {
      await fetchTenantData(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to defer data fetching
          setTimeout(() => fetchTenantData(session.user.id), 0);
        } else {
          setTenant(null);
          setTenantUser(null);
          setUserRole(null);
          setIsSuperAdmin(false);
          setSubscription(null);
          setAssistantSettings(null);
        }

        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchTenantData(session.user.id);
      }

      setLoading(false);
    });

    return () => {
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

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        tenant,
        tenantUser,
        userRole,
        isSuperAdmin,
        subscription,
        assistantSettings,
        hasActiveSubscription,
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
