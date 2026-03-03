// ============================================================
// INVESTAGRAM - Algoritmo de Relevância
// ============================================================

type ScoreInput = {
  likes: number
  comments: number
  seguidores_autor: number
  created_at: string // ISO string
}

export function calcularScore({
  likes,
  comments,
  seguidores_autor,
  created_at,
}: ScoreInput): number {
  const base =
    likes * 2 +
    comments * 3 +
    Math.floor(seguidores_autor / 10)

  const idades = Date.now() - new Date(created_at).getTime()
  const horas  = idades / (1000 * 60 * 60)

  let frescor = 0
  if (horas < 1)  frescor = 50
  else if (horas < 6)  frescor = 30
  else if (horas < 24) frescor = 10

  return base + frescor
}
