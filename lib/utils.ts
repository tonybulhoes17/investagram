import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Utilitário de classes CSS (clsx + tailwind-merge)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata data relativa: "há 2 horas", "há 3 dias"
export function tempoRelativo(date: string) {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ptBR,
  })
}

// Formata número grande: 1200 -> "1,2K"
export function formatarNumero(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// Formata preço em BRL
export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(valor)
}

// Formata variação percentual com sinal
export function formatarVariacao(v: number): string {
  const sinal = v >= 0 ? '+' : ''
  return `${sinal}${v.toFixed(2)}%`
}

// Cor da variação (verde/vermelho)
export function corVariacao(v: number): string {
  return v >= 0 ? 'text-brand-green' : 'text-red-400'
}
