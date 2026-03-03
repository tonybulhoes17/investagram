'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const carregarPerfil = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) carregarPerfil(u.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) carregarPerfil(u.id)
      else   setProfile(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [carregarPerfil])

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    return result
  }

  const signUp = async (
    email: string,
    password: string,
    dadosPerfil: { nome: string; username: string; idade: number; pais: string; bio?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) return { data, error }

    // Cria o perfil público
    const { error: perfilError } = await supabase.from('profiles').insert({
      id:       data.user.id,
      nome:     dadosPerfil.nome,
      username: dadosPerfil.username,
      idade:    dadosPerfil.idade,
      pais:     dadosPerfil.pais,
      bio:      dadosPerfil.bio ?? null,
    })

    return { data, error: perfilError }
  }

  const signOut = () => supabase.auth.signOut()

  return { user, profile, loading, signIn, signUp, signOut }
}
