// Este arquivo é gerado automaticamente pelo Supabase CLI.
// Execute: pnpm --filter @contabhub/supabase gen:types
// NÃO edite manualmente.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          nome: string
          cnpj: string
          email: string
          plano: string
          status: 'ativo' | 'inativo' | 'trial' | 'inadimplente'
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj: string
          email: string
          plano: string
          status?: 'ativo' | 'inativo' | 'trial' | 'inadimplente'
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string
          email?: string
          plano?: string
          status?: 'ativo' | 'inativo' | 'trial' | 'inadimplente'
          created_at?: string
        }
      }
      empresas: {
        Row: {
          id: string
          tenant_id: string
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
          total_documentos?: number
          processados?: number
          erros?: number
          status?: 'aguardando' | 'processando' | 'concluido' | 'erro'
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
