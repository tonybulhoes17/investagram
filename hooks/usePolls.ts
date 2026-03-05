import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export type PollOpcao = { id: string; texto: string }

export type Poll = {
  id:         string
  user_id:    string
  pergunta:   string
  opcoes:     PollOpcao[]
  expira_em:  string
  created_at: string
  profiles:   { id: string; nome: string; username: string; foto_url: string | null }
  votos:      { opcao_id: string }[]
  meu_voto:   string | null
  ativa:      boolean
  total_votos: number
}

export function usePolls() {
  const { user } = useAuth()
  const [polls,   setPolls]   = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregarPolls() }, [user])

  const carregarPolls = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('polls')
      .select('*, profiles:user_id(id, nome, username, foto_url), poll_votes(opcao_id, user_id)')
      .order('created_at', { ascending: false })

    const agora = new Date()
    const enriquecidas: Poll[] = (data ?? []).map((p: any) => {
      const ativa    = new Date(p.expira_em) > agora
      const votos    = p.poll_votes ?? []
      const meuVoto  = user ? (votos.find((v: any) => v.user_id === user.id)?.opcao_id ?? null) : null
      return { ...p, opcoes: p.opcoes, votos, meu_voto: meuVoto, ativa, total_votos: votos.length }
    })

    // Stories: só ativas. Histórico: todas
    setPolls(enriquecidas)
    setLoading(false)
  }

  const votar = async (pollId: string, opcaoId: string) => {
    if (!user) return
    await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: user.id, opcao_id: opcaoId })
    await carregarPolls()
  }

  const removerVoto = async (pollId: string) => {
    if (!user) return
    await supabase.from('poll_votes').delete().eq('poll_id', pollId).eq('user_id', user.id)
    await carregarPolls()
  }

  const criarPoll = async (pergunta: string, opcoes: string[]) => {
    if (!user) return null
    const opcoesFormatadas = opcoes.map((texto, i) => ({ id: String(i + 1), texto }))
    const { data, error } = await supabase.from('polls').insert({
      user_id:   user.id,
      pergunta,
      opcoes:    opcoesFormatadas,
      expira_em: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    }).select().single()
    if (!error) await carregarPolls()
    return error ? null : data
  }

  const deletarPoll = async (pollId: string) => {
    await supabase.from('polls').delete().eq('id', pollId)
    await carregarPolls()
  }

  return { polls, loading, votar, removerVoto, criarPoll, deletarPoll, recarregar: carregarPolls }
}
