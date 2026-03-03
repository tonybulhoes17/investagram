import { supabase } from '@/lib/supabase'

export async function criarNotificacao({
  userId,
  actorId,
  tipo,
  postId,
}: {
  userId:  string
  actorId: string
  tipo:    'curtida' | 'comentario' | 'seguiu'
  postId?: string
}) {
  // Não notifica a si mesmo
  if (userId === actorId) return

  // Evita duplicata de curtida no mesmo post
  if (tipo === 'curtida' && postId) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id',  userId)
      .eq('actor_id', actorId)
      .eq('tipo',     'curtida')
      .eq('post_id',  postId)
    if ((count ?? 0) > 0) return
  }

  // Evita duplicata de seguiu
  if (tipo === 'seguiu') {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id',  userId)
      .eq('actor_id', actorId)
      .eq('tipo',     'seguiu')
    if ((count ?? 0) > 0) return
  }

  await supabase.from('notifications').insert({
    user_id:  userId,
    actor_id: actorId,
    tipo,
    post_id:  postId ?? null,
  })
}
