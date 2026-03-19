/**
 * Utilitários de extração de texto e split de PDF.
 *
 * Estratégia de extração:
 * - PDFs gerados digitalmente (Domínio, Alterdata, Questor) armazenam
 *   o texto em streams com operadores BT/ET e Tj/TJ.
 * - Não usamos OCR — apenas parsing de texto embedado.
 *
 * Dependências (Deno / esm.sh):
 * - pdf-lib: manipulação e split de páginas
 * - pdfjs-dist: extração de texto por página
 */

// @deno-types="https://esm.sh/v135/@types/node@20.11.5/index.d.ts"
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

// ─── Extração de texto via parsing direto dos bytes do PDF ───────────────────
//
// pdfjs-dist possui dependências do ambiente browser/Node que conflitam com
// o Deno isolado das Edge Functions. Como alternativa, fazemos parsing
// lightweight dos streams de texto do PDF (suficiente para PDFs gerados
// digitalmente pelos softwares contábeis do Brasil).
//
// TODO: Caso algum software contábil gere PDFs com texto encodado em
// streams comprimidos (FlateDecode), será necessário integrar pdfjs-dist
// com flag --compat ou processar via worker externo.

/**
 * Extrai o texto de cada página de um PDF.
 * Retorna um array onde o índice corresponde ao número da página (0-based).
 *
 * Funciona para PDFs gerados por software (texto embedado).
 * Não funciona para PDFs escaneados (imagens).
 */
export function extrairTextoPorPagina(pdfBytes: Uint8Array): string[] {
  const raw = new TextDecoder('latin1').decode(pdfBytes)

  // Divide o PDF em objetos (simplificado — o suficiente para parsing de texto)
  // Captura blocos de texto entre operadores BT (Begin Text) e ET (End Text)
  const blocosTexto = extrairBlocosBT(raw)

  // Associa blocos às páginas usando os operadores de página do PDF
  const paginas = associarBlocosPaginas(raw, blocosTexto)

  return paginas
}

/**
 * Extrai os blocos BT...ET do PDF com os textos renderizados.
 * Suporta operadores Tj (texto simples) e TJ (texto com kerning).
 */
function extrairBlocosBT(raw: string): string[] {
  const blocos: string[] = []
  const btEtRegex = /BT([\s\S]*?)ET/g
  let match: RegExpExecArray | null

  while ((match = btEtRegex.exec(raw)) !== null) {
    const bloco = match[1]
    const textos: string[] = []

    // Operador Tj: (texto) Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    let tj: RegExpExecArray | null
    while ((tj = tjRegex.exec(bloco)) !== null) {
      textos.push(decodificarTextoRaw(tj[1]))
    }

    // Operador TJ: [(texto)(texto)] TJ
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g
    let tja: RegExpExecArray | null
    while ((tja = tjArrayRegex.exec(bloco)) !== null) {
      const conteudo = tja[1]
      const partes = conteudo.match(/\(([^)]*)\)/g) ?? []
      textos.push(partes.map((p) => decodificarTextoRaw(p.slice(1, -1))).join(''))
    }

    if (textos.length > 0) {
      blocos.push(textos.join(' '))
    }
  }

  return blocos
}

/**
 * Tenta associar blocos de texto a páginas usando Page objects do PDF.
 * Estratégia simplificada: divide os blocos igualmente pelas páginas encontradas.
 */
function associarBlocosPaginas(raw: string, blocos: string[]): string[] {
  // Conta o número de páginas pelo padrão /Type /Page (sem s no final)
  const pageMatches = raw.match(/\/Type\s*\/Page[^s]/g)
  const totalPaginas = pageMatches?.length ?? 1

  if (totalPaginas <= 1) {
    return [blocos.join(' ')]
  }

  // Divide os blocos igualmente entre as páginas
  const blocosPorPagina = Math.ceil(blocos.length / totalPaginas)
  const paginas: string[] = []

  for (let i = 0; i < totalPaginas; i++) {
    const inicio = i * blocosPorPagina
    const fim = Math.min(inicio + blocosPorPagina, blocos.length)
    paginas.push(blocos.slice(inicio, fim).join(' '))
  }

  return paginas
}

/** Decodifica sequências de escape básicas do PDF */
function decodificarTextoRaw(texto: string): string {
  return texto
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
}

// ─── Split de PDF por páginas ─────────────────────────────────────────────────

/**
 * Extrai as páginas indicadas de um PDF e retorna um novo PDF com apenas essas páginas.
 * Usa pdf-lib que funciona perfeitamente em Deno.
 */
export async function extrairPaginas(
  pdfBytes: Uint8Array,
  indicesPagina: number[]
): Promise<Uint8Array> {
  const pdfOriginal = await PDFDocument.load(pdfBytes)
  const novoPdf = await PDFDocument.create()

  const paginas = await novoPdf.copyPages(pdfOriginal, indicesPagina)
  for (const pagina of paginas) {
    novoPdf.addPage(pagina)
  }

  return novoPdf.save()
}

/**
 * Retorna o número total de páginas de um PDF.
 */
export async function contarPaginas(pdfBytes: Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(pdfBytes)
  return pdf.getPageCount()
}
