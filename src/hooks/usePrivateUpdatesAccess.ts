import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePrivateUpdatesAccess() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["private-mother-updates-access", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("can_view_atualizacoes_maes");
      if (error) throw error;
      return data === true;
    },
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });

  return {
    canViewUpdates: query.data ?? false,
    isLoading: query.isLoading,
  };
}
