import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PlaybookCategoria, PlaybookEntrada, PlaybookFavorito } from "@/types/playbook";

export function usePlaybook() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<PlaybookCategoria[]>([]);
  const [entradas, setEntradas] = useState<PlaybookEntrada[]>([]);
  const [favoritos, setFavoritos] = useState<PlaybookFavorito[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [categoriasRes, entradasRes, favoritosRes] = await Promise.all([
      supabase.from("playbook_categorias").select("*").order("ordem"),
      supabase.from("playbook_entradas").select("*").order("created_at", { ascending: false }),
      supabase.from("playbook_favoritos").select("*").eq("user_id", user.id),
    ]);

    if (categoriasRes.data) setCategorias(categoriasRes.data as PlaybookCategoria[]);
    if (entradasRes.data) setEntradas(entradasRes.data as PlaybookEntrada[]);
    if (favoritosRes.data) setFavoritos(favoritosRes.data as PlaybookFavorito[]);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Entradas with favorito flag
  const entradasComFavorito = useMemo(() => {
    const favoritoIds = new Set(favoritos.map((f) => f.entrada_id));
    return entradas.map((e) => ({
      ...e,
      is_favorito: favoritoIds.has(e.id),
      categoria: categorias.find((c) => c.id === e.categoria_id),
    }));
  }, [entradas, favoritos, categorias]);

  const toggleFavorito = async (entradaId: string) => {
    if (!user) return;
    const existing = favoritos.find((f) => f.entrada_id === entradaId);
    if (existing) {
      await supabase.from("playbook_favoritos").delete().eq("id", existing.id);
      setFavoritos((prev) => prev.filter((f) => f.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from("playbook_favoritos")
        .insert({ user_id: user.id, entrada_id: entradaId })
        .select()
        .single();
      if (data && !error) {
        setFavoritos((prev) => [...prev, data as PlaybookFavorito]);
      }
    }
  };

  const addCategoria = async (nome: string, descricao?: string) => {
    const { error } = await supabase
      .from("playbook_categorias")
      .insert({ nome, descricao, ordem: categorias.length + 1 });
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Categoria criada" });
      fetchData();
    }
  };

  const addEntrada = async (data: { pergunta: string; resposta: string; categoria_id?: string; tags?: string[] }) => {
    if (!user) return;
    const { error } = await supabase
      .from("playbook_entradas")
      .insert({ ...data, created_by: user.id });
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Entrada criada" });
      fetchData();
    }
  };

  const updateEntrada = async (id: string, data: Partial<PlaybookEntrada>) => {
    const { error } = await supabase
      .from("playbook_entradas")
      .update(data)
      .eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Entrada atualizada" });
      fetchData();
    }
  };

  const deleteEntrada = async (id: string) => {
    const { error } = await supabase.from("playbook_entradas").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Entrada removida" });
      fetchData();
    }
  };

  return {
    categorias,
    entradas: entradasComFavorito,
    loading,
    isAdmin,
    toggleFavorito,
    addCategoria,
    addEntrada,
    updateEntrada,
    deleteEntrada,
    refetch: fetchData,
  };
}
