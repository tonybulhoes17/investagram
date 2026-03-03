-- ============================================================
-- INVESTAGRAM - Setup Completo do Banco de Dados
-- Execute no SQL Editor do Supabase (painel web)
-- ============================================================

-- 1. PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  nome        TEXT NOT NULL,
  foto_url    TEXT,
  bio         TEXT CHECK (char_length(bio) <= 160),
  idade       INTEGER CHECK (idade >= 13 AND idade <= 120),
  pais        TEXT DEFAULT 'Brasil',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. POSTS
CREATE TABLE IF NOT EXISTS posts (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('movimentacao', 'tese')),
  subtipo           TEXT CHECK (subtipo IN ('compra', 'venda') OR subtipo IS NULL),
  ativo_nome        TEXT,
  ativo_classe      TEXT,
  conteudo          TEXT CHECK (char_length(conteudo) <= 2000),
  data_operacao     DATE,
  score_relevancia  INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CURTIDAS
CREATE TABLE IF NOT EXISTS likes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 4. COMENTÁRIOS
CREATE TABLE IF NOT EXISTS comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  conteudo    TEXT NOT NULL CHECK (char_length(conteudo) <= 500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SEGUIDORES
CREATE TABLE IF NOT EXISTS followers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 6. CARTEIRAS
CREATE TABLE IF NOT EXISTS portfolios (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  mostrar_valores  BOOLEAN DEFAULT FALSE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ATIVOS DA CARTEIRA
CREATE TABLE IF NOT EXISTS portfolio_assets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id    UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  classe          TEXT NOT NULL,
  nome            TEXT NOT NULL,
  ticker          TEXT,
  percentual      DECIMAL(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  valor_absoluto  DECIMAL(15,2),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SOLICITAÇÕES DE RESET DE SENHA
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email          TEXT NOT NULL,
  status         TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvido')),
  solicitado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Segurança por linha
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;

-- PROFILES: qualquer um pode ler, só o dono pode editar
CREATE POLICY "Perfis são públicos" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Usuário edita próprio perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuário insere próprio perfil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- POSTS: qualquer um pode ler, só autor pode criar/deletar
CREATE POLICY "Posts são públicos" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Usuário cria posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário deleta próprios posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- LIKES
CREATE POLICY "Likes são públicos" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Usuário dá likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário remove próprios likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS
CREATE POLICY "Comentários são públicos" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Usuário comenta" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário deleta próprios comentários" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- FOLLOWERS
CREATE POLICY "Seguidores são públicos" ON followers
  FOR SELECT USING (true);

CREATE POLICY "Usuário segue" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Usuário deixa de seguir" ON followers
  FOR DELETE USING (auth.uid() = follower_id);

-- PORTFOLIOS
CREATE POLICY "Carteiras são públicas" ON portfolios
  FOR SELECT USING (true);

CREATE POLICY "Usuário gerencia própria carteira" ON portfolios
  FOR ALL USING (auth.uid() = user_id);

-- PORTFOLIO ASSETS
CREATE POLICY "Ativos são públicos" ON portfolio_assets
  FOR SELECT USING (true);

CREATE POLICY "Usuário gerencia próprios ativos" ON portfolio_assets
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
  );

-- ============================================================
-- TRIGGER: Criar perfil automaticamente ao criar usuário
-- ============================================================
-- NOTA: Isso ainda requer que o frontend envie os dados do perfil
-- O trigger abaixo cria um perfil básico vazio (pode melhorar depois)

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id        ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_score          ON posts(score_relevancia DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at     ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_id        ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id     ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower   ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following  ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user       ON portfolios(user_id);

-- ============================================================
-- STORAGE: Bucket para fotos de perfil
-- Execute no Supabase Dashboard > Storage > New Bucket
-- Nome: "avatars" | Public: true
-- ============================================================
