/**
 * Tipos compartilhados do process-lote
 */

export interface LoteRow {
  id: string
  tenant_id: string
  empresa_id: string
  storage_path_original: string
  status: string
  total_documentos: number
  processados: number
  erros: number
}

export interface FuncionarioRow {
  id: string
  empresa_id: string
  tenant_id: string
  auth_user_id: string | null
  nome: string
  codigo: string
  email: string
  ativo: boolean
}

/** Uma página do PDF associada a um funcionário */
export interface PaginaAssociada {
  funcionario: FuncionarioRow
  indices_pagina: number[]  // 0-based
}

/** Resultado do processamento de um documento individual */
export interface ResultadoDocumento {
  funcionario_id: string
  sucesso: boolean
  storage_path?: string
  erro?: string
}

/** Configuração de estratégia de parsing */
export interface EstrategiaParser {
  /**
   * 'codigo': procura o código do funcionário no texto de cada página (preferido)
   * 'paginas-fixas': divide em blocos de N páginas por funcionário
   */
  tipo: 'codigo' | 'paginas-fixas'
  /** Usado apenas quando tipo = 'paginas-fixas' */
  paginas_por_funcionario?: number
}
