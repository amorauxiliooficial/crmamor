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
      ai_agents: {
        Row: {
          created_at: string
          departments: string[] | null
          id: string
          is_active: boolean
          is_default: boolean
          knowledge_faq: Json | null
          knowledge_instructions: string | null
          knowledge_links: string[] | null
          max_tokens: number
          model: string
          name: string
          published_at: string | null
          published_config: Json | null
          system_prompt: string | null
          tone: string
          tools_config: Json | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          departments?: string[] | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          knowledge_faq?: Json | null
          knowledge_instructions?: string | null
          knowledge_links?: string[] | null
          max_tokens?: number
          model?: string
          name: string
          published_at?: string | null
          published_config?: Json | null
          system_prompt?: string | null
          tone?: string
          tools_config?: Json | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          departments?: string[] | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          knowledge_faq?: Json | null
          knowledge_instructions?: string | null
          knowledge_links?: string[] | null
          max_tokens?: number
          model?: string
          name?: string
          published_at?: string | null
          published_config?: Json | null
          system_prompt?: string | null
          tone?: string
          tools_config?: Json | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      alertas_mae: {
        Row: {
          created_at: string
          created_by: string
          destinatario_id: string | null
          id: string
          lido: boolean | null
          lido_em: string | null
          mae_id: string
          mensagem: string
        }
        Insert: {
          created_at?: string
          created_by: string
          destinatario_id?: string | null
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          mae_id: string
          mensagem: string
        }
        Update: {
          created_at?: string
          created_by?: string
          destinatario_id?: string | null
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          mae_id?: string
          mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_mae_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_events: {
        Row: {
          conversation_id: string | null
          created_at: string
          created_by: string | null
          from_user_id: string | null
          id: string
          mae_id: string | null
          reason: string | null
          summary: string | null
          to_user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          from_user_id?: string | null
          id?: string
          mae_id?: string | null
          reason?: string | null
          summary?: string | null
          to_user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          from_user_id?: string | null
          id?: string
          mae_id?: string | null
          reason?: string | null
          summary?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_events_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_mae: {
        Row: {
          concluido: boolean | null
          concluido_em: string | null
          created_at: string
          data_atividade: string
          data_proxima_acao: string | null
          descricao: string | null
          id: string
          mae_id: string
          proxima_acao: string | null
          resultado_contato: string | null
          status_followup: string | null
          tipo_atividade: string
          user_id: string
        }
        Insert: {
          concluido?: boolean | null
          concluido_em?: string | null
          created_at?: string
          data_atividade?: string
          data_proxima_acao?: string | null
          descricao?: string | null
          id?: string
          mae_id: string
          proxima_acao?: string | null
          resultado_contato?: string | null
          status_followup?: string | null
          tipo_atividade: string
          user_id: string
        }
        Update: {
          concluido?: boolean | null
          concluido_em?: string | null
          created_at?: string
          data_atividade?: string
          data_proxima_acao?: string | null
          descricao?: string | null
          id?: string
          mae_id?: string
          proxima_acao?: string | null
          resultado_contato?: string | null
          status_followup?: string | null
          tipo_atividade?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_mae_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos: {
        Row: {
          cidade: string | null
          created_at: string
          endereco: string | null
          id: string
          nome: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      boletos_amor: {
        Row: {
          central_id: string
          created_at: string
          id: string
          numero_boleto: string | null
          observacoes: string | null
          status: string
          updated_at: string
          valor: number | null
          vencimento: string | null
        }
        Insert: {
          central_id: string
          created_at?: string
          id?: string
          numero_boleto?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
          vencimento?: string | null
        }
        Update: {
          central_id?: string
          created_at?: string
          id?: string
          numero_boleto?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boletos_amor_central_id_fkey"
            columns: ["central_id"]
            isOneToOne: false
            referencedRelation: "central_financeira"
            referencedColumns: ["id"]
          },
        ]
      }
      central_alteracoes_log: {
        Row: {
          campo: string
          central_id: string
          created_at: string
          entidade: string
          id: string
          mae_id: string
          user_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          central_id: string
          created_at?: string
          entidade: string
          id?: string
          mae_id: string
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          central_id?: string
          created_at?: string
          entidade?: string
          id?: string
          mae_id?: string
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "central_alteracoes_log_central_id_fkey"
            columns: ["central_id"]
            isOneToOne: false
            referencedRelation: "central_financeira"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "central_alteracoes_log_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      central_comunicados_historico: {
        Row: {
          central_id: string
          created_at: string
          id: string
          mae_id: string
          texto: string
          user_id: string | null
          valores_snapshot: Json
        }
        Insert: {
          central_id: string
          created_at?: string
          id?: string
          mae_id: string
          texto: string
          user_id?: string | null
          valores_snapshot?: Json
        }
        Update: {
          central_id?: string
          created_at?: string
          id?: string
          mae_id?: string
          texto?: string
          user_id?: string | null
          valores_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "central_comunicados_historico_central_id_fkey"
            columns: ["central_id"]
            isOneToOne: false
            referencedRelation: "central_financeira"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "central_comunicados_historico_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      central_financeira: {
        Row: {
          agencia_saque: string | null
          banco_saque: string | null
          created_at: string
          created_by: string | null
          data_saque: string | null
          endereco_saque: string | null
          horario_saque: string | null
          id: string
          mae_id: string
          numero_beneficio: string | null
          observacao_saque: string | null
          observacoes_valores_futuros: string | null
          percentual_honorarios: number | null
          taxa_administrativa: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agencia_saque?: string | null
          banco_saque?: string | null
          created_at?: string
          created_by?: string | null
          data_saque?: string | null
          endereco_saque?: string | null
          horario_saque?: string | null
          id?: string
          mae_id: string
          numero_beneficio?: string | null
          observacao_saque?: string | null
          observacoes_valores_futuros?: string | null
          percentual_honorarios?: number | null
          taxa_administrativa?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agencia_saque?: string | null
          banco_saque?: string | null
          created_at?: string
          created_by?: string | null
          data_saque?: string | null
          endereco_saque?: string | null
          horario_saque?: string | null
          id?: string
          mae_id?: string
          numero_beneficio?: string | null
          observacao_saque?: string | null
          observacoes_valores_futuros?: string | null
          percentual_honorarios?: number | null
          taxa_administrativa?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "central_financeira_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: true
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          active: boolean
          code: string
          created_at: string
          display_name: string
          id: string
          phone_e164: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          display_name: string
          id?: string
          phone_e164?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          display_name?: string
          id?: string
          phone_e164?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
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
      config_prazos_status: {
        Row: {
          created_at: string
          dias_limite: number
          id: string
          prazos_progressivos: number[] | null
          status_processo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dias_limite?: number
          id?: string
          prazos_progressivos?: number[] | null
          status_processo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dias_limite?: number
          id?: string
          prazos_progressivos?: number[] | null
          status_processo?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_events: {
        Row: {
          conversation_id: string
          created_at: string
          created_by_agent_id: string | null
          event_type: string
          from_agent_id: string | null
          id: string
          meta: Json | null
          to_agent_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          created_by_agent_id?: string | null
          event_type: string
          from_agent_id?: string | null
          id?: string
          meta?: Json | null
          to_agent_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          created_by_agent_id?: string | null
          event_type?: string
          from_agent_id?: string | null
          id?: string
          meta?: Json | null
          to_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_phone_aliases: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          phone_type: string
          phone_value: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          phone_type?: string
          phone_value: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          phone_type?: string
          phone_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_phone_aliases_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_transfers: {
        Row: {
          conversation_id: string
          created_at: string
          from_agent_id: string | null
          from_channel_code: string | null
          from_instance_id: string | null
          id: string
          reason: string | null
          to_agent_id: string | null
          to_channel_code: string | null
          to_instance_id: string | null
          triggered_by: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          from_agent_id?: string | null
          from_channel_code?: string | null
          from_instance_id?: string | null
          id?: string
          reason?: string | null
          to_agent_id?: string | null
          to_channel_code?: string | null
          to_instance_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          from_agent_id?: string | null
          from_channel_code?: string | null
          from_instance_id?: string | null
          id?: string
          reason?: string | null
          to_agent_id?: string | null
          to_channel_code?: string | null
          to_instance_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_transfers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_transfers_from_instance_id_fkey"
            columns: ["from_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_transfers_to_instance_id_fkey"
            columns: ["to_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      criativos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          data_postagem: string
          descricao: string | null
          horario_postagem: string | null
          id: string
          legenda: string | null
          status: string
          tipo_conteudo_id: string | null
          tipo_instagram: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          data_postagem: string
          descricao?: string | null
          horario_postagem?: string | null
          id?: string
          legenda?: string | null
          status?: string
          tipo_conteudo_id?: string | null
          tipo_instagram?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          data_postagem?: string
          descricao?: string | null
          horario_postagem?: string | null
          id?: string
          legenda?: string | null
          status?: string
          tipo_conteudo_id?: string | null
          tipo_instagram?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "criativos_tipo_conteudo_id_fkey"
            columns: ["tipo_conteudo_id"]
            isOneToOne: false
            referencedRelation: "tipos_conteudo"
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
      desenvolvimento_log: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          tarefa_roadmap_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          tarefa_roadmap_id?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          tarefa_roadmap_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "desenvolvimento_log_tarefa_roadmap_id_fkey"
            columns: ["tarefa_roadmap_id"]
            isOneToOne: false
            referencedRelation: "tarefas_internas"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_despesa"]
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          fornecedor: string | null
          fornecedor_id: string | null
          id: string
          observacoes: string | null
          parcela_origem_id: string | null
          recorrencia: Database["public"]["Enums"]["tipo_recorrencia"]
          status: Database["public"]["Enums"]["status_transacao"]
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor?: string | null
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          parcela_origem_id?: string | null
          recorrencia?: Database["public"]["Enums"]["tipo_recorrencia"]
          status?: Database["public"]["Enums"]["status_transacao"]
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor?: string | null
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          parcela_origem_id?: string | null
          recorrencia?: Database["public"]["Enums"]["tipo_recorrencia"]
          status?: Database["public"]["Enums"]["status_transacao"]
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_parcela_origem_id_fkey"
            columns: ["parcela_origem_id"]
            isOneToOne: false
            referencedRelation: "parcelas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas: {
        Row: {
          cor: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      forecast_metas_fase: {
        Row: {
          id: string
          meta_quantidade: number
          meta_valor: number
          status_processo: string
          taxa_pagamento: number | null
          ticket_medio: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          meta_quantidade?: number
          meta_valor?: number
          status_processo: string
          taxa_pagamento?: number | null
          ticket_medio?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          meta_quantidade?: number
          meta_valor?: number
          status_processo?: string
          taxa_pagamento?: number | null
          ticket_medio?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      forecast_premissas: {
        Row: {
          id: string
          taxa_pagamento_padrao: number
          ticket_medio_padrao: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          taxa_pagamento_padrao?: number
          ticket_medio_padrao?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          taxa_pagamento_padrao?: number
          ticket_medio_padrao?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cnpj_cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      indicacoes: {
        Row: {
          assigned_at: string | null
          assigned_user_id: string | null
          created_at: string
          data_indicacao: string
          id: string
          motivo_abordagem: string | null
          nome_indicada: string
          nome_indicadora: string | null
          observacoes: string | null
          origem_indicacao: string | null
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
          assigned_at?: string | null
          assigned_user_id?: string | null
          created_at?: string
          data_indicacao?: string
          id?: string
          motivo_abordagem?: string | null
          nome_indicada: string
          nome_indicadora?: string | null
          observacoes?: string | null
          origem_indicacao?: string | null
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
          assigned_at?: string | null
          assigned_user_id?: string | null
          created_at?: string
          data_indicacao?: string
          id?: string
          motivo_abordagem?: string | null
          nome_indicada?: string
          nome_indicadora?: string | null
          observacoes?: string | null
          origem_indicacao?: string | null
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
      lead_intake: {
        Row: {
          address: string | null
          cpf: string | null
          created_at: string
          id: string
          name: string | null
          stage: string
          updated_at: string
          wa_conversation_id: string
        }
        Insert: {
          address?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name?: string | null
          stage?: string
          updated_at?: string
          wa_conversation_id: string
        }
        Update: {
          address?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name?: string | null
          stage?: string
          updated_at?: string
          wa_conversation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_intake_wa_conversation_id_fkey"
            columns: ["wa_conversation_id"]
            isOneToOne: true
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mae_atendentes: {
        Row: {
          created_at: string
          id: string
          mae_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mae_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mae_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mae_atendentes_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      mae_observacoes: {
        Row: {
          autor_id: string | null
          autor_nome: string
          categoria: Database["public"]["Enums"]["observacao_categoria"]
          created_at: string
          editada_em: string | null
          editada_por: string | null
          excluida_em: string | null
          excluida_por: string | null
          fixada: boolean
          id: string
          mae_id: string
          texto: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string
          categoria?: Database["public"]["Enums"]["observacao_categoria"]
          created_at?: string
          editada_em?: string | null
          editada_por?: string | null
          excluida_em?: string | null
          excluida_por?: string | null
          fixada?: boolean
          id?: string
          mae_id: string
          texto: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string
          categoria?: Database["public"]["Enums"]["observacao_categoria"]
          created_at?: string
          editada_em?: string | null
          editada_por?: string | null
          excluida_em?: string | null
          excluida_por?: string | null
          fixada?: boolean
          id?: string
          mae_id?: string
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mae_observacoes_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      mae_processo: {
        Row: {
          bairro: string | null
          categoria_previdenciaria: Database["public"]["Enums"]["categoria_previdenciaria"]
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato_nome_1: string | null
          contato_nome_2: string | null
          contato_nome_3: string | null
          contato_telefone_1: string | null
          contato_telefone_2: string | null
          contato_telefone_3: string | null
          contrato_assinado: boolean
          cpf: string
          created_at: string
          das_concluido: boolean
          data_evento: string | null
          data_evento_tipo:
            | Database["public"]["Enums"]["data_evento_tipo"]
            | null
          data_ultima_atualizacao: string
          email: string | null
          endereco: string | null
          etiqueta: string | null
          id: string
          is_gestante: boolean
          ja_trabalhou: boolean | null
          last_contact_at: string | null
          link_documentos: string | null
          mes_gestacao: number | null
          nome_mae: string
          numero: string | null
          observacoes: string | null
          origem: string | null
          parcelas: string | null
          percentual_comissao: number | null
          precisa_das: boolean
          precisa_gps: string | null
          protocolo_inss: string | null
          referral_id: string | null
          segurada: string | null
          senha_gov: string | null
          status_anterior: string | null
          status_processo: Database["public"]["Enums"]["status_processo"]
          telefone: string | null
          telefone_e164: string | null
          tipo_evento: Database["public"]["Enums"]["tipo_evento"]
          uf: string | null
          ultima_atividade_em: string | null
          user_id: string
          verificacao_duas_etapas: boolean
          zap_card_id: string | null
        }
        Insert: {
          bairro?: string | null
          categoria_previdenciaria?: Database["public"]["Enums"]["categoria_previdenciaria"]
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_nome_1?: string | null
          contato_nome_2?: string | null
          contato_nome_3?: string | null
          contato_telefone_1?: string | null
          contato_telefone_2?: string | null
          contato_telefone_3?: string | null
          contrato_assinado?: boolean
          cpf: string
          created_at?: string
          das_concluido?: boolean
          data_evento?: string | null
          data_evento_tipo?:
            | Database["public"]["Enums"]["data_evento_tipo"]
            | null
          data_ultima_atualizacao?: string
          email?: string | null
          endereco?: string | null
          etiqueta?: string | null
          id?: string
          is_gestante?: boolean
          ja_trabalhou?: boolean | null
          last_contact_at?: string | null
          link_documentos?: string | null
          mes_gestacao?: number | null
          nome_mae: string
          numero?: string | null
          observacoes?: string | null
          origem?: string | null
          parcelas?: string | null
          percentual_comissao?: number | null
          precisa_das?: boolean
          precisa_gps?: string | null
          protocolo_inss?: string | null
          referral_id?: string | null
          segurada?: string | null
          senha_gov?: string | null
          status_anterior?: string | null
          status_processo?: Database["public"]["Enums"]["status_processo"]
          telefone?: string | null
          telefone_e164?: string | null
          tipo_evento?: Database["public"]["Enums"]["tipo_evento"]
          uf?: string | null
          ultima_atividade_em?: string | null
          user_id: string
          verificacao_duas_etapas?: boolean
          zap_card_id?: string | null
        }
        Update: {
          bairro?: string | null
          categoria_previdenciaria?: Database["public"]["Enums"]["categoria_previdenciaria"]
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_nome_1?: string | null
          contato_nome_2?: string | null
          contato_nome_3?: string | null
          contato_telefone_1?: string | null
          contato_telefone_2?: string | null
          contato_telefone_3?: string | null
          contrato_assinado?: boolean
          cpf?: string
          created_at?: string
          das_concluido?: boolean
          data_evento?: string | null
          data_evento_tipo?:
            | Database["public"]["Enums"]["data_evento_tipo"]
            | null
          data_ultima_atualizacao?: string
          email?: string | null
          endereco?: string | null
          etiqueta?: string | null
          id?: string
          is_gestante?: boolean
          ja_trabalhou?: boolean | null
          last_contact_at?: string | null
          link_documentos?: string | null
          mes_gestacao?: number | null
          nome_mae?: string
          numero?: string | null
          observacoes?: string | null
          origem?: string | null
          parcelas?: string | null
          percentual_comissao?: number | null
          precisa_das?: boolean
          precisa_gps?: string | null
          protocolo_inss?: string | null
          referral_id?: string | null
          segurada?: string | null
          senha_gov?: string | null
          status_anterior?: string | null
          status_processo?: Database["public"]["Enums"]["status_processo"]
          telefone?: string | null
          telefone_e164?: string | null
          tipo_evento?: Database["public"]["Enums"]["tipo_evento"]
          uf?: string | null
          ultima_atividade_em?: string | null
          user_id?: string
          verificacao_duas_etapas?: boolean
          zap_card_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mae_processo_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "indicacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      mae_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          mae_id: string
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          mae_id: string
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          mae_id?: string
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: []
      }
      metas_config: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          periodo: string
          tipo_meta: string
          updated_at: string
          valor_meta: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          periodo?: string
          tipo_meta: string
          updated_at?: string
          valor_meta?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          periodo?: string
          tipo_meta?: string
          updated_at?: string
          valor_meta?: number
        }
        Relationships: []
      }
      mother_contacts: {
        Row: {
          active: boolean
          contact_type: string
          created_at: string
          id: string
          is_primary: boolean
          mae_id: string
          updated_at: string
          value_e164: string
          verified_at: string | null
          wa_id: string | null
        }
        Insert: {
          active?: boolean
          contact_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          mae_id: string
          updated_at?: string
          value_e164: string
          verified_at?: string | null
          wa_id?: string | null
        }
        Update: {
          active?: boolean
          contact_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          mae_id?: string
          updated_at?: string
          value_e164?: string
          verified_at?: string | null
          wa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mother_contacts_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
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
          percentual_comissao: number | null
          tipo_pagamento: string
          total_parcelas: number | null
          updated_at: string
          user_id: string
          valor_a_receber: number | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          mae_id: string
          percentual_comissao?: number | null
          tipo_pagamento?: string
          total_parcelas?: number | null
          updated_at?: string
          user_id: string
          valor_a_receber?: number | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          mae_id?: string
          percentual_comissao?: number | null
          tipo_pagamento?: string
          total_parcelas?: number | null
          updated_at?: string
          user_id?: string
          valor_a_receber?: number | null
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
      parcelas_beneficio: {
        Row: {
          central_id: string
          created_at: string
          data_parcela: string | null
          id: string
          numero_parcela: number
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          central_id: string
          created_at?: string
          data_parcela?: string | null
          id?: string
          numero_parcela: number
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          central_id?: string
          created_at?: string
          data_parcela?: string | null
          id?: string
          numero_parcela?: number
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_beneficio_central_id_fkey"
            columns: ["central_id"]
            isOneToOne: false
            referencedRelation: "central_financeira"
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
          valor_a_receber: number | null
          valor_comissao: number | null
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
          valor_a_receber?: number | null
          valor_comissao?: number | null
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
          valor_a_receber?: number | null
          valor_comissao?: number | null
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
      pre_analise: {
        Row: {
          carencia_status: string | null
          categoria_identificada: string | null
          conclusao_detalhada: string | null
          created_at: string
          dados_entrada: Json
          id: string
          mae_id: string | null
          modelo_ia_utilizado: string | null
          motivo_curto: string | null
          motivo_reanalise: Database["public"]["Enums"]["motivo_reanalise"]
          nome_temporario: string | null
          observacao_reanalise: string | null
          periodo_graca_status: string | null
          processado_em: string | null
          proxima_acao: string | null
          recomendacoes: string[] | null
          resposta_ia_raw: Json | null
          resultado_atendente: string | null
          riscos_identificados: Json | null
          session_id: string | null
          situacao_cnis: string | null
          status_analise: Database["public"]["Enums"]["status_pre_analise"]
          tokens_utilizados: number | null
          user_id: string
          versao: number
        }
        Insert: {
          carencia_status?: string | null
          categoria_identificada?: string | null
          conclusao_detalhada?: string | null
          created_at?: string
          dados_entrada: Json
          id?: string
          mae_id?: string | null
          modelo_ia_utilizado?: string | null
          motivo_curto?: string | null
          motivo_reanalise?: Database["public"]["Enums"]["motivo_reanalise"]
          nome_temporario?: string | null
          observacao_reanalise?: string | null
          periodo_graca_status?: string | null
          processado_em?: string | null
          proxima_acao?: string | null
          recomendacoes?: string[] | null
          resposta_ia_raw?: Json | null
          resultado_atendente?: string | null
          riscos_identificados?: Json | null
          session_id?: string | null
          situacao_cnis?: string | null
          status_analise: Database["public"]["Enums"]["status_pre_analise"]
          tokens_utilizados?: number | null
          user_id: string
          versao?: number
        }
        Update: {
          carencia_status?: string | null
          categoria_identificada?: string | null
          conclusao_detalhada?: string | null
          created_at?: string
          dados_entrada?: Json
          id?: string
          mae_id?: string | null
          modelo_ia_utilizado?: string | null
          motivo_curto?: string | null
          motivo_reanalise?: Database["public"]["Enums"]["motivo_reanalise"]
          nome_temporario?: string | null
          observacao_reanalise?: string | null
          periodo_graca_status?: string | null
          processado_em?: string | null
          proxima_acao?: string | null
          recomendacoes?: string[] | null
          resposta_ia_raw?: Json | null
          resultado_atendente?: string | null
          riscos_identificados?: Json | null
          session_id?: string | null
          situacao_cnis?: string | null
          status_analise?: Database["public"]["Enums"]["status_pre_analise"]
          tokens_utilizados?: number | null
          user_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "pre_analise_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
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
      prospeccao: {
        Row: {
          assigned_at: string | null
          assigned_user_id: string | null
          created_at: string | null
          id: string
          mae_processo_id: string | null
          mes_gestacao: number | null
          nome: string
          observacoes: string | null
          origem: string | null
          proxima_acao: string | null
          proxima_acao_data: string | null
          status: Database["public"]["Enums"]["status_prospeccao"] | null
          telefone: string
          telefone_e164: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          created_at?: string | null
          id?: string
          mae_processo_id?: string | null
          mes_gestacao?: number | null
          nome: string
          observacoes?: string | null
          origem?: string | null
          proxima_acao?: string | null
          proxima_acao_data?: string | null
          status?: Database["public"]["Enums"]["status_prospeccao"] | null
          telefone: string
          telefone_e164?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          created_at?: string | null
          id?: string
          mae_processo_id?: string | null
          mes_gestacao?: number | null
          nome?: string
          observacoes?: string | null
          origem?: string | null
          proxima_acao?: string | null
          proxima_acao_data?: string | null
          status?: Database["public"]["Enums"]["status_prospeccao"] | null
          telefone?: string
          telefone_e164?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospeccao_mae_processo_id_fkey"
            columns: ["mae_processo_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
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
      tarefa_responsaveis: {
        Row: {
          created_at: string
          id: string
          tarefa_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tarefa_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tarefa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_responsaveis_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas_internas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_internas: {
        Row: {
          backlog_at: string | null
          categoria: Database["public"]["Enums"]["task_category"]
          concluido_at: string | null
          created_at: string
          created_by: string
          descricao: string | null
          em_progresso_at: string | null
          id: string
          imagem_url: string | null
          ordem: number | null
          prazo: string | null
          prioridade: Database["public"]["Enums"]["task_priority"]
          priorizado_at: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          backlog_at?: string | null
          categoria?: Database["public"]["Enums"]["task_category"]
          concluido_at?: string | null
          created_at?: string
          created_by: string
          descricao?: string | null
          em_progresso_at?: string | null
          id?: string
          imagem_url?: string | null
          ordem?: number | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          priorizado_at?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          backlog_at?: string | null
          categoria?: Database["public"]["Enums"]["task_category"]
          concluido_at?: string | null
          created_at?: string
          created_by?: string
          descricao?: string | null
          em_progresso_at?: string | null
          id?: string
          imagem_url?: string | null
          ordem?: number | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          priorizado_at?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      templates_comunicado: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conteudo: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          conversation_id: string | null
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          mae_id: string | null
          payload: Json | null
          title: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          mae_id?: string | null
          payload?: Json | null
          title: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          mae_id?: string | null
          payload?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_conteudo: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          nome: string
          plataforma: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome: string
          plataforma?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          plataforma?: string
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
      wa_billing_events: {
        Row: {
          billable: boolean
          category: string | null
          conversation_id: string
          created_at: string
          currency: string | null
          estimated_cost: number | null
          id: string
          message_id: string | null
          meta_message_id: string | null
          pricing_model: string | null
        }
        Insert: {
          billable?: boolean
          category?: string | null
          conversation_id: string
          created_at?: string
          currency?: string | null
          estimated_cost?: number | null
          id?: string
          message_id?: string | null
          meta_message_id?: string | null
          pricing_model?: string | null
        }
        Update: {
          billable?: boolean
          category?: string | null
          conversation_id?: string
          created_at?: string
          currency?: string | null
          estimated_cost?: number | null
          id?: string
          message_id?: string | null
          meta_message_id?: string | null
          pricing_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_billing_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_billing_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "wa_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_billing_settings: {
        Row: {
          alert_enabled: boolean | null
          confirmation_threshold: number | null
          daily_limit: number | null
          id: string
          monthly_limit: number | null
          updated_at: string
        }
        Insert: {
          alert_enabled?: boolean | null
          confirmation_threshold?: number | null
          daily_limit?: number | null
          id?: string
          monthly_limit?: number | null
          updated_at?: string
        }
        Update: {
          alert_enabled?: boolean | null
          confirmation_threshold?: number | null
          daily_limit?: number | null
          id?: string
          monthly_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      wa_conversations: {
        Row: {
          active_channel_code: string
          ai_agent_id: string | null
          ai_enabled: boolean
          assigned_to: string | null
          channel: string
          channel_code: string
          created_at: string
          id: string
          instance_id: string | null
          labels: string[] | null
          last_ai_trigger_msg_id: string | null
          last_inbound_at: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_data: Json | null
          lead_stage: string | null
          mae_id: string | null
          preferred_channel: string
          status: string
          unread_count: number
          updated_at: string
          wa_jid: string | null
          wa_name: string | null
          wa_phone: string
        }
        Insert: {
          active_channel_code?: string
          ai_agent_id?: string | null
          ai_enabled?: boolean
          assigned_to?: string | null
          channel?: string
          channel_code?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          labels?: string[] | null
          last_ai_trigger_msg_id?: string | null
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_data?: Json | null
          lead_stage?: string | null
          mae_id?: string | null
          preferred_channel?: string
          status?: string
          unread_count?: number
          updated_at?: string
          wa_jid?: string | null
          wa_name?: string | null
          wa_phone: string
        }
        Update: {
          active_channel_code?: string
          ai_agent_id?: string | null
          ai_enabled?: boolean
          assigned_to?: string | null
          channel?: string
          channel_code?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          labels?: string[] | null
          last_ai_trigger_msg_id?: string | null
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_data?: Json | null
          lead_stage?: string | null
          mae_id?: string | null
          preferred_channel?: string
          status?: string
          unread_count?: number
          updated_at?: string
          wa_jid?: string | null
          wa_name?: string | null
          wa_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_mae_id_fkey"
            columns: ["mae_id"]
            isOneToOne: false
            referencedRelation: "mae_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          body: string | null
          channel: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          edited_at: string | null
          edited_by_agent_id: string | null
          error_code: string | null
          error_message: string | null
          id: string
          instance_id: string | null
          media_duration: number | null
          media_filename: string | null
          media_mime: string | null
          media_size: number | null
          media_url: string | null
          meta_media_id: string | null
          meta_message_id: string | null
          msg_type: string
          read_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          template_name: string | null
          template_variables: Json | null
        }
        Insert: {
          body?: string | null
          channel?: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          edited_at?: string | null
          edited_by_agent_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          media_duration?: number | null
          media_filename?: string | null
          media_mime?: string | null
          media_size?: number | null
          media_url?: string | null
          meta_media_id?: string | null
          meta_message_id?: string | null
          msg_type?: string
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_name?: string | null
          template_variables?: Json | null
        }
        Update: {
          body?: string | null
          channel?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          edited_at?: string | null
          edited_by_agent_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          media_duration?: number | null
          media_filename?: string | null
          media_mime?: string | null
          media_size?: number | null
          media_url?: string | null
          meta_media_id?: string | null
          meta_message_id?: string | null
          msg_type?: string
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_name?: string | null
          template_variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_rate_cards: {
        Row: {
          category: string
          cost_per_message: number
          created_at: string
          currency: string
          direction: string
          effective_from: string
          id: string
          market: string
          updated_at: string
        }
        Insert: {
          category: string
          cost_per_message?: number
          created_at?: string
          currency?: string
          direction?: string
          effective_from?: string
          id?: string
          market?: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_message?: number
          created_at?: string
          currency?: string
          direction?: string
          effective_from?: string
          id?: string
          market?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_templates: {
        Row: {
          category: string
          components_schema: Json
          created_at: string
          id: string
          language_code: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          components_schema?: Json
          created_at?: string
          id?: string
          language_code?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          components_schema?: Json
          created_at?: string
          id?: string
          language_code?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          created_by: string
          evolution_instance_name: string
          id: string
          name: string
          phone: string | null
          qr_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          evolution_instance_name: string
          id?: string
          name: string
          phone?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          evolution_instance_name?: string
          id?: string
          name?: string
          phone?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_migrations_in_period: {
        Args: { p_end: string; p_start: string }
        Returns: {
          name: string
          statements: string[]
          version: string
        }[]
      }
      get_next_analise_version: { Args: { p_mae_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_mae_processo: { Args: { _mae_id: string }; Returns: boolean }
      validate_cpf: { Args: { cpf: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      categoria_despesa:
        | "fornecedor_servico"
        | "custo_operacional"
        | "comissao_parceiro"
        | "impostos"
        | "outros"
      categoria_previdenciaria:
        | "CLT"
        | "MEI"
        | "Contribuinte Individual"
        | "Desempregada"
        | "Não informado"
      categoria_segurada_analise:
        | "empregada_clt"
        | "contribuinte_individual"
        | "mei"
        | "desempregada"
        | "segurada_especial"
        | "facultativa"
      checklist_status: "OK" | "Incompleto"
      data_evento_tipo: "Parto (real)" | "DPP" | ""
      motivo_reanalise:
        | "primeiro_registro"
        | "documento_novo"
        | "correcao_dados"
        | "atualizacao_cnis"
        | "solicitacao_manual"
      observacao_categoria:
        | "ligacao"
        | "whatsapp"
        | "documento"
        | "reuniao"
        | "importado"
        | "outro"
      resultado_final: "APROVADA" | "REPROVADA"
      status_pre_analise:
        | "aprovada"
        | "aprovada_com_ressalvas"
        | "nao_aprovavel"
        | "erro_processamento"
      status_processo:
        | "Entrada de Documentos"
        | "Em Análise"
        | "Gestantes 1 a 8 meses"
        | "Gestantes em Maturação"
        | "Entradas do Mês"
        | "Pendência Documental"
        | "Elegível (Análise Positiva)"
        | "Protocolo INSS"
        | "Aguardando Análise INSS"
        | "Aprovada"
        | "Indeferida"
        | "Recurso / Judicial"
        | "Processo Encerrado"
        | "Inadimplência"
        | "Negativação"
        | "Renegociação"
        | "📄 Rescisão de Contrato"
      status_prospeccao:
        | "novo"
        | "em_contato"
        | "qualificado"
        | "sem_interesse"
        | "sem_resposta"
        | "convertido"
      status_transacao: "pendente" | "pago" | "cancelado" | "atrasado"
      task_category: "bug" | "melhoria" | "nova_funcionalidade" | "ajuste"
      task_priority: "baixa" | "media" | "alta" | "urgente"
      task_status: "backlog" | "priorizado" | "em_progresso" | "concluido"
      tipo_evento: "Parto" | "Adoção" | "Guarda judicial"
      tipo_recorrencia: "unica" | "mensal" | "trimestral" | "anual"
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
      categoria_despesa: [
        "fornecedor_servico",
        "custo_operacional",
        "comissao_parceiro",
        "impostos",
        "outros",
      ],
      categoria_previdenciaria: [
        "CLT",
        "MEI",
        "Contribuinte Individual",
        "Desempregada",
        "Não informado",
      ],
      categoria_segurada_analise: [
        "empregada_clt",
        "contribuinte_individual",
        "mei",
        "desempregada",
        "segurada_especial",
        "facultativa",
      ],
      checklist_status: ["OK", "Incompleto"],
      data_evento_tipo: ["Parto (real)", "DPP", ""],
      motivo_reanalise: [
        "primeiro_registro",
        "documento_novo",
        "correcao_dados",
        "atualizacao_cnis",
        "solicitacao_manual",
      ],
      observacao_categoria: [
        "ligacao",
        "whatsapp",
        "documento",
        "reuniao",
        "importado",
        "outro",
      ],
      resultado_final: ["APROVADA", "REPROVADA"],
      status_pre_analise: [
        "aprovada",
        "aprovada_com_ressalvas",
        "nao_aprovavel",
        "erro_processamento",
      ],
      status_processo: [
        "Entrada de Documentos",
        "Em Análise",
        "Gestantes 1 a 8 meses",
        "Gestantes em Maturação",
        "Entradas do Mês",
        "Pendência Documental",
        "Elegível (Análise Positiva)",
        "Protocolo INSS",
        "Aguardando Análise INSS",
        "Aprovada",
        "Indeferida",
        "Recurso / Judicial",
        "Processo Encerrado",
        "Inadimplência",
        "Negativação",
        "Renegociação",
        "📄 Rescisão de Contrato",
      ],
      status_prospeccao: [
        "novo",
        "em_contato",
        "qualificado",
        "sem_interesse",
        "sem_resposta",
        "convertido",
      ],
      status_transacao: ["pendente", "pago", "cancelado", "atrasado"],
      task_category: ["bug", "melhoria", "nova_funcionalidade", "ajuste"],
      task_priority: ["baixa", "media", "alta", "urgente"],
      task_status: ["backlog", "priorizado", "em_progresso", "concluido"],
      tipo_evento: ["Parto", "Adoção", "Guarda judicial"],
      tipo_recorrencia: ["unica", "mensal", "trimestral", "anual"],
    },
  },
} as const
