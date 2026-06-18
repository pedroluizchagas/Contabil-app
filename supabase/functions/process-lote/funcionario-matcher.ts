/**
 * Associa páginas do PDF aos funcionários.
 *
 * Estratégias suportadas:
 *
 * 1. 'codigo' (preferida): busca o código do funcionário no texto de cada
 *    página e agrupa as páginas consecutivas com o mesmo código.
 *    Requer PDFs com texto embedado (gerados digitalmente).
 *
 * 2. 'paginas-fixas' (fallback): divide o PDF em blocos de N páginas por
 *    funcionário, na ordem em que aparecem na lista de funcionários.
 *    Útil quando o texto não pode ser extraído ou os códigos não constam no PDF.
 *
 * IMPORTANTE: Testar com PDFs reais de Domínio, Alterdata e Questor antes
 * do lançamento. Ajustar os padrões de busca conforme necessário.
 */

import type { FuncionarioRow, PaginaAssociada, EstrategiaParser } from './tipos.ts'

/**
 * Associa páginas a funcionários com base no texto extraído.
 *
 * @param textosPorPagina - Texto extraído de cada página (0-based)
 * @param funcionarios - Lista de funcionários ativos da empresa
 * @param estrategia - Estratégia de matching
 */
export function associarPaginasFuncionarios(
  textosPorPagina: string[],
  funcionarios: FuncionarioRow[],
  estrategia: EstrategiaParser
): PaginaAssociada[] {
  if (estrategia.tipo === 'paginas-fixas') {
    return estrategiaPaginasFixas(
      textosPorPagina.length,
      funcionarios,
      estrategia.paginas_por_funcionario ?? 1
    )
  }

  return estrategiaCodigo(textosPorPagina, funcionarios)
}

// ─── Estratégia por código ────────────────────────────────────────────────────

function estrategiaCodigo(
  textosPorPagina: string[],
  funcionarios: FuncionarioRow[]
): PaginaAssociada[] {
  // Mapa de código → funcionário para busca eficiente
  const mapaFuncionarios = new Map<string, FuncionarioRow>()
  for (const f of funcionarios) {
    mapaFuncionarios.set(f.codigo.toUpperCase().trim(), f)
  }

  // Para cada página, tenta identificar qual funcionário aparece
  const funcionarioPorPagina: (FuncionarioRow | null)[] = textosPorPagina.map((texto) =>
    identificarFuncionarioNaPagina(texto, mapaFuncionarios)
  )

  // Agrupa páginas consecutivas com o mesmo funcionário
  return agruparPaginasConsecutivas(funcionarioPorPagina)
}

/**
 * Tenta identificar o funcionário em uma página pelo seu código.
 * O código é buscado em múltiplos formatos comuns nos softwares contábeis.
 */
function identificarFuncionarioNaPagina(
  texto: string,
  mapaFuncionarios: Map<string, FuncionarioRow>
): FuncionarioRow | null {
  const textoNormalizado = texto.toUpperCase()

  for (const [codigo, funcionario] of mapaFuncionarios) {
    // Padrões comuns em PDFs de holerite:
    // - "Cód.: ALPHA001" | "CÓDIGO: ALPHA001" | "Matrícula: 001"
    // - Código aparece sozinho na linha: "ALPHA001"
    // - Código com separadores: "001 - João Silva"
    const padroes = [
      new RegExp(`C[ÓO]D[IGO]*[.:]?\\s*${escaparRegex(codigo)}`, 'i'),
      new RegExp(`MATR[ÍI]CULA[:]?\\s*${escaparRegex(codigo)}`, 'i'),
      new RegExp(`\\b${escaparRegex(codigo)}\\b`),
    ]

    if (padroes.some((p) => p.test(textoNormalizado))) {
      return funcionario
    }
  }

  return null
}

function escaparRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Agrupa páginas consecutivas com o mesmo funcionário.
 * Páginas não identificadas ficam associadas ao funcionário anterior (se houver).
 */
function agruparPaginasConsecutivas(
  funcionarioPorPagina: (FuncionarioRow | null)[]
): PaginaAssociada[] {
  const grupos: PaginaAssociada[] = []
  let grupoAtual: PaginaAssociada | null = null

  for (let i = 0; i < funcionarioPorPagina.length; i++) {
    const funcionario = funcionarioPorPagina[i]

    if (funcionario === null) {
      // Página não identificada: anexa ao grupo atual (continuação)
      if (grupoAtual) {
        grupoAtual.indices_pagina.push(i)
      }
      // Se não há grupo atual, a página é ignorada (pode ser capa/rodapé)
      continue
    }

    if (grupoAtual && grupoAtual.funcionario.id === funcionario.id) {
      // Mesma funcionário → adiciona à página atual
      grupoAtual.indices_pagina.push(i)
    } else {
      // Novo funcionário → inicia novo grupo
      grupoAtual = { funcionario, indices_pagina: [i] }
      grupos.push(grupoAtual)
    }
  }

  return grupos
}

// ─── Estratégia por páginas fixas ────────────────────────────────────────────

/**
 * Divide o PDF assumindo N páginas por funcionário, na ordem da lista.
 * Usado como fallback quando a extração de texto não é confiável.
 */
function estrategiaPaginasFixas(
  totalPaginas: number,
  funcionarios: FuncionarioRow[],
  paginasPorFuncionario: number
): PaginaAssociada[] {
  const resultado: PaginaAssociada[] = []

  for (let i = 0; i < funcionarios.length; i++) {
    const inicio = i * paginasPorFuncionario
    const fim = Math.min(inicio + paginasPorFuncionario, totalPaginas)

    if (inicio >= totalPaginas) break

    const indices: number[] = []
    for (let j = inicio; j < fim; j++) {
      indices.push(j)
    }

    resultado.push({
      funcionario: funcionarios[i],
      indices_pagina: indices,
    })
  }

  return resultado
}
