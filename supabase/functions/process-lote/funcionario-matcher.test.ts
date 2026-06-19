/**
 * Testes de regressão do matcher de funcionários.
 *
 * Lógica pura (sem rede / sem PDF) — roda com:
 *   deno test supabase/functions/process-lote/funcionario-matcher.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { associarPaginasFuncionarios } from './funcionario-matcher.ts'
import type { FuncionarioRow } from './tipos.ts'

function func(id: string, codigo: string, nome = id): FuncionarioRow {
  return {
    id,
    empresa_id: 'e',
    tenant_id: 't',
    auth_user_id: null,
    nome,
    codigo,
    email: `${id}@x`,
    ativo: true,
  }
}

const funcionarios = [func('f1', 'ALPHA001'), func('f2', 'BETA002'), func('f3', 'GAMMA003')]

Deno.test('estratégia código: uma página por funcionário', () => {
  const textos = ['Cód.: ALPHA001 Joao', 'Matrícula: BETA002 Maria', 'Cód.: GAMMA003 Pedro']
  const r = associarPaginasFuncionarios(textos, funcionarios, { tipo: 'codigo' })
  assertEquals(r.length, 3)
  assertEquals(r[0].indices_pagina, [0])
  assertEquals(r[1].indices_pagina, [1])
  assertEquals(r[2].indices_pagina, [2])
})

Deno.test('estratégia código: página de continuação sem código anexa ao anterior', () => {
  const textos = [
    'Cód.: ALPHA001 Joao',
    'Matrícula: BETA002 Maria - folha 1',
    'continuação sem código - folha 2',
    'Cód.: GAMMA003 Pedro',
  ]
  const r = associarPaginasFuncionarios(textos, funcionarios, { tipo: 'codigo' })
  assertEquals(r.length, 3)
  assertEquals(r[1].funcionario.id, 'f2')
  assertEquals(r[1].indices_pagina, [1, 2]) // continuação agrupada
})

Deno.test('estratégia código: páginas iniciais sem código são ignoradas (capa)', () => {
  const textos = ['CAPA SEM CODIGO', 'Cód.: ALPHA001 Joao']
  const r = associarPaginasFuncionarios(textos, funcionarios, { tipo: 'codigo' })
  assertEquals(r.length, 1)
  assertEquals(r[0].funcionario.id, 'f1')
  assertEquals(r[0].indices_pagina, [1])
})

Deno.test('estratégia páginas-fixas: divide em blocos de N páginas', () => {
  const r = associarPaginasFuncionarios(Array(6).fill(''), funcionarios, {
    tipo: 'paginas-fixas',
    paginas_por_funcionario: 2,
  })
  assertEquals(r.length, 3)
  assertEquals(r[0].indices_pagina, [0, 1])
  assertEquals(r[1].indices_pagina, [2, 3])
  assertEquals(r[2].indices_pagina, [4, 5])
})

Deno.test('código com hífen/separador é casado por word boundary', () => {
  const textos = ['001 - João', 'folha do ALPHA001 em texto corrido']
  const fs = [func('f1', 'ALPHA001')]
  const r = associarPaginasFuncionarios(textos, fs, { tipo: 'codigo' })
  // página 0 não tem ALPHA001; página 1 tem
  assertEquals(r.length, 1)
  assertEquals(r[0].indices_pagina, [1])
})
