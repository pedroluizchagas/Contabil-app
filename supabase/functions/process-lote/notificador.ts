/**
 * Envio de push notifications via Expo Push API.
 * Documentação: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export interface MensagemPush {
  token: string
  titulo: string
  corpo: string
  dados?: Record<string, string>
}

export interface ResultadoPush {
  token: string
  sucesso: boolean
  erro?: string
}

/**
 * Envia notificações push em batch para uma lista de tokens.
 * A Expo Push API aceita até 100 mensagens por request.
 */
export async function enviarNotificacoes(
  mensagens: MensagemPush[]
): Promise<ResultadoPush[]> {
  if (mensagens.length === 0) return []

  const resultados: ResultadoPush[] = []

  // Processa em lotes de 100 (limite da Expo API)
  for (let i = 0; i < mensagens.length; i += 100) {
    const lote = mensagens.slice(i, i + 100)
    const resultadosLote = await enviarLote(lote)
    resultados.push(...resultadosLote)
  }

  return resultados
}

async function enviarLote(mensagens: MensagemPush[]): Promise<ResultadoPush[]> {
  const payload = mensagens.map((m) => ({
    to: m.token,
    title: m.titulo,
    body: m.corpo,
    data: m.dados ?? {},
    sound: 'default',
    priority: 'high',
    channelId: 'documentos',
  }))

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      // Falha na API: marca todos como erro
      console.error('Expo Push API retornou erro:', response.status)
      return mensagens.map((m) => ({
        token: m.token,
        sucesso: false,
        erro: `HTTP ${response.status}`,
      }))
    }

    const body = await response.json()
    const dados = body.data as Array<{ status: string; message?: string; details?: unknown }>

    return mensagens.map((m, idx) => {
      const resultado = dados[idx]
      if (resultado?.status === 'ok') {
        return { token: m.token, sucesso: true }
      }
      return {
        token: m.token,
        sucesso: false,
        erro: resultado?.message ?? 'Erro desconhecido',
      }
    })
  } catch (err) {
    console.error('Erro ao chamar Expo Push API:', err)
    return mensagens.map((m) => ({
      token: m.token,
      sucesso: false,
      erro: 'Falha de rede',
    }))
  }
}

/**
 * Monta o texto da notificação conforme o tipo do documento.
 */
export function montarMensagem(
  tipo: 'holerite' | 'ferias',
  mes: number,
  ano: number,
  nomeEmpresa: string,
  token: string,
  funcionarioId: string
): MensagemPush {
  const nomeTipo = tipo === 'holerite' ? 'Holerite' : 'Recibo de Férias'
  const mesFormatado = String(mes).padStart(2, '0')

  return {
    token,
    titulo: `📄 ${nomeTipo} disponível`,
    corpo: `Seu ${nomeTipo.toLowerCase()} de ${mesFormatado}/${ano} da empresa ${nomeEmpresa} está disponível para visualização.`,
    dados: {
      tipo,
      mes: String(mes),
      ano: String(ano),
      funcionario_id: funcionarioId,
    },
  }
}
