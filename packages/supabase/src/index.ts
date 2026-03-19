export { supabase } from './client'
export type { Database, Json } from './database.types'
export type { SupabaseClient, Session, User } from '@supabase/supabase-js'

export {
  loginContabilidade,
  cadastrarContabilidade,
  loginEmpresa,
  verificarFuncionario,
  confirmarOtpFuncionario,
  logout,
  recuperarSenha,
  getJwtClaims,
} from './auth'
export type { AuthResult, VerificarFuncionarioResult, JwtClaims } from './auth'
