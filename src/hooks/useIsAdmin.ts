import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

async function checkAdminRole(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  return !!data;
}

export function useIsAdmin() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user_is_admin", user?.id],
    queryFn: () => checkAdminRole(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos no cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return { 
    isAdmin: query.data ?? false, 
    isLoading: query.isLoading 
  };
}
