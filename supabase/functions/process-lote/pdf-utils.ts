/**
 * Utilitários de extração de texto e split de PDF.
 *
 * Estratégia de extração:
 * - PDFs gerados digitalmente (Domínio, Alterdata, Questor) armazenam o texto
 *   no content stream de cada página, com operadores BT/ET e Tj/TJ.
 * - O content stream quase sempre vem comprimido com FlateDecode (zlib). Aqui
 *   acessamos o stream de cada página via pdf-lib, descomprimimos com a Web API
 *   `DecompressionStream` (disponível no Deno) e só então fazemos o parsing do
 *   texto. Isso resolve dois problemas do parser anterior:
 *     1. PDFs comprimidos (o caso comum) passam a ser lidos;
 *     2. o texto fica corretamente associado à SUA página, em vez de dividido
 *        igualmente entre as páginas.
 * - Não usamos OCR — apenas texto embedado. PDFs escaneados (imagens) não são
 *   suportados e devem cair na estratégia de páginas-fixas.
 */

import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFArray,
  PDFRef,
  type PDFObject,
  type PDFContext,
  type PDFPage,
} from 'https://esm.sh/pdf-lib@1.17.1'

/**
 * Extrai o texto de cada página de um PDF.
 * Retorna um array onde o índice corresponde à página (0-based), com o mesmo
 * comprimento que o número real de páginas do documento.
 */
export async function extrairTextoPorPagina(pdfBytes: Uint8Array): Promise<string[]> {
  const pdf = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false })
  const context = pdf.context
  const paginas = pdf.getPages()

  const textos: string[] = []
  for (const pagina of paginas) {
    try {
      const bytesConteudo = await obterConteudoPagina(pagina, context)
      const conteudo = new TextDecoder('latin1').decode(bytesConteudo)
      textos.push(extrairTextoDeConteudo(conteudo))
    } catch (err) {
      console.error('Falha ao extrair texto de uma página:', err)
      textos.push('')
    }
  }

  return textos
}

/**
 * Retorna os bytes (descomprimidos) do(s) content stream(s) de uma página.
 * O /Contents pode ser um único stream ou um array de streams.
 */
async function obterConteudoPagina(pagina: PDFPage, context: PDFContext): Promise<Uint8Array> {
  let contents: PDFObject | undefined = pagina.node.get(PDFName.of('Contents'))
  if (contents instanceof PDFRef) contents = context.lookup(contents)

  const streams: PDFRawStream[] = []
  if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      let item: PDFObject | undefined = contents.get(i)
      if (item instanceof PDFRef) item = context.lookup(item)
      if (item instanceof PDFRawStream) streams.push(item)
    }
  } else if (contents instanceof PDFRawStream) {
    streams.push(contents)
  }

  const partes: Uint8Array[] = []
  for (const stream of streams) {
    partes.push(await decodificarStream(stream))
    partes.push(new Uint8Array([0x0a])) // separador entre streams
  }
  return concatenar(partes)
}

/** Descomprime um stream FlateDecode; se não for comprimido, devolve os bytes crus. */
async function decodificarStream(stream: PDFRawStream): Promise<Uint8Array> {
  const filtro = stream.dict.get(PDFName.of('Filter'))
  const usaFlate = filtro ? String(filtro).includes('FlateDecode') : false
  if (!usaFlate) return stream.contents
  try {
    return await inflar(stream.contents)
  } catch {
    // Stream com filtro desconhecido ou já descomprimido: usa os bytes crus.
    return stream.contents
  }
}

/** Inflate via Web Streams (zlib e, como fallback, deflate cru). */
async function inflar(bytes: Uint8Array): Promise<Uint8Array> {
  const formatos: Array<'deflate' | 'deflate-raw'> = ['deflate', 'deflate-raw']
  let ultimoErro: unknown
  for (const formato of formatos) {
    try {
      const ds = new DecompressionStream(formato)
      const stream = new Blob([bytes]).stream().pipeThrough(ds)
      const buffer = await new Response(stream).arrayBuffer()
      return new Uint8Array(buffer)
    } catch (err) {
      ultimoErro = err
    }
  }
  throw ultimoErro ?? new Error('Falha ao descomprimir o stream.')
}

