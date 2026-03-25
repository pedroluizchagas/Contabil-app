// Este arquivo é gerado automaticamente pelo Supabase CLI.
// Execute: pnpm --filter @contabhub/supabase gen:types
// NÃO edite manualmente — edições serão sobrescritas.
//
// Para regenerar após rodar as migrations:
//   supabase gen types typescript --local > packages/supabase/src/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      planos: {
        Row: {
          id: string
          nome: string
          preco_mensal: number
          limite_empresas: number
          limite_funcionarios: number
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          preco_mensal: number
          limite_empresas: number
          limite_funcionarios: number
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          preco_mensal?: number
          limite_empresas?: number
          limite_funcionarios?: number
          ativo?: boolean
          created_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          auth_user_id: string | null
          nome: string
          cnpj: string
          email: string
          status: 'ativo' | 'inativo' | 'trial' | 'inadimplente'
          created_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          nome: string
          cnpj: string
          email: string
          status?: 'ativo' | 'inativo' | 'trial' | 'inadimplente'
          created_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          nome?: string
          cnpj?: string
          email?: string
          status?: 'ativo' | 'inativo' | 'trial' | 'inadimplente'
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plano_id: string
          status: 'trial' | 'ativo' | 'inadimplente' | 'cancelado'
          proximo_vencimento: string | null
          gateway_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plano_id: string
          status?: 'trial' | 'ativo' | 'inadimplente' | 'cancelado'
          proximo_vencimento?: string | null
          gateway_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          plano_id?: string
          status?: 'trial' | 'ativo' | 'inadimplente' | 'cancelado'
          proximo_vencimento?: string | null
          gateway_id?: string | null
          created_at?: string
        }
      }
      empresas: {
        Row: {
          id: string
          tenant_id: string
          auth_user_id: string | null
          nome: string
          cnpj: string
          senha_hash: string
          email: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          auth_user_id?: string | null
          nome: string
          cnpj: string
          senha_hash: string
          email: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          auth_user_id?: string | null
          nome?: string
          cnpj?: string
          senha_hash?: string
          email?: string
          ativo?: boolean
          created_at?: string
        }
      }
      funcionarios: {
        Row: {
          id: string
          empresa_id: string
          tenant_id: string
          auth_user_id: string | null
          nome: string
          cpf_hash: string
          data_nascimento_hash: string
          codigo: string
          email: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          tenant_id: string
          auth_user_id?: string | null
          nome: string
          cpf_hash: string
          data_nascimento_hash: string
          codigo: string
          email: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          tenant_id?: string
          auth_user_id?: string | null
          nome?: string
          cpf_hash?: string
          data_nascimento_hash?: string
          codigo?: string
          email?: string
          ativo?: boolean
          created_at?: string
        }
      }
      documentos: {
        Row: {
          id: string
          funcionario_id: string
          empresa_id: string
          tenant_id: string
          tipo: 'holerite' | 'ferias'
          mes_referencia: number
          ano_referencia: number
          storage_path: string
          status_envio: 'pendente' | 'enviado' | 'erro'
          created_at: string
        }
        Insert: {
          id?: string
          funcionario_id: string
          empresa_id: string
          tenant_id: string
          tipo: 'holerite' | 'ferias'
          mes_referencia: number
          ano_referencia: number
          storage_path: string
          status_envio?: 'pendente' | 'enviado' | 'erro'
          created_at?: string
        }
        Update: {
          id?: string
          funcionario_id?: string
          empresa_id?: string
          tenant_id?: string
          tipo?: 'holerite' | 'ferias'
          mes_referencia?: number
          ano_referencia?: number
          storage_path?: string
          status_envio?: 'pendente' | 'enviado' | 'erro'
          created_at?: string
        }
      }
      eventos_documento: {
        Row: {
          id: string
          documento_id: string
          funcionario_id: string
          tipo: 'visualizado' | 'assinado'
          ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          documento_id: string
          funcionario_id: string
          tipo: 'visualizado' | 'assinado'
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          documento_id?: string
          funcionario_id?: string
          tipo?: 'visualizado' | 'assinado'
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      lotes: {
        Row: {
          id: string
          tenant_id: string
          empresa_id: string
          storage_path_original: string
          tipo: 'holerite' | 'ferias'
          mes_referencia: number
          ano_referencia: number
          total_documentos: number
          processados: number
          erros: number
          status: 'aguardando' | 'processando' | 'concluido' | 'erro'
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          empresa_id: string
          storage_path_original: string
          tipo?: 'holerite' | 'ferias'
          mes_referencia?: number
          ano_referencia?: number
          total_documentos?: number
          processados?: number
          erros?: number
          status?: 'aguardando' | 'processando' | 'concluido' | 'erro'
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          empresa_id?: string
          storage_path_original?: string
          tipo?: 'holerite' | 'ferias'
          mes_referencia?: number
          ano_referencia?: number
          total_documentos?: number
          processados?: number
          erros?: number
          status?: 'aguardando' | 'processando' | 'concluido' | 'erro'
          created_at?: string
        }
      }
      auth_codes: {
        Row: {
          id: string
          funcionario_id: string
          code_hash: string
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          funcionario_id: string
          code_hash: string
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          funcionario_id?: string
          code_hash?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string
        }
      }
      expo_push_tokens: {
        Row: {
          id: string
          funcionario_id: string
          token: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          funcionario_id: string
          token: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          funcionario_id?: string
          token?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      v_status_documentos: {
        Row: {
          documento_id: string
          funcionario_id: string
          funcionario_nome: string
          funcionario_codigo: string
          empresa_id: string
          empresa_nome: string
          tenant_id: string
          tipo: 'holerite' | 'ferias'
          mes_referencia: number
          ano_referencia: number
          status_envio: 'pendente' | 'enviado' | 'erro'
          storage_path: string
          enviado_em: string
          visualizado_em: string | null
          assinado_em: string | null
          total_visualizacoes: number
        }
      }
    }
    Functions: {
      hash_texto: {
        Args: { p_texto: string }
        Returns: string
      }
      verificar_hash: {
        Args: { p_texto: string; p_hash: string }
        Returns: boolean
      }
      verificar_senha_empresa: {
        Args: { p_cnpj: string; p_senha: string }
        Returns: Array<{
          id: string
          tenant_id: string
          auth_user_id: string | null
          ativo: boolean
        }>
      }
      verificar_credenciais_funcionario: {
        Args: { p_empresa_id: string; p_cpf: string; p_data_nascimento: string }
        Returns: Array<{
          id: string
          tenant_id: string
          auth_user_id: string | null
          email: string
          ativo: boolean
        }>
      }
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      incrementar_processados_lote: {
        Args: { p_lote_id: string }
        Returns: void
      }
      incrementar_erros_lote: {
        Args: { p_lote_id: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
