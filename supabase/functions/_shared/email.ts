/**
 * Envio de e-mails transacionais via Resend.
 *
 * O dunning (cobrança em atraso) é responsabilidade do Stripe; aqui tratamos
 * apenas e-mails do ContaHub (boas-vindas, confirmação, cancelamento).
 */
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'ContaHub <no-reply@contahub.com.br>'

export async function enviarEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  if (!RESEND_API_KEY) {
    // Em dev/sem chave, apenas loga (não derruba o fluxo de provisionamento).
    console.warn('[email] RESEND_API_KEY ausente — e-mail não enviado:', params.subject)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!res.ok) {
    console.error('[email] Resend falhou:', res.status, await res.text())
  }
}

function layout(titulo: string, corpo: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,Arial,sans-serif;color:#1f2937;line-height:1.6">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;color:#7DC82E">ContaHub</h1>
      <h2 style="font-size:18px">${titulo}</h2>
      ${corpo}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="font-size:12px;color:#9ca3af">Este é um e-mail automático do ContaHub.</p>
    </div></body></html>`
}

function botao(href: string, texto: string): string {
  return `<a href="${href}" style="display:inline-block;background:#7DC82E;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${texto}</a>`
}

export function templateBoasVindas(p: {
  nome: string
  linkSenha: string
  linkPagamento?: string
}): { subject: string; html: string } {
  const corpo = `
    <p>Olá, ${p.nome}!</p>
    <p>Sua conta no ContaHub foi criada. Para começar, defina sua senha de acesso:</p>
    <p>${botao(p.linkSenha, 'Definir minha senha')}</p>
    ${
      p.linkPagamento
        ? `<p style="margin-top:16px">Quando quiser, conclua a configuração do pagamento:</p><p>${botao(
            p.linkPagamento,
            'Configurar pagamento'
          )}</p>`
        : ''
    }
    <p style="margin-top:16px">Seu período de teste de 30 dias já começou.</p>`
  return { subject: 'Bem-vindo ao ContaHub — defina sua senha', html: layout('Bem-vindo!', corpo) }
}

export function templatePagamentoConfirmado(p: { nome: string }): {
  subject: string
  html: string
} {
  const corpo = `<p>Olá, ${p.nome}!</p><p>Recebemos seu pagamento. Sua assinatura está ativa. Obrigado! 🎉</p>`
  return { subject: 'Pagamento confirmado — ContaHub', html: layout('Pagamento confirmado', corpo) }
}

export function templateCancelamento(p: { nome: string }): { subject: string; html: string } {
  const corpo = `<p>Olá, ${p.nome}.</p><p>Sua assinatura do ContaHub foi cancelada. Seus dados ficam retidos; fale conosco para reativar quando quiser.</p>`
  return { subject: 'Assinatura cancelada — ContaHub', html: layout('Assinatura cancelada', corpo) }
}
