import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneToE164BR } from "@/lib/phoneUtils";

export interface MotherContact {
  id: string;
  mae_id: string;
  contact_type: "whatsapp" | "phone" | "email";
  value_e164: string;
  wa_id: string | null;
  is_primary: boolean;
  active: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMotherContacts(maeId: string | null) {
  return useQuery({
    queryKey: ["mother_contacts", maeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mother_contacts")
        .select("*")
        .eq("mae_id", maeId!)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MotherContact[];
    },
    enabled: !!maeId,
  });
}

export function useMotherContactActions() {
  const qc = useQueryClient();

  const addContact = useMutation({
    mutationFn: async (params: {
      mae_id: string;
      contact_type: "whatsapp" | "phone" | "email";
      value: string;
      is_primary?: boolean;
      wa_id?: string;
    }) => {
      const normalized = params.contact_type === "email"
        ? params.value
        : normalizePhoneToE164BR(params.value);
      if (!normalized && params.contact_type !== "email") throw new Error("Número inválido");

      // If setting as primary, unset current primary
      if (params.is_primary) {
        await supabase
          .from("mother_contacts")
          .update({ is_primary: false } as any)
          .eq("mae_id", params.mae_id)
          .eq("is_primary", true);
      }

      const { data, error } = await supabase
        .from("mother_contacts")
        .insert({
          mae_id: params.mae_id,
          contact_type: params.contact_type,
          value_e164: normalized || params.value,
          wa_id: params.wa_id || null,
          is_primary: params.is_primary ?? false,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["mother_contacts", vars.mae_id] });
    },
  });

  const deactivateContact = useMutation({
    mutationFn: async (params: { id: string; mae_id: string }) => {
      const { error } = await supabase
        .from("mother_contacts")
        .update({ active: false, is_primary: false } as any)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["mother_contacts", vars.mae_id] });
    },
  });

  const setPrimary = useMutation({
    mutationFn: async (params: { id: string; mae_id: string }) => {
      await supabase
        .from("mother_contacts")
        .update({ is_primary: false } as any)
        .eq("mae_id", params.mae_id);
      const { error } = await supabase
        .from("mother_contacts")
        .update({ is_primary: true } as any)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["mother_contacts", vars.mae_id] });
    },
  });

  return { addContact, deactivateContact, setPrimary };
}

/** Resolve a mother by phone number */
export async function resolveMotherByPhone(phoneE164: string): Promise<string | null> {
  const { data } = await supabase
    .from("mother_contacts")
    .select("mae_id")
    .eq("value_e164", phoneE164)
    .eq("active", true)
    .limit(1)
    .single();
  return data?.mae_id ?? null;
}
