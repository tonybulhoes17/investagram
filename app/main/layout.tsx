'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User, PieChart, PlusSquare, TrendingUp, LogOut, Newspaper, Search, Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/main/feed',           icon: Home,       label: 'Feed'      },
  { href: '/main/busca',          icon: Search,     label: 'Buscar'    },
  { href: '/main/noticias',       icon: Newspaper,  label: 'Notícias'  },
  { href: '/main/publicar',       icon: PlusSquare, label: 'Publicar'  },
  { href: '/main/carteira',       icon: PieChart,   label: 'Carteira'  },
  { href: '/main/perfil',         icon: User,       label: 'Perfil'    },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, profile, loading, signOut } = useAuth()
  const { naoLidas } = useNotificacoes()

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading, router])

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
      {/* Header Desktop */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-brand-dark/90 backdrop-blur-sm border-b border-brand-border h-14 items-center px-6">
        <Link href="/main/feed" className="flex items-center gap-2 mr-10">
          <div className="w-7 h-7 bg-brand-green rounded-lg flex items-center justify-center">
            <TrendingUp size={14} className="text-brand-dark" />
          </div>
          <span className="text-lg font-bold text-white">Investagram</span>
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const ativo = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  ativo
                    ? 'bg-brand-green/10 text-brand-green'
                    : 'text-brand-muted hover:text-white hover:bg-brand-surface'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Sino de notificações */}
          <Link
            href="/main/notificacoes"
            className={cn(
              'relative p-2 rounded-xl transition-colors',
              pathname.startsWith('/main/notificacoes')
                ? 'text-brand-green bg-brand-green/10'
                : 'text-brand-muted hover:text-white hover:bg-brand-surface'
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
                {profile.foto_url ? (
                  <img src={profile.foto_url} alt={profile.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-muted text-xs font-bold">
                    {profile.nome[0].toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm text-white font-medium">@{profile.username}</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="p-2 text-brand-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="md:pt-14 pb-20 md:pb-0">
        {children}
      </main>

      {/* Nav Mobile (bottom) — inclui sino */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-brand-card border-t border-brand-border">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const ativo = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors',
                  ativo ? 'text-brand-green' : 'text-brand-muted'
                )}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            )
          })}
          {/* Sino mobile */}
          <Link
            href="/main/notificacoes"
            className={cn(
              'relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors',
              pathname.startsWith('/main/notificacoes') ? 'text-brand-green' : 'text-brand-muted'
            )}
          >
            <Bell size={20} />
            {naoLidas > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
            <span className="text-xs font-medium">Alertas</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
