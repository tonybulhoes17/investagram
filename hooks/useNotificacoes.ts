'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type Notification = {
  id:         string
  user_id:    string
  actor_id:   string
  tipo:       'curtida' | 'comentario' | 'seguiu'
  post_id:    string | null
  lida:       boolean
  created_at: string
  actor:      { id: string; nome: string; username: string; foto_url: string | null }
  post:       { ativo_nome: string | null; conteudo: string | null } | null
}

export function useNotificacoes() {
  const { user } = useAuth()
  const [notificacoes,   setNotificacoes]   = useState<Notification[]>([])
  const [naoLidas,       setNaoLidas]       = useState(0)
  const [loading,        setLoading]        = useState(true)

  const carregar = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id(id, nome, username, foto_url),
        post:post_id(ativo_nome, conteudo)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotificacoes((data as Notification[]) ?? [])
    setNaoLidas((data ?? []).filter((n: any) => !n.lida).length)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    carregar()

    // Realtime: escuta novas notificações
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => carregar()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, carregar])

  const marcarTodasLidas = async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false)
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    setNaoLidas(0)
  }

  const marcarLida = async (id: string) => {
    await supabase.from('notifications').update({ lida: true }).eq('id', id)
    setNotificacoes((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n))
    setNaoLidas((prev) => Math.max(0, prev - 1))
  }

  const deletar = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    const notif = notificacoes.find((n) => n.id === id)
    setNotificacoes((prev) => prev.filter((n) => n.id !== id))
    if (notif && !notif.lida) setNaoLidas((prev) => Math.max(0, prev - 1))
  }

  return { notificacoes, naoLidas, loading, carregar, marcarTodasLidas, marcarLida, deletar }
}
