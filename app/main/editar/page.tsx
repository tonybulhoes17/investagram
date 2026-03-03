'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Camera, Save, ArrowLeft, User, Globe, Calendar, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const PAISES = ['Brasil', 'Estados Unidos', 'Portugal', 'Argentina', 'Chile', 'México', 'Outro']

export default function EditarPerfilPage() {
  const router        = useRouter()
  const { user, profile } = useAuth()
  const fileInputRef  = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nome:     '',
    username: '',
    bio:      '',
    idade:    '',
    pais:     'Brasil',
  })
  const [fotoUrl,       setFotoUrl]       = useState<string | null>(null)
  const [novaFoto,      setNovaFoto]      = useState<File | null>(null)
  const [previewFoto,   setPreviewFoto]   = useState<string | null>(null)
  const [salvando,      setSalvando]      = useState(false)
  const [carregando,    setCarregando]    = useState(true)

  useEffect(() => {
    if (profile) {
      setForm({
        nome:     profile.nome     ?? '',
        username: profile.username ?? '',
        bio:      profile.bio      ?? '',
        idade:    profile.idade    ? String(profile.idade) : '',
        pais:     profile.pais     ?? 'Brasil',
      })
      setFotoUrl(profile.foto_url ?? null)
      setCarregando(false)
    }
  }, [profile])

  const atualizar = (campo: string, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }))

  // Seleção de nova foto
  const handleSelecionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Foto muito grande. Máximo 5MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida.')
      return
    }

    setNovaFoto(file)
    // Preview local imediato
    const reader = new FileReader()
    reader.onload = (ev) => setPreviewFoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSalvar = async () => {
    if (!user) return
    if (!form.nome.trim())     { toast.error('Nome é obrigatório'); return }
    if (!form.username.trim()) { toast.error('Username é obrigatório'); return }
    if (!/^[a-z0-9_]+$/.test(form.username)) {
      toast.error('Username só pode ter letras minúsculas, números e _')
      return
    }

    setSalvando(true)

    try {
      let novaFotoUrl = fotoUrl

      // Upload da foto se selecionou uma nova
      if (novaFoto) {
        const ext      = novaFoto.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, novaFoto, { upsert: true })

        if (uploadError) {
          toast.error('Erro ao enviar foto. Verifique se o bucket "avatars" está criado no Supabase.')
          setSalvando(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        novaFotoUrl = urlData.publicUrl
      }

      // Atualiza o perfil no banco
      const { error } = await supabase
        .from('profiles')
        .update({
          nome:     form.nome.trim(),
          username: form.username.toLowerCase().trim(),
          bio:      form.bio.trim() || null,
          idade:    form.idade ? Number(form.idade) : null,
          pais:     form.pais,
          foto_url: novaFotoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        if (error.message.includes('unique')) {
          toast.error('Este @username já está em uso')
        } else {
          toast.error('Erro ao salvar perfil')
        }
        setSalvando(false)
        return
      }

      toast.success('Perfil atualizado! ✅')
      router.push(`/main/perfil/${user.id}`)

    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.')
      setSalvando(false)
    }
  }

  const fotoExibida = previewFoto ?? fotoUrl

  if (carregando) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="card p-10 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-brand-muted hover:text-white transition-colors rounded-xl hover:bg-brand-surface"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white">Editar perfil</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 space-y-5"
      >
        {/* FOTO DE PERFIL */}
        <div className="flex flex-col items-center gap-3 pb-5 border-b border-brand-border">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-brand-surface border-2 border-brand-border overflow-hidden">
              {fotoExibida ? (
                <img
                  src={fotoExibida}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-brand-muted">
                  {form.nome?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
            </div>

            {/* Botão câmera sobre a foto */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-brand-green rounded-full flex items-center justify-center hover:bg-brand-green-dim transition-colors shadow-lg"
            >
              <Camera size={15} className="text-brand-dark" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleSelecionarFoto}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-brand-green hover:underline"
          >
            {fotoExibida ? 'Trocar foto' : 'Adicionar foto de perfil'}
          </button>

          {novaFoto && (
            <p className="text-xs text-brand-muted">
              📷 {novaFoto.name} ({(novaFoto.size / 1024).toFixed(0)}KB) — será salvo ao clicar em Salvar
            </p>
          )}
        </div>

        {/* NOME */}
        <div>
          <label className="block text-sm text-brand-muted mb-2">Nome completo *</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              value={form.nome}
              onChange={(e) => atualizar('nome', e.target.value)}
              placeholder="Seu nome"
              className="input pl-9"
            />
          </div>
        </div>

        {/* USERNAME */}
        <div>
          <label className="block text-sm text-brand-muted mb-2">@username *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm">@</span>
            <input
              type="text"
              value={form.username}
              onChange={(e) => atualizar('username', e.target.value.toLowerCase())}
              placeholder="seuusername"
              className="input pl-7"
              maxLength={30}
            />
          </div>
          <p className="text-xs text-brand-muted mt-1">Apenas letras minúsculas, números e _</p>
        </div>

        {/* BIO */}
        <div>
          <label className="block text-sm text-brand-muted mb-2">
            <FileText size={13} className="inline mr-1" />
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => atualizar('bio', e.target.value)}
            placeholder="Fale um pouco sobre você e seus investimentos..."
            maxLength={160}
            rows={3}
            className="input resize-none"
          />
          <p className="text-xs text-brand-muted mt-1 text-right">{form.bio.length}/160</p>
        </div>

        {/* IDADE E PAÍS */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-brand-muted mb-2">
              <Calendar size={13} className="inline mr-1" />
              Idade
            </label>
            <input
              type="number"
              value={form.idade}
              onChange={(e) => atualizar('idade', e.target.value)}
              placeholder="38"
              min={13}
              max={99}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-2">
              <Globe size={13} className="inline mr-1" />
              País
            </label>
            <select
              value={form.pais}
              onChange={(e) => atualizar('pais', e.target.value)}
              className="input appearance-none"
            >
              {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* BOTÃO SALVAR */}
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {salvando ? (
            <>
              <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={16} />
              Salvar alterações
            </>
          )}
        </button>

        {/* Link trocar senha */}
        <div className="text-center pt-2 border-t border-brand-border">
          <button
            onClick={() => router.push('/main/senha')}
            className="text-sm text-brand-muted hover:text-white transition-colors"
          >
            🔒 Trocar senha
          </button>
        </div>
      </motion.div>
    </div>
  )
}
