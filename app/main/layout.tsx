'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PieChart, PlusSquare, TrendingUp, LogOut, Newspaper, Search, Bell, MoreHorizontal, X, MessageCircle, Heart, MessageSquare, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { useChat } from '@/hooks/useChat'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { InstallPWA } from '@/components/InstallPWA'

const NAV_ITEMS_DESKTOP = [
  { href: '/main/feed',     icon: Home,       label: 'Feed'     },
  { href: '/main/busca',    icon: Search,     label: 'Buscar'   },
  { href: '/main/noticias', icon: Newspaper,  label: 'Notícias' },
  { href: '/main/publicar', icon: PlusSquare, label: 'Publicar' },
  { href: '/main/carteira', icon: PieChart,   label: 'Carteira' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, profile, loading, signOut } = useAuth()
  const { naoLidas } = useNotificacoes()
  const { totalNaoLidas: msgNaoLidas, recarregar: recarregarChat } = useChat()
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading, router])

  useEffect(() => { setMenuAberto(false) }, [pathname])

  useEffect(() => {
    const interval = setInterval(() => recarregarChat(), 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <InstallPWA />

      {/* ── HEADER NOTIFICAÇÕES MOBILE (topo fixo) ─────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-brand-dark/95 backdrop-blur-sm border-b border-brand-border h-12 flex items-center justify-between px-4">
        {/* Logo */}
        <Link href="/main/feed" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-green rounded-lg flex items-center justify-center">
            <TrendingUp size={12} className="text-brand-dark" />
          </div>
          <span className="text-base font-bold text-white">Investagram</span>
        </Link>

        {/* Sino de notificações */}
        <Link
          href="/main/notificacoes"
          className={cn(
            'relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors',
            pathname.startsWith('/main/notificacoes')
              ? 'text-brand-green bg-brand-green/10'
              : naoLidas > 0
                ? 'text-brand-green'
                : 'text-brand-muted hover:text-white'
          )}
        >
          {/* Sino pulsa levemente quando tem notificação */}
          <motion.div
            animate={naoLidas > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
            transition={{ duration: 0.5, repeat: naoLidas > 0 ? Infinity : 0, repeatDelay: 3 }}
          >
            <Bell size={20} />
          </motion.div>

          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Link>
      </header>

      {/* ── HEADER DESKTOP ─────────────────────────────────── */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-brand-dark/90 backdrop-blur-sm border-b border-brand-border h-14 items-center px-6">
        <Link href="/main/feed" className="flex items-center gap-2 mr-10">
          <div className="w-7 h-7 bg-brand-green rounded-lg flex items-center justify-center">
            <TrendingUp size={14} className="text-brand-dark" />
          </div>
          <span className="text-lg font-bold text-white">Investagram</span>
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS_DESKTOP.map(({ href, icon: Icon, label }) => {
            const ativo = pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  ativo ? 'bg-brand-green/10 text-brand-green' : 'text-brand-muted hover:text-white hover:bg-brand-surface'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/main/chat"
            className={cn('relative p-2 rounded-xl transition-colors',
              pathname.startsWith('/main/chat') ? 'text-brand-green bg-brand-green/10' : 'text-brand-muted hover:text-white hover:bg-brand-surface'
            )}
          >
            <MessageCircle size={18} />
            {msgNaoLidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-green text-brand-dark text-[10px] font-bold rounded-full flex items-center justify-center">
                {msgNaoLidas > 9 ? '9+' : msgNaoLidas}
              </span>
            )}
          </Link>

          <Link href="/main/notificacoes"
            className={cn('relative p-2 rounded-xl transition-colors',
              pathname.startsWith('/main/notificacoes') ? 'text-brand-green bg-brand-green/10' : 'text-brand-muted hover:text-white hover:bg-brand-surface'
            )}
          >
            <Bell size={18} />
            {naoLidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </Link>

          {profile && (
            <Link href={`/main/perfil/${profile.id}`} className="flex items-center gap-2 ml-1">
              <div className="w-8 h-8 rounded-full bg-brand-surface border border-brand-border overflow-hidden">
                {profile.foto_url
                  ? <img src={profile.foto_url} alt={profile.nome} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-brand-muted text-xs font-bold">{profile.nome[0].toUpperCase()}</div>
                }
              </div>
              <span className="text-sm text-white font-medium">@{profile.username}</span>
            </Link>
          )}

          <button onClick={handleLogout} className="p-2 text-brand-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Espaço para o header mobile no topo */}
      <main className="pt-12 md:pt-14 pb-20 md:pb-0">
        {children}
      </main>

      {/* ── OVERLAY DO MENU "..." ───────────────────────────── */}
      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMenuAberto(false)} />
      )}

      {/* ── MENU "..." EXPANDIDO ────────────────────────────── */}
      {menuAberto && (
        <div className="md:hidden fixed bottom-16 right-0 z-50 w-52 bg-brand-card border border-brand-border rounded-tl-2xl shadow-xl overflow-hidden">
          <div className="p-1">
            <Link href={`/main/perfil/${profile?.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-brand-surface rounded-xl transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-brand-surface border border-brand-border overflow-hidden shrink-0">
                {profile?.foto_url
                  ? <img src={profile.foto_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-brand-muted">{profile?.nome?.[0]?.toUpperCase()}</div>
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile?.nome}</p>
                <p className="text-xs text-brand-muted">@{profile?.username}</p>
              </div>
            </Link>

            <div className="border-t border-brand-border my-1" />

            <Link href="/main/carteira"
              className="flex items-center gap-3 px-4 py-3 text-sm text-brand-muted hover:text-white hover:bg-brand-surface rounded-xl transition-colors"
            >
              <PieChart size={16} /> Carteira
            </Link>

            <div className="border-t border-brand-border my-1" />

            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut size={16} /> Sair da conta
            </button>
          </div>
        </div>
      )}

      {/* ── BARRA MOBILE ───────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-brand-card border-t border-brand-border">
        <div className="flex items-center justify-around h-16">

          <Link href="/main/feed" className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors', pathname.startsWith('/main/feed') ? 'text-brand-green' : 'text-brand-muted')}>
            <Home size={20} />
            <span className="text-[10px] font-medium">Feed</span>
          </Link>

          <Link href="/main/busca" className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors', pathname.startsWith('/main/busca') ? 'text-brand-green' : 'text-brand-muted')}>
            <Search size={20} />
            <span className="text-[10px] font-medium">Buscar</span>
          </Link>

          <Link href="/main/noticias" className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors', pathname.startsWith('/main/noticias') ? 'text-brand-green' : 'text-brand-muted')}>
            <Newspaper size={20} />
            <span className="text-[10px] font-medium">Notícias</span>
          </Link>

          <Link href="/main/publicar" className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors', pathname.startsWith('/main/publicar') ? 'text-brand-green' : 'text-brand-muted')}>
            <PlusSquare size={20} />
            <span className="text-[10px] font-medium">Publicar</span>
          </Link>

          <Link href="/main/chat" className={cn('relative flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors', pathname.startsWith('/main/chat') ? 'text-brand-green' : 'text-brand-muted')}>
            <MessageCircle size={20} />
            {msgNaoLidas > 0 && (
              <span className="absolute top-1 right-0 w-4 h-4 bg-brand-green text-brand-dark text-[10px] font-bold rounded-full flex items-center justify-center">
                {msgNaoLidas > 9 ? '9+' : msgNaoLidas}
              </span>
            )}
            <span className="text-[10px] font-medium">Mensagens</span>
          </Link>

          {/* Mais (...) */}
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className={cn('relative flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors', menuAberto ? 'text-brand-green' : 'text-brand-muted')}
          >
            {menuAberto ? <X size={20} /> : <MoreHorizontal size={20} />}
            {!menuAberto && msgNaoLidas > 0 && (
              <span className="absolute top-1 right-0 w-4 h-4 bg-brand-green text-brand-dark text-[10px] font-bold rounded-full flex items-center justify-center">
                {msgNaoLidas > 9 ? '9+' : msgNaoLidas}
              </span>
            )}
            <span className="text-[10px] font-medium">Mais</span>
          </button>

        </div>
      </nav>
    </div>
  )
}
