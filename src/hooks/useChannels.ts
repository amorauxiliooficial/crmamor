import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Channel {
  id: string;
  code: string;
  type: string;
  display_name: string;
  phone_e164: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Channel[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Channel> }) => {
      const { error } = await supabase
        .from("channels")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}
