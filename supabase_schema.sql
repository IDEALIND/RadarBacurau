-- ============================================================================
-- RADAR BACURAU — ESTRUTURA DO BANCO DE DADOS EM NUVEM (SUPABASE / POSTGRESQL)
-- Execute este script no menu "SQL Editor" do seu painel Supabase.
-- ============================================================================

-- 1. TABELA DE ELEITORES
create table if not exists public.eleitores (
  id text primary key,
  nome text not null,
  numero_titulo text,
  "numeroTitulo" text,
  rua text,
  numero text,
  endereco text,
  "bairroNome" text,
  "comunidadeId" text,
  secao text,
  zona text default '008',
  "liderancaNome" text,
  "liderancaId" text,
  telefone text,
  observacoes text,
  "fotoTitulo" text,
  "dataCadastro" text,
  criado_em timestamp with time zone default timezone('utc'::text, now())
);

-- 2. TABELA DE LIDERANÇAS
create table if not exists public.liderancas (
  id text primary key,
  nome text not null,
  apelido text,
  telefone text,
  email text,
  "cargoPapel" text,
  status text default 'Ativo',
  "dataInicio" text,
  "dataFim" text,
  "comunidadesVinculadas" jsonb default '[]'::jsonb,
  login text,
  senha text,
  observacoes text,
  criado_em timestamp with time zone default timezone('utc'::text, now())
);

-- 3. TABELA DE DEMANDAS COMUNITÁRIAS
create table if not exists public.demandas (
  id text primary key,
  titulo text not null,
  descricao text,
  categoria text,
  prioridade text default 'Média',
  status text default 'Pendente',
  bairro text,
  "comunidadeId" text,
  lideranca text,
  solicitante text,
  "contatoSolicitante" text,
  "dataAbertura" text,
  previsao text,
  "dataConclusao" text,
  midias jsonb default '[]'::jsonb,
  historico jsonb default '[]'::jsonb,
  criado_em timestamp with time zone default timezone('utc'::text, now())
);

-- 4. TABELA DE USUÁRIOS, LOGINS E SENHAS
create table if not exists public.usuarios (
  id text primary key,
  nome text not null,
  login text not null unique,
  senha text not null,
  email text,
  perfil text default 'LIDERANÇA COMUNITÁRIA',
  status text default 'Ativo',
  "liderancaId" text,
  "comunidadesVinculadas" jsonb default '[]'::jsonb,
  "ultimoAcesso" text,
  "dataCriacao" text,
  criado_em timestamp with time zone default timezone('utc'::text, now())
);

-- 5. CONFIGURAÇÃO DE SEGURANÇA E ACESSO TOTAL COM A CHAVE PÚBLICA (ANON)
alter table public.eleitores enable row level security;
alter table public.liderancas enable row level security;
alter table public.demandas enable row level security;
alter table public.usuarios enable row level security;

drop policy if exists "Acesso Total Eleitores" on public.eleitores;
create policy "Acesso Total Eleitores" on public.eleitores for all using (true) with check (true);

drop policy if exists "Acesso Total Liderancas" on public.liderancas;
create policy "Acesso Total Liderancas" on public.liderancas for all using (true) with check (true);

drop policy if exists "Acesso Total Demandas" on public.demandas;
create policy "Acesso Total Demandas" on public.demandas for all using (true) with check (true);

drop policy if exists "Acesso Total Usuarios" on public.usuarios;
create policy "Acesso Total Usuarios" on public.usuarios for all using (true) with check (true);

-- 6. ATIVAÇÃO DE SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
-- Permite que quando alguém cadastrar no celular ou no computador, atualize em todos os aparelhos instantaneamente!
alter publication supabase_realtime add table public.eleitores;
alter publication supabase_realtime add table public.liderancas;
alter publication supabase_realtime add table public.demandas;
alter publication supabase_realtime add table public.usuarios;
