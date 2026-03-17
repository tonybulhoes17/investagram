'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Users, BarChart2, MessageCircle, Bell, PieChart, ChevronDown, ArrowRight, Star, Zap, Shield, Globe } from 'lucide-react'

const TICKER = [
  { symbol: 'PETR4',  val: '+2.4%',  up: true  },
  { symbol: 'BTC',    val: '+5.1%',  up: true  },
  { symbol: 'VALE3',  val: '-0.8%',  up: false },
  { symbol: 'AAPL',   val: '+1.2%',  up: true  },
  { symbol: 'IBOV',   val: '+0.9%',  up: true  },
  { symbol: 'ETH',    val: '+3.7%',  up: true  },
  { symbol: 'ITUB4',  val: '-0.3%',  up: false },
  { symbol: 'MGLU3',  val: '+4.2%',  up: true  },
]

function TickerBar() {
  return (
    <div className="w-full overflow-hidden bg-black/40 border-b border-emerald-500/20 py-2">
      <div className="flex animate-ticker whitespace-nowrap">
        {[...TICKER, ...TICKER, ...TICKER].map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 mx-6 text-xs font-mono">
            <span className="text-white/60">{item.symbol}</span>
            <span className={item.up ? 'text-emerald-400' : 'text-red-400'}>{item.val}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-black text-emerald-400 tabular-nums">{value}</div>
      <div className="text-xs text-white/50 mt-1 uppercase tracking-widest">{label}</div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc, accent }: { icon: any; title: string; desc: string; accent: string }) {
  return (
    <div className={`group relative p-6 rounded-2xl border bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 border-white/10 hover:border-${accent}-500/40 overflow-hidden`}>
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-${accent}-500/5 to-transparent`} />
      <div className={`w-10 h-10 rounded-xl bg-${accent}-500/10 border border-${accent}-500/20 flex items-center justify-center mb-4`}>
        <Icon size={18} className={`text-${accent}-400`} />
      </div>
      <h3 className="text-white font-bold mb-2 text-sm">{title}</h3>
      <p className="text-white/50 text-xs leading-relaxed">{desc}</p>
    </div>
  )
}

function StepCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-black">
        {n}
      </div>
      <div>
        <p className="text-white font-semibold text-sm mb-1">{title}</p>
        <p className="text-white/50 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function ConvitePage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#080c0e] text-white font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }

        @keyframes ticker {
          0%   { transform: translateX(0) }
          100% { transform: translateX(-33.333%) }
        }
        .animate-ticker { animation: ticker 28s linear infinite; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) }
          50%       { transform: translateY(-12px) }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }

        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.8 }
          100% { transform: scale(2);   opacity: 0   }
        }
        .animate-pulse-ring { animation: pulse-ring 2s ease-out infinite; }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px) }
          to   { opacity: 1; transform: translateY(0)    }
        }
        .animate-fade-up { animation: fade-up 0.7s ease forwards; }
        .delay-1 { animation-delay: 0.1s; opacity: 0; }
        .delay-2 { animation-delay: 0.25s; opacity: 0; }
        .delay-3 { animation-delay: 0.4s; opacity: 0; }
        .delay-4 { animation-delay: 0.55s; opacity: 0; }

        .grid-bg {
          background-image:
            linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .glow-green { box-shadow: 0 0 60px rgba(16,185,129,0.25), 0 0 120px rgba(16,185,129,0.1); }
        .text-glow  { text-shadow: 0 0 40px rgba(16,185,129,0.5); }
      `}</style>

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#080c0e]/95 backdrop-blur-md border-b border-white/5' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={13} className="text-black" />
            </div>
            <span className="font-display font-800 text-white text-lg">Investagram</span>
          </div>
          <Link href="/auth/login"
            className="text-xs font-medium text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl hover:bg-emerald-500/10 transition-colors"
          >
            Entrar na plataforma →
          </Link>
        </div>
      </nav>

      {/* TICKER */}
      <div className="pt-14">
        <TickerBar />
      </div>

      {/* HERO */}
      <section className="relative grid-bg min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-emerald-400/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="animate-fade-up delay-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Rede social para investidores
          </div>

          <h1 className="animate-fade-up delay-2 font-display font-black text-5xl md:text-7xl leading-[1.05] mb-6 tracking-tight">
            Invista melhor.<br />
            <span className="text-emerald-400 text-glow">Juntos.</span>
          </h1>

          <p className="animate-fade-up delay-3 text-white/60 text-lg md:text-xl leading-relaxed mb-10 max-w-xl mx-auto font-light">
            O Investagram é onde investidores compartilham operações, teses e carteiras em tempo real. Aprenda com quem já está no mercado.
          </p>

          <div className="animate-fade-up delay-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/login"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-2xl transition-all duration-200 glow-green text-sm"
            >
              Criar conta grátis <ArrowRight size={16} />
            </Link>
            <a href="#como-funciona"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/25 text-white/70 hover:text-white px-8 py-4 rounded-2xl transition-all duration-200 text-sm"
            >
              Como funciona <ChevronDown size={16} />
            </a>
          </div>
        </div>

        {/* Mock card flutuando */}
        <div className="animate-float mt-16 relative z-10 max-w-sm mx-auto">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-left backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">M</div>
              <div>
                <p className="text-xs font-semibold text-white">Marcos Silva</p>
                <p className="text-[10px] text-white/40">@marcos · agora</p>
              </div>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">↗ Compra</span>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 mb-3 border border-white/5">
              <p className="text-[10px] text-white/40 mb-0.5">Ativo</p>
              <p className="text-sm font-bold text-white">PETR4</p>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">Acumulando posição. Valuation atrativo com dividend yield acima de 12%.</p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
              <span className="text-[10px] text-white/30 flex items-center gap-1"><Star size={10} /> 24</span>
              <span className="text-[10px] text-white/30 flex items-center gap-1"><MessageCircle size={10} /> 8</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-white/5 bg-white/[0.015] py-14 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCard value="10k+"  label="Investidores" />
          <StatCard value="50k+"  label="Posts publicados" />
          <StatCard value="R$2bi" label="Em carteiras" />
          <StatCard value="98%"   label="Satisfação" />
        </div>
      </section>

      {/* POR QUE */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-emerald-400 text-xs uppercase tracking-widest font-medium mb-3">Por que o Investagram?</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-white">Tudo que um investidor<br />precisa, em um lugar.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon={TrendingUp}    accent="emerald" title="Movimentações em tempo real"      desc="Publique suas compras e vendas. Acompanhe o que investidores experientes estão fazendo agora no mercado." />
            <FeatureCard icon={BarChart2}     accent="blue"    title="Teses de investimento"            desc="Compartilhe e leia análises fundamentadas sobre ações, FIIs, criptos e renda fixa escritas pela comunidade." />
            <FeatureCard icon={PieChart}      accent="purple"  title="Carteira pública"                 desc="Monte e exponha sua carteira. Veja a alocação de outros investidores e compare estratégias." />
            <FeatureCard icon={MessageCircle} accent="yellow"  title="Comentários e discussões"         desc="Debate cada publicação com a comunidade. Likes, respostas e menções — tudo integrado." />
            <FeatureCard icon={Bell}          accent="orange"  title="Feed inteligente"                 desc="Posts sobem conforme a atividade. Quanto mais comentado, mais relevante — você não perde nada importante." />
            <FeatureCard icon={Users}         accent="pink"    title="Siga quem você admira"            desc="Encontre investidores alinhados ao seu perfil e siga para ter as movimentações deles no seu feed." />
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 px-6 bg-white/[0.015] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-emerald-400 text-xs uppercase tracking-widest font-medium mb-3">Passo a passo</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-white">Como usar a plataforma</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Coluna esquerda */}
            <div className="space-y-8">
              <StepCard n="1" title="Crie sua conta" desc="Cadastre-se gratuitamente com seu e-mail. Em menos de 1 minuto você já está dentro da plataforma." />
              <StepCard n="2" title="Monte seu perfil" desc="Adicione foto, bio e suas preferências de investimento. Quanto mais completo, mais conexões você faz." />
              <StepCard n="3" title="Siga investidores" desc="Use a busca para encontrar pessoas com estratégias parecidas com a sua. O feed vai se preenchendo automaticamente." />
              <StepCard n="4" title="Publique sua primeira operação" desc="Clique em Publicar, escolha 'Movimentação' e registre sua compra ou venda. Descreva o raciocínio por trás." />
            </div>

            {/* Coluna direita */}
            <div className="space-y-8">
              <StepCard n="5" title="Escreva uma tese" desc="Tem uma análise para compartilhar? Escolha 'Tese' e publique sua visão sobre um ativo. A comunidade debate." />
              <StepCard n="6" title="Monte sua carteira" desc="Acesse a seção Carteira, adicione seus ativos e percentuais. Deixe público para inspirar outros investidores." />
              <StepCard n="7" title="Explore o feed" desc="O feed tem duas seções: 'Seguindo' para quem você já acompanha e 'Descobrir' para novos investidores relevantes." />
              <StepCard n="8" title="Interaja e aprenda" desc="Curta, comente e compartilhe. Cada interação fortalece a comunidade e te expõe a novas perspectivas." />
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-emerald-400 text-xs uppercase tracking-widest font-medium mb-3">Comunidade</p>
            <h2 className="font-display font-black text-3xl md:text-4xl text-white">O que os investidores dizem</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { nome: 'Ana Rodrigues',  user: '@ana_investe',  texto: 'Finalmente um lugar onde posso acompanhar operações reais de outros investidores. Aprendi mais aqui em 1 mês do que em 1 ano de YouTube.' },
              { nome: 'Carlos Mendes',  user: '@carlosm',      texto: 'A carteira pública é incrível. Exponho minha alocação e recebo feedbacks valiosos da comunidade. Mudou minha forma de investir.' },
              { nome: 'Priya Santos',   user: '@priya.fi',     texto: 'O feed de teses é o melhor. Leio análises fundamentadas escritas por pessoas que realmente têm o dinheiro na mesa.' },
            ].map((d, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map((s) => <Star key={s} size={12} className="text-emerald-400 fill-emerald-400" />)}
                </div>
                <p className="text-white/60 text-xs leading-relaxed mb-4">"{d.texto}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                    {d.nome[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{d.nome}</p>
                    <p className="text-[10px] text-white/40">{d.user}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Zap size={16} className="text-emerald-400" />
            <span className="text-emerald-400 text-xs uppercase tracking-widest font-medium">Gratuito para sempre</span>
          </div>
          <h2 className="font-display font-black text-4xl md:text-6xl text-white mb-6 leading-tight">
            Pronto para investir<br /><span className="text-emerald-400 text-glow">com a comunidade?</span>
          </h2>
          <p className="text-white/50 mb-10 text-base leading-relaxed">
            Crie sua conta agora e comece a acompanhar operações reais de investidores como você.
          </p>
          <Link href="/auth/login"
            className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-10 py-5 rounded-2xl transition-all duration-200 glow-green text-base"
          >
            Começar agora — é grátis <ArrowRight size={18} />
          </Link>
          <p className="text-white/25 text-xs mt-6 flex items-center justify-center gap-2">
            <Shield size={11} /> Sem cartão de crédito. Sem pegadinhas.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={11} className="text-black" />
            </div>
            <span className="font-display font-bold text-white text-sm">Investagram</span>
          </div>
          <p className="text-white/25 text-xs text-center">
            A rede social dos investidores brasileiros. Compartilhe, aprenda e cresça.
          </p>
          <Link href="/auth/login" className="text-xs text-emerald-400 hover:underline">
            Acessar plataforma →
          </Link>
        </div>
      </footer>
    </div>
  )
}
