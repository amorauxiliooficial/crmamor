export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acoes_indicacao: {
        Row: {
          created_at: string
          id: string
          indicacao_id: string
          observacao: string | null
          tipo_acao: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          indicacao_id: string
          observacao?: string | null
          tipo_acao: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          indicacao_id?: string
          observacao?: string | null
          tipo_acao?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_indicacao_indicacao_id_fkey"
            columns: ["indicacao_id"]
            isOneToOne: false
            referencedRelation: "indicacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_mae: {
        Row: {
          carencia_cumprida: boolean
          checklist_status: Database["public"]["Enums"]["checklist_status"]
          created_at: string
          documentos_completos: boolean
          id: string
          mae_id: string
          prazo_legal_ok: boolean
          qualidade_segurada: boolean
          updated_at: string
        }
        Insert: {
          carencia_cumprida?: boolean
          checklist_status?: Database["public"]["Enums"]["checklist_status"]
          created_at?: string
          documentos_completos?: boolean
          id?: string
          mae_id: string
          prazo_legal_ok?: boolean
          qualidade_segurada?: boolean
          updated_at?: string
        }
        Update: {
          carencia_cumprida?: boolean
          checklist_status?: Database["public"]["Enums"]["checklist_status"]
          created_at?: string
          documentos_completos?: boolean
          id?: string
          mae_id?: string
          prazo_legal_ok?: boolean
          qualidade_segurada?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_mae_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: true
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      conferencia_inss: {
        Row: {
          created_at: string
          houve_atualizacao: boolean
          id: string
          mae_id: string
          observacoes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          houve_atualizacao?: boolean
          id?: string
          mae_id: string
          observacoes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          houve_atualizacao?: boolean
          id?: string
          mae_id?: string
          observacoes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conferencia_inss_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      decisao_processo: {
        Row: {
          created_at: string
          id: string
          mae_id: string
          motivo_decisao: string | null
          observacoes_internas: string | null
          resultado_final: Database["public"]["Enums"]["resultado_final"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mae_id: string
          motivo_decisao?: string | null
          observacoes_internas?: string | null
          resultado_final?:
            | Database["public"]["Enums"]["resultado_final"]
            | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mae_id?: string
          motivo_decisao?: string | null
          observacoes_internas?: string | null
          resultado_final?:
            | Database["public"]["Enums"]["resultado_final"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisao_processo_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: true
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      indicacoes: {
        Row: {
          created_at: string
          data_indicacao: string
          id: string
          motivo_abordagem: string | null
          nome_indicada: string
          nome_indicadora: string | null
          observacoes: string | null
          proxima_acao: string | null
          proxima_acao_data: string | null
          proxima_acao_observacao: string | null
          status_abordagem: string
          telefone_indicada: string | null
          telefone_indicadora: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_indicacao?: string
          id?: string
          motivo_abordagem?: string | null
          nome_indicada: string
          nome_indicadora?: string | null
          observacoes?: string | null
          proxima_acao?: string | null
          proxima_acao_data?: string | null
          proxima_acao_observacao?: string | null
          status_abordagem?: string
          telefone_indicada?: string | null
          telefone_indicadora?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_indicacao?: string
          id?: string
          motivo_abordagem?: string | null
          nome_indicada?: string
          nome_indicadora?: string | null
          observacoes?: string | null
          proxima_acao?: string | null
          proxima_acao_data?: string | null
          proxima_acao_observacao?: string | null
          status_abordagem?: string
          telefone_indicada?: string | null
          telefone_indicadora?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mae_processo: {
        Row: {
          categoria_previdenciaria: Database["public"]["Enums"]["categoria_previdenciaria"]
          contrato_assinado: boolean
          cpf: string
          created_at: string
          data_evento: string | null
          data_evento_tipo:
            | Database["public"]["Enums"]["data_evento_tipo"]
            | null
          data_ultima_atualizacao: string
          email: string | null
          id: string
          is_gestante: boolean
          link_documentos: string | null
          mes_gestacao: number | null
          nome_mae: string
          observacoes: string | null
          origem: string | null
          parcelas: string | null
          precisa_gps: string | null
          protocolo_inss: string | null
          segurada: string | null
          senha_gov: string | null
          status_processo: Database["public"]["Enums"]["status_processo"]
          telefone: string | null
          tipo_evento: Database["public"]["Enums"]["tipo_evento"]
          uf: string | null
          user_id: string
          verificacao_duas_etapas: boolean
        }
        Insert: {
          categoria_previdenciaria?: Database["public"]["Enums"]["categoria_previdenciaria"]
          contrato_assinado?: boolean
          cpf: string
          created_at?: string
          data_evento?: string | null
          data_evento_tipo?:
            | Database["public"]["Enums"]["data_evento_tipo"]
            | null
          data_ultima_atualizacao?: string
          email?: string | null
          id?: string
          is_gestante?: boolean
          link_documentos?: string | null
          mes_gestacao?: number | null
          nome_mae: string
          observacoes?: string | null
          origem?: string | null
          parcelas?: string | null
          precisa_gps?: string | null
          protocolo_inss?: string | null
          segurada?: string | null
          senha_gov?: string | null
          status_processo?: Database["public"]["Enums"]["status_processo"]
          telefone?: string | null
          tipo_evento?: Database["public"]["Enums"]["tipo_evento"]
          uf?: string | null
          user_id: string
          verificacao_duas_etapas?: boolean
        }
        Update: {
          categoria_previdenciaria?: Database["public"]["Enums"]["categoria_previdenciaria"]
          contrato_assinado?: boolean
          cpf?: string
          created_at?: string
          data_evento?: string | null
          data_evento_tipo?:
            | Database["public"]["Enums"]["data_evento_tipo"]
            | null
          data_ultima_atualizacao?: string
          email?: string | null
          id?: string
          is_gestante?: boolean
          link_documentos?: string | null
          mes_gestacao?: number | null
          nome_mae?: string
          observacoes?: string | null
          origem?: string | null
          parcelas?: string | null
          precisa_gps?: string | null
          protocolo_inss?: string | null
          segurada?: string | null
          senha_gov?: string | null
          status_processo?: Database["public"]["Enums"]["status_processo"]
          telefone?: string | null
          tipo_evento?: Database["public"]["Enums"]["tipo_evento"]
          uf?: string | null
          user_id?: string
          verificacao_duas_etapas?: boolean
        }
        Relationships: []
      }
      onboarding_items: {
        Row: {
          arquivo_url: string | null
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          login_sistema: string | null
          ordem: number | null
          requer_assinatura: boolean
          senha_sistema: string | null
          tempo_estimado: number | null
          tipo: string
          titulo: string
          updated_at: string
          url_sistema: string | null
          url_video: string | null
        }
        Insert: {
          arquivo_url?: string | null
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          login_sistema?: string | null
          ordem?: number | null
          requer_assinatura?: boolean
          senha_sistema?: string | null
          tempo_estimado?: number | null
          tipo?: string
          titulo: string
          updated_at?: string
          url_sistema?: string | null
          url_video?: string | null
        }
        Update: {
          arquivo_url?: string | null
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          login_sistema?: string | null
          ordem?: number | null
          requer_assinatura?: boolean
          senha_sistema?: string | null
          tempo_estimado?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string
          url_sistema?: string | null
          url_video?: string | null
        }
        Relationships: []
      }
      onboarding_progresso: {
        Row: {
          assinado_em: string | null
          concluido: boolean
          concluido_em: string | null
          created_at: string
          documento_assinado_url: string | null
          id: string
          item_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assinado_em?: string | null
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          documento_assinado_url?: string | null
          id?: string
          item_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assinado_em?: string | null
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          documento_assinado_url?: string | null
          id?: string
          item_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progresso_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "onboarding_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_mae: {
        Row: {
          created_at: string
          id: string
          mae_id: string
          tipo_pagamento: string
          total_parcelas: number | null
          updated_at: string
          user_id: string
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          mae_id: string
          tipo_pagamento?: string
          total_parcelas?: number | null
          updated_at?: string
          user_id: string
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          mae_id?: string
          tipo_pagamento?: string
          total_parcelas?: number | null
          updated_at?: string
          user_id?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_mae_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_pagamento: {
        Row: {
          created_at: string
          data_pagamento: string | null
          id: string
          numero_parcela: number
          observacoes: string | null
          pagamento_id: string
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero_parcela: number
          observacoes?: string | null
          pagamento_id: string
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero_parcela?: number
          observacoes?: string | null
          pagamento_id?: string
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_pagamento_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos_mae"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_categorias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      playbook_entradas: {
        Row: {
          categoria_id: string | null
          created_at: string
          created_by: string | null
          id: string
          pergunta: string
          respostas: string[] | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pergunta: string
          respostas?: string[] | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pergunta?: string
          respostas?: string[] | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_entradas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "playbook_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_favoritos: {
        Row: {
          created_at: string
          entrada_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entrada_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entrada_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_favoritos_entrada_id_fkey"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "playbook_entradas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      senhas_sistemas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          login: string
          nome_sistema: string
          senha: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          login: string
          nome_sistema: string
          senha: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          login?: string
          nome_sistema?: string
          senha?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verificacao_gestante: {
        Row: {
          atualizacao_realizada: string
          created_at: string
          id: string
          mae_id: string
          observacoes: string | null
          user_id: string
          verificado_em: string
        }
        Insert: {
          atualizacao_realizada: string
          created_at?: string
          id?: string
          mae_id: string
          observacoes?: string | null
          user_id: string
          verificado_em?: string
        }
        Update: {
          atualizacao_realizada?: string
          created_at?: string
          id?: string
          mae_id?: string
          observacoes?: string | null
          user_id?: string
          verificado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "verificacao_gestante_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_mae_processo: { Args: { _mae_id: string }; Returns: boolean }
      validate_cpf: { Args: { cpf: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      categoria_previdenciaria:
        | "CLT"
        | "MEI"
        | "Contribuinte Individual"
        | "Desempregada"
        | "Não informado"
      checklist_status: "OK" | "Incompleto"
      data_evento_tipo: "Parto (real)" | "DPP" | ""
      resultado_final: "APROVADA" | "REPROVADA"
      status_processo:
        | "Entrada de Documentos"
        | "Em Análise"
        | "Pendência Documental"
        | "Elegível (Análise Positiva)"
        | "Protocolo INSS"
        | "Aguardando Análise INSS"
        | "Aprovada"
        | "Indeferida"
        | "Recurso / Judicial"
        | "Processo Encerrado"
      tipo_evento: "Parto" | "Adoção" | "Guarda judicial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      categoria_previdenciaria: [
        "CLT",
        "MEI",
        "Contribuinte Individual",
        "Desempregada",
        "Não informado",
      ],
      checklist_status: ["OK", "Incompleto"],
      data_evento_tipo: ["Parto (real)", "DPP", ""],
      resultado_final: ["APROVADA", "REPROVADA"],
      status_processo: [
        "Entrada de Documentos",
        "Em Análise",
        "Pendência Documental",
        "Elegível (Análise Positiva)",
        "Protocolo INSS",
        "Aguardando Análise INSS",
        "Aprovada",
        "Indeferida",
        "Recurso / Judicial",
        "Processo Encerrado",
      ],
      tipo_evento: ["Parto", "Adoção", "Guarda judicial"],
    },
  },
} as const