function concatenar(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((acc, p) => acc + p.length, 0)
  const saida = new Uint8Array(total)
  let offset = 0
  for (const p of partes) {
    saida.set(p, offset)
    offset += p.length
  }
  return saida
}

// ─── Parsing do content stream (operadores de texto) ─────────────────────────

/** Extrai todo o texto renderizado de um content stream já descomprimido. */
function extrairTextoDeConteudo(conteudo: string): string {
  const partes: string[] = []
  const btEtRegex = /BT([\s\S]*?)ET/g
  let bloco: RegExpExecArray | null
  while ((bloco = btEtRegex.exec(conteudo)) !== null) {
    partes.push(extrairTextoDeBloco(bloco[1]))
  }
  return partes
    .join(' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/**
 * Extrai o texto de um bloco BT...ET. Suporta:
 * - `(literal) Tj` e `<hex> Tj`
 * - `[ (a) -250 (b) <00> ] TJ` (com kerning)
 */
function extrairTextoDeBloco(bloco: string): string {
  const textos: string[] = []
  // Casa, na ordem do stream, os operadores de exibição de texto.
  const showRegex = /(\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]*>)\s*Tj|\[([\s\S]*?)\]\s*TJ/g
  let m: RegExpExecArray | null
  while ((m = showRegex.exec(bloco)) !== null) {
    if (m[1] !== undefined) {
      textos.push(decodificarToken(m[1]))
    } else if (m[2] !== undefined) {
      textos.push(decodificarArrayTJ(m[2]))
    }
  }
  return textos.join('')
}

/** Decodifica um array de TJ: concatena os literais/hex e ignora os números de kerning. */
function decodificarArrayTJ(conteudo: string): string {
  const tokenRegex = /\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]*>/g
  const partes: string[] = []
  let t: RegExpExecArray | null
  while ((t = tokenRegex.exec(conteudo)) !== null) {
    partes.push(decodificarToken(t[0]))
  }
  return partes.join('')
}

/** Decodifica um token de string: literal `(...)` ou hexadecimal `<...>`. */
function decodificarToken(token: string): string {
  if (token.startsWith('<')) {
    return decodificarHex(token.slice(1, -1))
  }
  return decodificarLiteral(token.slice(1, -1))
}

/** Decodifica uma string hexadecimal `<48656C6C6F>` → "Hello" (latin1). */
function decodificarHex(hex: string): string {
  const limpo = hex.replace(/\s+/g, '')
  const par = limpo.length % 2 === 0 ? limpo : limpo + '0'
  let out = ''
  for (let i = 0; i < par.length; i += 2) {
    out += String.fromCharCode(parseInt(par.slice(i, i + 2), 16))
  }
  return out
}

/** Decodifica uma string literal de PDF, tratando escapes e octais `\ddd`. */
function decodificarLiteral(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c !== '\\') {
      out += c
      continue
    }
    const n = s[i + 1]
    if (n === undefined) break
    if (n === 'n') {
      out += '\n'
      i++
    } else if (n === 'r') {
      out += '\r'
      i++
    } else if (n === 't') {
      out += '\t'
      i++
    } else if (n === 'b') {
      out += '\b'
      i++
    } else if (n === 'f') {
      out += '\f'
      i++
    } else if (n === '(' || n === ')' || n === '\\') {
      out += n
      i++
    } else if (n >= '0' && n <= '7') {
      let octal = n
      i++
      for (let k = 0; k < 2 && s[i + 1] >= '0' && s[i + 1] <= '7'; k++) {
        octal += s[i + 1]
        i++
      }
      out += String.fromCharCode(parseInt(octal, 8) & 0xff)
    } else {
      out += n
      i++
    }
  }
  return out
}

// ─── Split de PDF por páginas ─────────────────────────────────────────────────

/**
 * Extrai as páginas indicadas de um PDF e retorna um novo PDF com apenas essas
 * páginas. Usa pdf-lib, que funciona perfeitamente em Deno.
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

/** Retorna o número total de páginas de um PDF. */
export async function contarPaginas(pdfBytes: Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(pdfBytes)
  return pdf.getPageCount()
}
