'use client'

import { useState, useEffect } from 'react'
import type { Noticia } from '@/app/api/noticias/route'

const INTERVALO = 5 * 60 * 1000 // 5 minutos

export function useNoticias() {
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [loading,  setLoading]  = useState(true)

  const buscar = async () => {
    try {
      const res  = await fetch('/api/noticias')
      const data = await res.json()
      setNoticias(data)
    } catch (e) {
      console.error('Erro ao buscar notícias:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    buscar()
    const intervalo = setInterval(buscar, INTERVALO)
    return () => clearInterval(intervalo)
  }, [])

  return { noticias, loading, atualizar: buscar }
}
