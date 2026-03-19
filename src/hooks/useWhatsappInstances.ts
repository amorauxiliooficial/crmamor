import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsappInstance {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  qr_code: string | null;
  evolution_instance_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useWhatsappInstances() {
  const queryClient = useQueryClient();

  const query = useQuery<WhatsappInstance[]>({
    queryKey: ["whatsapp_instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WhatsappInstance[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("whatsapp_instances_hook")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_instances" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}
