/**
 * useMapboxToken — Fetches the Mapbox access token from the server.
 * Token is cached and only fetched once per session.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMapboxToken() {
  const { data: token, isLoading, error } = useQuery({
    queryKey: ["mapbox-token"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mapbox-token");
      if (error) throw new Error(error.message);
      if (!data?.token) throw new Error("No token returned");
      return data.token as string;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });

  return { token: token ?? null, isLoading, error };
}
