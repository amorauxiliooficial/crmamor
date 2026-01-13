import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Banco } from "@/types/banco";

async function fetchBancos(): Promise<Banco[]> {
  const { data, error } = await supabase
    .from("bancos")
    .select("*")
    .order("nome", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export function useBancos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bancos"],
    queryFn: fetchBancos,
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["bancos"] });
  };

  return {
    bancos: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch,
  };
}
