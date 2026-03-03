'use client'

import { useState, useEffect } from 'react'
import type { CotacoesData } from '@/types'

const INTERVALO = 30_000 // 30 segundos

export function useCotacoes() {
  const [cotacoes, setCotacoes] = useState<CotacoesData | null>(null)
  const [loading,  setLoading]  = useState(true)

  const buscar = async () => {
    try {
      const res  = await fetch('/api/cotacoes')
      const data = await res.json()
      setCotacoes(data)
    } catch (e) {
      console.error('Erro ao buscar cotações:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    buscar()
    const intervalo = setInterval(buscar, INTERVALO)
    return () => clearInterval(intervalo)
  }, [])

  return { cotacoes, loading }
}
