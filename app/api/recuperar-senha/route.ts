// ============================================================
// INVESTAGRAM - Recuperação de Senha (Versão 1 - Manual)
// Registra solicitação no banco e notifica o admin
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
  }

  // Verifica se o email existe
  const { data: users } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('id',
      (await supabase.from('auth.users' as any).select('id').eq('email', email).single())?.data?.id ?? ''
    )
    .single()

  // Registra a solicitação (crie a tabela password_reset_requests no Supabase)
  await supabase.from('password_reset_requests').insert({
    email,
    solicitado_em: new Date().toISOString(),
    status: 'pendente',
  }).throwOnError()

  // ⚠️ ALTERAR: Integrar com serviço de email (Resend, SendGrid, etc.)
  // Por enquanto, apenas registra e o admin resolve manualmente via painel Supabase
  console.log(`[RESET SENHA] Solicitação de: ${email} — verificar painel Supabase`)

  return NextResponse.json({ ok: true })
}
