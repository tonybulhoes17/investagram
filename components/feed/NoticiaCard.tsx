'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Clock, Newspaper } from 'lucide-react'
import { tempoRelativo } from '@/lib/utils'
import type { Noticia } from '@/app/api/noticias/route'

type Props = {
  noticia: Noticia
}

const CATEGORIA_CONFIG = {
  cripto:   { label: 'CRIPTO',   cor: 'bg-brand-green/20 text-brand-green'  },
  acoes:    { label: 'AÇÕES',    cor: 'bg-blue-500/20 text-blue-400'         },
  economia: { label: 'ECONOMIA', cor: 'bg-yellow-500/20 text-yellow-400'     },
  global:   { label: 'GLOBAL',   cor: 'bg-purple-500/20 text-purple-400'     },
}

export function NoticiaCard({ noticia }: Props) {
  const config = CATEGORIA_CONFIG[noticia.categoria]

  return (
    <motion.a
      href={noticia.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-4 flex gap-4 hover:border-blue-500/40 transition-colors duration-200 group cursor-pointer"
    >
      {/* Imagem (se houver) */}
      {noticia.imagem && (
        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-brand-surface">
          <img
            src={noticia.imagem}
            alt={noticia.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {/* Header: badge + fonte + tempo */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Badge NOTÍCIA */}
          <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
            <Newspaper size={9} />
            NOTÍCIA
          </span>

          {/* Badge categoria */}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.cor}`}>
            {config.label}
          </span>

          {/* Fonte */}
          <span className="text-xs text-brand-muted">{noticia.fonte}</span>

          {/* Tempo */}
          <span className="flex items-center gap-1 text-xs text-brand-muted ml-auto">
            <Clock size={10} />
            {tempoRelativo(noticia.publicado)}
          </span>
        </div>

        {/* Título */}
        <p className="text-sm font-semibold text-white leading-snug mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">
          {noticia.titulo}
        </p>

        {/* Resumo */}
        {noticia.resumo && (
          <p className="text-xs text-brand-muted leading-relaxed line-clamp-2">
            {noticia.resumo}
          </p>
        )}

        {/* Link */}
        <div className="flex items-center gap-1 mt-2 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={10} />
          <span>Ler artigo completo</span>
        </div>
      </div>
    </motion.a>
  )
}
