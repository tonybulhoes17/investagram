# 🚀 INVESTAGRAM — Setup Guide

## Pré-requisitos
- Node.js 18+ (nodejs.org)
- Conta no Supabase (supabase.com) — gratuita
- Conta no Vercel (vercel.com) — gratuita

---

## 1. Configurar Supabase

1. Acesse supabase.com → New Project
2. Vá em **SQL Editor** e cole todo o conteúdo de `supabase_setup.sql`
3. Clique em **Run** — todas as tabelas serão criadas
4. Vá em **Settings > API** e copie:
   - `Project URL`
   - `anon public key`
5. Vá em **Storage** → New Bucket → Nome: `avatars` → Marque **Public**

---

## 2. Configurar variáveis de ambiente

Copie o arquivo `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
BRAPI_TOKEN=seu_token_brapi
```

**Criar conta no brapi.dev:**
- Acesse brapi.dev → Criar conta → Copiar token gratuito

---

## 3. Instalar e rodar localmente

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Acessar em:
# http://localhost:3000
```

---

## 4. Deploy no Vercel

1. Acesse vercel.com → New Project
2. Faça upload da pasta do projeto (ou conecte via GitHub)
3. Adicione as variáveis de ambiente no painel do Vercel
4. Deploy automático!

---

## Estrutura de arquivos

```
investagram/
├── app/
│   ├── auth/login/          # Tela de login
│   ├── auth/cadastro/       # Tela de cadastro
│   ├── main/feed/           # Home feed
│   ├── main/perfil/[id]/    # Perfil do usuário
│   ├── main/carteira/       # Carteira proporcional
│   ├── main/publicar/       # Criar post
│   ├── api/cotacoes/        # API de cotações
│   └── api/recuperar-senha/ # Reset de senha
├── components/
│   ├── feed/                # PostCard, FeedList
│   ├── carteira/            # Gráfico pizza
│   └── cotacoes/            # Barra de cotações
├── hooks/                   # useAuth, useFeed, useCotacoes
├── lib/                     # supabase, utils, relevancia
├── types/                   # TypeScript types
└── supabase_setup.sql       # SQL para criar tabelas
```

---

## ⚠️ Partes que precisam de ajuste manual

Ver seção no final do documento de arquitetura.
