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
      owns_mae_processo: { Args: { _mae_id: string }; Returns: boolean }
      validate_cpf: { Args: { cpf: string }; Returns: boolean }
    }
    Enums: {
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
