import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export type Message = {
  id:              string
  conversation_id: string
  sender_id:       string
  conteudo:        string
  lida:            boolean
  created_at:      string
}

export type Conversation = {
  id:         string
  user1_id:   string
  user2_id:   string
  created_at: string
  updated_at: string
  outro:      { id: string; nome: string; username: string; foto_url: string | null }
  ultima_msg: string | null
  nao_lidas:  number
}

export function useChat() {
  const { user } = useAuth()
  const [conversas,     setConversas]     = useState<Conversation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [totalNaoLidas, setTotalNaoLidas] = useState(0)

  useEffect(() => {
    if (!user) return
    carregarConversas()

    const channel = supabase
      .channel('messages-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        carregarConversas()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        carregarConversas()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const carregarConversas = async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const enriquecidas: Conversation[] = await Promise.all(
      data.map(async (conv) => {
        const outroId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id

        const [{ data: perfil }, { data: msgs }, { count: naoLidas }] = await Promise.all([
          supabase.from('profiles').select('id, nome, username, foto_url').eq('id', outroId).single(),
          supabase.from('messages').select('conteudo').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('messages').select('*', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('lida', false).neq('sender_id', user.id),
        ])

        return {
          ...conv,
          outro:      perfil as any,
          ultima_msg: msgs?.[0]?.conteudo ?? null,
          nao_lidas:  naoLidas ?? 0,
        }
      })
    )

    setConversas(enriquecidas)
    setTotalNaoLidas(enriquecidas.reduce((s, c) => s + c.nao_lidas, 0))
    setLoading(false)
  }

  const iniciarConversa = async (outroUserId: string): Promise<string | null> => {
    if (!user) return null

    const { data: existente } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${outroUserId}),and(user1_id.eq.${outroUserId},user2_id.eq.${user.id})`)
      .single()

    if (existente) return existente.id

    const { data: nova } = await supabase
      .from('conversations')
      .insert({ user1_id: user.id, user2_id: outroUserId })
      .select('id')
      .single()

    await carregarConversas()
    return nova?.id ?? null
  }

  return { conversas, loading, totalNaoLidas, iniciarConversa, recarregar: carregarConversas }
}

export function useMensagens(conversationId: string | null) {
  const { user } = useAuth()
  const [mensagens, setMensagens] = useState<Message[]>([])
  const [loading,   setLoading]   = useState(true)
  const [enviando,  setEnviando]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!conversationId) return
    carregarMensagens()
    marcarLidas()

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMensagens((prev) => [...prev, payload.new as Message])
        marcarLidas()
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 100)
  }, [mensagens.length])

  const carregarMensagens = async () => {
    if (!conversationId) return
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMensagens(data ?? [])
    setLoading(false)
  }

  const marcarLidas = async () => {
    if (!conversationId || !user) return
    await supabase
      .from('messages')
      .update({ lida: true })
      .eq('conversation_id', conversationId)
      .eq('lida', false)
      .neq('sender_id', user.id)
    // Força atualização do badge na navbar
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  }

  const enviarMensagem = async (conteudo: string) => {
    if (!user || !conversationId || !conteudo.trim()) return
    setEnviando(true)

    const { data: novaMsg } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      conteudo:        conteudo.trim(),
    }).select().single()

    // Adiciona imediatamente na tela sem esperar o Realtime
    if (novaMsg) {
      setMensagens((prev) => [...prev, novaMsg as Message])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    setEnviando(false)
  }

  return { mensagens, loading, enviando, enviarMensagem, bottomRef }
}