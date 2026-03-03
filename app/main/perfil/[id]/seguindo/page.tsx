'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, UserPlus, UserCheck, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'

type PerfilComSigo = Profile & { ja_sigo: boolean }

export default function SeguindoPage() {
  const params   = useParams()
  const userId   = params.id as string
  const router   = useRouter()
  const { user } = useAuth()

  const [perfil,   setPerfil]   = useState<Profile | null>(null)
  const [seguindo, setSeguindo] = useState<PerfilComSigo[]>([])
  const [loading,  setLoading]  = useState(true)

  const ehMeuPerfil = user?.id === userId

  useEffect(() => {
    if (userId) carregar()
  }, [userId, user])

  const carregar = async () => {
    setLoading(true)

    const { data: perfilData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setPerfil(perfilData)

    // Busca quem este usuário segue
    const { data: followData } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId)

    const ids = followData?.map((f) => f.following_id) ?? []
    if (ids.length === 0) { setSeguindo([]); setLoading(false); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids)

    // Verifica quem o usuário logado já segue
    const enriquecidos: PerfilComSigo[] = await Promise.all(
      (profiles ?? []).map(async (p) => {
        let ja_sigo = false
        if (user && user.id !== p.id) {
          const { count } = await supabase
            .from('followers')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', user.id)
            .eq('following_id', p.id)
          ja_sigo = (count ?? 0) > 0
        } else if (user?.id === userId) {
          // Se é meu perfil, todos que aparecem aqui eu já sigo
          ja_sigo = true
        }
        return { ...p, ja_sigo }
      })
    )

    setSeguindo(enriquecidos)
    setLoading(false)
  }

  const handleSeguir = async (perfil: PerfilComSigo) => {
    if (!user) { toast.error('Faça login para seguir'); return }

    if (perfil.ja_sigo) {
      await supabase.from('followers').delete()
        .eq('follower_id', user.id).eq('following_id', perfil.id)
      setSeguindo((prev) => prev.map((p) =>
        p.id === perfil.id ? { ...p, ja_sigo: false } : p
      ))
      toast.success(`Deixou de seguir @${perfil.username}`)
    } else {
      await supabase.from('followers').insert({
        follower_id:  user.id,
        following_id: perfil.id,
      })
      setSeguindo((prev) => prev.map((p) =>
        p.id === perfil.id ? { ...p, ja_sigo: true } : p
      ))
      toast.success(`Seguindo @${perfil.username}!`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-brand-muted hover:text-white transition-colors rounded-xl hover:bg-brand-surface"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Seguindo</h1>
          {perfil && <p className="text-xs text-brand-muted">@{perfil.username}</p>}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3,4].map((n) => (
            <div key={n} className="card p-4 animate-pulse flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-surface shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-brand-surface rounded w-32 mb-2" />
                <div className="h-2 bg-brand-surface rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vazio */}
      {!loading && seguindo.length === 0 && (
        <div className="card p-12 text-center">
          <Users size={36} className="text-brand-muted mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">
            {ehMeuPerfil ? 'Você não segue ninguém ainda' : 'Este investidor não segue ninguém ainda'}
          </p>
          <p className="text-brand-muted text-sm mb-4">
            {ehMeuPerfil ? 'Descubra investidores interessantes para seguir!' : ''}
          </p>
          {ehMeuPerfil && (
            <Link href="/main/busca" className="btn-primary inline-flex items-center gap-2">
              <UserPlus size={14} />
              Buscar investidores
            </Link>
          )}
        </div>
      )}

      {/* Lista */}
      {!loading && seguindo.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-brand-muted">
            Seguindo {seguindo.length} investidor{seguindo.length !== 1 ? 'es' : ''}
          </p>
          {seguindo.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card p-4 flex items-center gap-3"
            >
              <Link href={`/main/perfil/${p.id}`} className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-brand-surface border border-brand-border overflow-hidden hover:border-brand-green transition-colors">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-brand-muted">
                      {p.nome[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>

              <Link href={`/main/perfil/${p.id}`} className="flex-1 min-w-0 group">
                <p className="text-sm font-semibold text-white group-hover:text-brand-green transition-colors truncate">
                  {p.nome}
                </p>
                <p className="text-xs text-brand-muted">@{p.username}</p>
                {p.bio && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.bio}</p>}
              </Link>

              {/* Botão — não mostra para si mesmo */}
              {user && user.id !== p.id && (
                <button
                  onClick={() => handleSeguir(p)}
                  className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                    p.ja_sigo
                      ? 'border-brand-border text-brand-muted hover:border-red-400 hover:text-red-400'
                      : 'border-brand-green bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-brand-dark'
                  }`}
                >
                  {p.ja_sigo
                    ? <><UserCheck size={12} /> Seguindo</>
                    : <><UserPlus size={12} /> Seguir</>
                  }
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
