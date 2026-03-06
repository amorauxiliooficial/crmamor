import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

interface BillingEvent {
  id: string;
  conversation_id: string;
  category: string | null;
  estimated_cost: number;
  billable: boolean;
  created_at: string;
}

interface RateCard {
  market: string;
  category: string;
  direction: string;
  cost_per_message: number;
}

interface BillingSettings {
  daily_limit: number;
  monthly_limit: number;
  alert_enabled: boolean;
  confirmation_threshold: number;
}

export function useRateCards() {
  return useQuery({
    queryKey: ["wa-rate-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_rate_cards")
        .select("market, category, direction, cost_per_message")
        .eq("market", "brazil")
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RateCard[];
    },
    staleTime: 60 * 60 * 1000, // 1h
  });
}

export function useBillingSettings() {
  return useQuery({
    queryKey: ["wa-billing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_billing_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as BillingSettings | null) ?? {
        daily_limit: 50,
        monthly_limit: 500,
        alert_enabled: true,
        confirmation_threshold: 0.10,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useBillingEvents(conversationId: string | null) {
  return useQuery({
    queryKey: ["wa-billing-events", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("wa_billing_events")
        .select("id, conversation_id, category, estimated_cost, billable, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BillingEvent[];
    },
    enabled: !!conversationId,
  });
}

export function useMonthlyBilling() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  return useQuery({
    queryKey: ["wa-billing-monthly", startOfMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_billing_events")
        .select("id, category, estimated_cost, billable, created_at, conversation_id")
        .gte("created_at", startOfMonth)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      const events = (data ?? []) as BillingEvent[];
      
      const monthTotal = events.reduce((sum, e) => sum + (e.billable ? Number(e.estimated_cost) : 0), 0);
      const todayEvents = events.filter(e => e.created_at >= startOfDay);
      const todayTotal = todayEvents.reduce((sum, e) => sum + (e.billable ? Number(e.estimated_cost) : 0), 0);
      
      const byCategory: Record<string, { count: number; cost: number }> = {};
      events.forEach(e => {
        const cat = e.category || "unknown";
        if (!byCategory[cat]) byCategory[cat] = { count: 0, cost: 0 };
        byCategory[cat].count++;
        if (e.billable) byCategory[cat].cost += Number(e.estimated_cost);
      });

      return {
        monthTotal,
        todayTotal,
        monthCount: events.length,
        todayCount: todayEvents.length,
        byCategory,
        events,
      };
    },
    staleTime: 30 * 1000,
  });
}

export function useConversationBilling(conversationId: string | null) {
  const { data: events } = useBillingEvents(conversationId);
  
  return useMemo(() => {
    if (!events || events.length === 0) {
      return { total: 0, count: 0, byCategory: {} as Record<string, { count: number; cost: number }> };
    }
    const total = events.reduce((sum, e) => sum + (e.billable ? Number(e.estimated_cost) : 0), 0);
    const byCategory: Record<string, { count: number; cost: number }> = {};
    events.forEach(e => {
      const cat = e.category || "unknown";
      if (!byCategory[cat]) byCategory[cat] = { count: 0, cost: 0 };
      byCategory[cat].count++;
      if (e.billable) byCategory[cat].cost += Number(e.estimated_cost);
    });
    return { total, count: events.length, byCategory };
  }, [events]);
}

/** Estimate cost for a pending action */
export function estimateCost(
  rateCards: RateCard[],
  isWindowOpen: boolean,
  templateCategory?: string,
): { cost: number; category: string; label: string } {
  if (isWindowOpen && !templateCategory) {
    // Service conversation (user-initiated) - free within window for first 1000/month
    const card = rateCards.find(r => r.category === "service" && r.direction === "user_initiated");
    return { cost: 0, category: "service", label: "Grátis (janela aberta)" };
  }
  
  if (templateCategory) {
    const cat = templateCategory.toLowerCase();
    const card = rateCards.find(r => r.category === cat && r.direction === "business_initiated");
    if (card) {
      return { cost: Number(card.cost_per_message), category: cat, label: `${cat} (~$${card.cost_per_message.toFixed(4)})` };
    }
  }
  
  // Default: utility
  const card = rateCards.find(r => r.category === "utility");
  return { cost: card ? Number(card.cost_per_message) : 0.008, category: "utility", label: "utility (~$0.0080)" };
}

/** Detect country from phone prefix */
export function detectMarket(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return "brazil";
  if (digits.startsWith("1")) return "north_america";
  if (digits.startsWith("44")) return "uk";
  return "rest_of_world";
}
