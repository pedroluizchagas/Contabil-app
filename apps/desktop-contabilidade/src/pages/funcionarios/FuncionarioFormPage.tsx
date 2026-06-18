import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Card, CardContent, Campo, AlertaErro, PageHeader, Input } from '@/components/ui'

interface FormData {
  nome: string
  cpf: string
  data_nascimento: string
  codigo: string
  email: string
}

const VAZIO: FormData = { nome: '', cpf: '', data_nascimento: '', codigo: '', email: '' }

export function FuncionarioFormPage() {
  const { empresaId, funcId } = useParams<{ empresaId: string; funcId: string }>()
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const ehEdicao = Boolean(funcId)

  const [form, setForm] = useState<FormData>(VAZIO)
  const [empresaNome, setEmpresaNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase
      .from('empresas')
      .select('nome')
      .eq('id', empresaId!)
      .single()
      .then(({ data }) => {
        if (data) setEmpresaNome(data.nome)
      })

    if (funcId) {
      supabase
        .from('funcionarios')
        .select('nome, codigo, email')
        .eq('id', funcId)
        .single()
        .then(({ data }) => {
          if (data) setForm({ ...VAZIO, nome: data.nome, codigo: data.codigo, email: data.email })
          setCarregando(false)
        })
    } else {
      setCarregando(false)
    }
  }, [empresaId, funcId])

  function atualizar(campo: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)

    if (ehEdicao) {
      const { error } = await supabase
        .from('funcionarios')
        .update({ nome: form.nome, email: form.email })
        .eq('id', funcId!)
      if (error) {
        setErro(error.message)
        setSalvando(false)
        return
      }
    } else {
      const cpfLimpo = form.cpf.replace(/\D/g, '')
      if (cpfLimpo.length !== 11) {
        setErro('CPF inválido. Informe os 11 dígitos.')
        setSalvando(false)
        return
      }
      const { error } = await supabase.functions.invoke('criar-funcionario', {
        body: {
          tenant_id: tenantId,
          empresa_id: empresaId,
          nome: form.nome,
          cpf: cpfLimpo,
          data_nascimento: form.data_nascimento,
          codigo: form.codigo.toUpperCase().trim(),
          email: form.email,
        },
      })
      if (error) {
        setErro(error.message)
        setSalvando(false)
        return
      }
    }

    navigate(`/empresas/${empresaId}/funcionarios`)
  }

  if (carregando) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <PageHeader
        titulo={ehEdicao ? 'Editar Funcionário' : 'Novo Funcionário'}
        voltar={`/empresas/${empresaId}/funcionarios`}
        voltarLabel={`Funcionários de ${empresaNome}`}
      />

      <Card className="max-w-lg">
        <CardContent>
          <AlertaErro mensagem={erro} />

          <form onSubmit={handleSubmit} className="space-y-5">
            <Campo label="Nome completo" obrigatorio>
              <Input
                type="text"
                value={form.nome}
                onChange={atualizar('nome')}
                placeholder="João da Silva"
                required
              />
            </Campo>

            {!ehEdicao && (
              <>
                <Campo label="CPF" obrigatorio>
                  <Input
                    type="text"
                    value={form.cpf}
                    onChange={atualizar('cpf')}
                    placeholder="000.000.000-00"
                    required
                    maxLength={14}
                  />
                </Campo>

                <Campo label="Data de nascimento" obrigatorio>
                  <Input
                    type="date"
                    value={form.data_nascimento}
                    onChange={atualizar('data_nascimento')}
                    required
                  />
                </Campo>
              </>
            )}

            <Campo
              label="Código no software contábil"
              obrigatorio
              hint="Deve coincidir com o código que aparece no PDF de holerites."
            >
              <Input
                type="text"
                value={form.codigo}
                onChange={atualizar('codigo')}
                placeholder="Ex.: ALPHA001"
                required
                disabled={ehEdicao}
                className="uppercase"
              />
            </Campo>

            <Campo label="E-mail" obrigatorio>
              <Input
                type="email"
                value={form.email}
                onChange={atualizar('email')}
                placeholder="joao@empresa.com.br"
                required
              />
            </Campo>

            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={salvando}>
                {salvando
                  ? 'Salvando...'
                  : ehEdicao
                    ? 'Salvar alterações'
                    : 'Cadastrar funcionário'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/empresas/${empresaId}/funcionarios`)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
