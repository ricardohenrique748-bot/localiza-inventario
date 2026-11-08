-- ============================================================
-- Localiza — Inventário de Caminhões (controle de pátio)
-- Banco completo, num arquivo só. Rode no SQL Editor de um projeto
-- Supabase NOVO (vazio). Pode rodar de novo sem duplicar nada.
--
-- Estrutura:
--   companies              empresa (uma só: Localiza)
--   usuarios               perfil de cada login (admin / usuario = operador)
--   marcas, modelos        catálogo de caminhões (compartilhado)
--   patios                 pátios / setores
--   status_manutencao      situação do veículo no pátio (setor/oficina)
--   veiculos               frota (sem cliente: a frota é da Localiza)
--   movimentacoes          entrada/saída no pátio, com fotos e KM
--   movimentacao_historico etapas do trajeto dentro do pátio
--
-- Segurança: RLS em todas as tabelas, sempre por company_id do usuário
-- logado. Usuário comum não consegue virar admin sozinho (trigger), e só
-- admin exclui movimentações.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Empresa
-- ------------------------------------------------------------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  logo text,
  sistema_label text not null default 'INVENTÁRIO DE CAMINHÕES',
  primary_color text not null default '#009B4D',
  secondary_color text,
  observacoes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  modulos_habilitados text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Id fixo da Localiza: todo usuário novo entra nela (ver handle_new_auth_user).
insert into companies (id, name, sistema_label, primary_color, observacoes, status)
values ('81775591-b128-476e-b630-bc88f068c6ae', 'LOCALIZA', 'INVENTÁRIO DE CAMINHÕES', '#009B4D', 'Empresa principal', 'active')
on conflict (id) do nothing;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on companies;
create trigger companies_set_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Usuários (perfil de cada login do Supabase Auth)
-- ------------------------------------------------------------
create table if not exists usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  nivel text not null default 'usuario' check (nivel in ('admin', 'usuario')),
  deve_trocar_senha boolean not null default false,
  foto_url text,
  -- Mantidas por compatibilidade com as Edge Functions de usuário.
  modulos text[] not null default '{}',
  is_master_admin boolean not null default false,
  company_id uuid not null default '81775591-b128-476e-b630-bc88f068c6ae' references companies (id),
  created_at timestamptz not null default now()
);
create index if not exists idx_usuarios_company on usuarios (company_id);

-- Empresa do usuário logado. security definer: lê usuarios sem passar pelo RLS
-- (senão a própria policy de usuarios entraria em loop).
create or replace function current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from usuarios where id = auth.uid()
$$;

create or replace function is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select nivel = 'admin' from usuarios where id = auth.uid()), false)
$$;

-- Usado pelo código herdado; na Localiza ninguém é master admin.
create or replace function is_master_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_master_admin from usuarios where id = auth.uid()), false)
$$;

-- Ao criar um login no Auth, cria o perfil em usuarios (na Localiza).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, company_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    '81775591-b128-476e-b630-bc88f068c6ae'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Só admin muda nível, empresa ou master admin de alguém (inclusive de si
-- mesmo). Chamadas do servidor (Edge Functions com service role, auth.uid()
-- nulo) passam.
create or replace function protege_campos_usuario()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.nivel is distinct from old.nivel
      or new.company_id is distinct from old.company_id
      or new.is_master_admin is distinct from old.is_master_admin)
     and not is_admin_user() then
    raise exception 'Apenas administradores podem alterar o perfil de acesso.';
  end if;
  if new.is_master_admin is distinct from old.is_master_admin and not is_master_admin_user() then
    raise exception 'Apenas um admin master pode alterar esta permissão.';
  end if;
  return new;
end;
$$;

drop trigger if exists usuarios_protege_campos on usuarios;
create trigger usuarios_protege_campos
  before update on usuarios
  for each row execute function protege_campos_usuario();

-- Preenche company_id automaticamente nos inserts feitos pelo app.
create or replace function stamp_company_id()
returns trigger
language plpgsql
as $$
begin
  if new.company_id is null then
    new.company_id := current_company_id();
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Catálogo de marcas e modelos (compartilhado, sem empresa)
-- ------------------------------------------------------------
create table if not exists marcas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique
);

create table if not exists modelos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references marcas (id) on delete cascade,
  nome text not null,
  unique (marca_id, nome)
);
create index if not exists idx_modelos_marca on modelos (marca_id);

insert into marcas (nome) values
  ('VOLVO'), ('SCANIA'), ('MERCEDES-BENZ'), ('VOLKSWAGEN'), ('IVECO'),
  ('DAF'), ('FORD'), ('FIAT'), ('CHEVROLET'), ('HYUNDAI')
on conflict (nome) do nothing;

-- ------------------------------------------------------------
-- Pátios e situação do veículo
-- ------------------------------------------------------------
create table if not exists patios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id),
  nome text not null,
  created_at timestamptz not null default now(),
  unique (company_id, nome)
);

create table if not exists status_manutencao (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id),
  nome text not null,
  created_at timestamptz not null default now(),
  unique (company_id, nome)
);

insert into status_manutencao (company_id, nome) values
  ('81775591-b128-476e-b630-bc88f068c6ae', 'CORRETIVA'),
  ('81775591-b128-476e-b630-bc88f068c6ae', 'PREVENTIVA')
on conflict (company_id, nome) do nothing;

-- ------------------------------------------------------------
-- Veículos (frota da Localiza)
-- ------------------------------------------------------------
create table if not exists veiculos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id),
  placa text not null,
  marca_id uuid references marcas (id),
  modelo_id uuid references modelos (id),
  tipo text not null default 'pesado' check (tipo in ('pesado', 'leve', 'trator', 'carreta')),
  cor text,
  ano integer,
  chassi text,
  operante boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, placa)
);
create index if not exists idx_veiculos_placa on veiculos (placa);

-- ------------------------------------------------------------
-- Movimentações (entrada / saída do pátio)
-- ------------------------------------------------------------
create table if not exists movimentacoes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id),
  veiculo_id uuid not null references veiculos (id),
  motorista text,
  data_hora_entrada timestamptz not null default now(),
  data_hora_saida timestamptz,
  observacoes text,
  status text not null default 'no_patio' check (status in ('no_patio', 'saiu')),
  patio_id uuid references patios (id),
  status_id uuid references status_manutencao (id),
  destino text,
  km_entrada integer,
  km_saida integer,
  foto_frente_url text,
  foto_lado_esquerdo_url text,
  foto_lado_direito_url text,
  foto_traseira_url text,
  foto_painel_url text,
  usuario_entrada_id uuid references usuarios (id) on delete set null,
  usuario_saida_id uuid references usuarios (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_movimentacoes_veiculo on movimentacoes (veiculo_id);
create index if not exists idx_movimentacoes_status on movimentacoes (status);
create index if not exists idx_movimentacoes_patio on movimentacoes (patio_id);
create index if not exists idx_movimentacoes_status_id on movimentacoes (status_id);
create index if not exists idx_movimentacoes_entrada on movimentacoes (data_hora_entrada desc);

-- Quem registrou a entrada e a saída (usuário logado).
create or replace function set_movimentacao_usuario()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.usuario_entrada_id := coalesce(new.usuario_entrada_id, auth.uid());
  elsif tg_op = 'UPDATE' then
    if new.data_hora_saida is not null and old.data_hora_saida is null then
      new.usuario_saida_id := coalesce(new.usuario_saida_id, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_movimentacao_usuario_insert on movimentacoes;
create trigger trg_set_movimentacao_usuario_insert
  before insert on movimentacoes
  for each row execute function set_movimentacao_usuario();

drop trigger if exists trg_set_movimentacao_usuario_update on movimentacoes;
create trigger trg_set_movimentacao_usuario_update
  before update on movimentacoes
  for each row execute function set_movimentacao_usuario();

-- ------------------------------------------------------------
-- Etapas do trajeto dentro do pátio
-- ------------------------------------------------------------
create table if not exists movimentacao_historico (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id),
  movimentacao_id uuid not null references movimentacoes (id) on delete cascade,
  descricao text not null,
  data_hora timestamptz not null default now(),
  usuario_id uuid references usuarios (id) on delete set null,
  os_criada boolean not null default false,
  mecanico_executor text,
  auxiliar text,
  funcao text,
  setor text,
  data_hora_abertura timestamptz,
  data_hora_fechamento timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_movimentacao_historico_movimentacao on movimentacao_historico (movimentacao_id);
create index if not exists idx_movimentacao_historico_data_hora on movimentacao_historico (data_hora);

-- ------------------------------------------------------------
-- company_id automático + RLS por empresa
-- ------------------------------------------------------------
do $$
declare
  v_tabela text;
  v_policy record;
begin
  foreach v_tabela in array array['patios', 'status_manutencao', 'veiculos', 'movimentacoes', 'movimentacao_historico'] loop
    execute format('create index if not exists %I on %I (company_id)', 'idx_' || v_tabela || '_company', v_tabela);
    execute format('alter table %I enable row level security', v_tabela);
    for v_policy in select policyname from pg_policies where schemaname = 'public' and tablename = v_tabela loop
      execute format('drop policy %I on %I', v_policy.policyname, v_tabela);
    end loop;
    execute format(
      'create policy %I on %I for all to authenticated using (company_id = current_company_id()) with check (company_id = current_company_id())',
      'isolamento_empresa_' || v_tabela, v_tabela
    );
    execute format('drop trigger if exists %I on %I', 'stamp_company_id_' || v_tabela, v_tabela);
    execute format(
      'create trigger %I before insert on %I for each row execute function stamp_company_id()',
      'stamp_company_id_' || v_tabela, v_tabela
    );
  end loop;
end $$;

-- Só admin exclui movimentações e veículos (policy restritiva, soma com a de cima).
drop policy if exists "so_admin_exclui_movimentacoes" on movimentacoes;
create policy "so_admin_exclui_movimentacoes" on movimentacoes as restrictive for delete to authenticated
  using (is_admin_user());

drop policy if exists "so_admin_exclui_veiculos" on veiculos;
create policy "so_admin_exclui_veiculos" on veiculos as restrictive for delete to authenticated
  using (is_admin_user());

-- usuarios: cada um vê os da própria empresa; só admin cria/exclui pela tela
-- (a criação de login passa pela Edge Function create-usuario).
alter table usuarios enable row level security;
drop policy if exists "usuarios_leitura_empresa" on usuarios;
create policy "usuarios_leitura_empresa" on usuarios for select to authenticated
  using (company_id = current_company_id());
drop policy if exists "usuarios_update_proprio_ou_admin" on usuarios;
create policy "usuarios_update_proprio_ou_admin" on usuarios for update to authenticated
  using (company_id = current_company_id() and (id = auth.uid() or is_admin_user()))
  with check (company_id = current_company_id());
drop policy if exists "usuarios_delete_admin" on usuarios;
create policy "usuarios_delete_admin" on usuarios for delete to authenticated
  using (company_id = current_company_id() and is_admin_user());

-- companies: lê a própria; admin edita.
alter table companies enable row level security;
drop policy if exists "companies_leitura_propria" on companies;
create policy "companies_leitura_propria" on companies for select to authenticated
  using (id = current_company_id());
drop policy if exists "companies_update_admin" on companies;
create policy "companies_update_admin" on companies for update to authenticated
  using (id = current_company_id() and is_admin_user())
  with check (id = current_company_id() and is_admin_user());

-- marcas/modelos: qualquer usuário logado lê e cadastra; só admin exclui.
alter table marcas enable row level security;
alter table modelos enable row level security;
drop policy if exists "marcas_leitura" on marcas;
create policy "marcas_leitura" on marcas for select to authenticated using (true);
drop policy if exists "marcas_insert" on marcas;
create policy "marcas_insert" on marcas for insert to authenticated with check (true);
drop policy if exists "marcas_update_delete_admin" on marcas;
create policy "marcas_update_delete_admin" on marcas for all to authenticated using (is_admin_user()) with check (is_admin_user());
drop policy if exists "modelos_leitura" on modelos;
create policy "modelos_leitura" on modelos for select to authenticated using (true);
drop policy if exists "modelos_insert" on modelos;
create policy "modelos_insert" on modelos for insert to authenticated with check (true);
drop policy if exists "modelos_update_delete_admin" on modelos;
create policy "modelos_update_delete_admin" on modelos for all to authenticated using (is_admin_user()) with check (is_admin_user());

-- ------------------------------------------------------------
-- Fotos (Storage): bucket público para leitura das imagens, gravação só
-- de usuário logado e dentro da pasta da própria empresa.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos-inspecao', 'fotos-inspecao', true)
on conflict (id) do nothing;

drop policy if exists "fotos_empresa_gravacao" on storage.objects;
create policy "fotos_empresa_gravacao" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-inspecao' and (storage.foldername(name))[1] = current_company_id()::text);

drop policy if exists "fotos_empresa_alteracao" on storage.objects;
create policy "fotos_empresa_alteracao" on storage.objects for update to authenticated
  using (bucket_id = 'fotos-inspecao' and (storage.foldername(name))[1] = current_company_id()::text);

drop policy if exists "fotos_empresa_exclusao" on storage.objects;
create policy "fotos_empresa_exclusao" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-inspecao' and (storage.foldername(name))[1] = current_company_id()::text);

drop policy if exists "fotos_empresa_leitura" on storage.objects;
create policy "fotos_empresa_leitura" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-inspecao' and (storage.foldername(name))[1] = current_company_id()::text);

-- ------------------------------------------------------------
-- Tempo real: as telas atualizam sozinhas quando alguém registra entrada/saída.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'movimentacoes'
  ) then
    alter publication supabase_realtime add table movimentacoes;
  end if;
end $$;
alter table movimentacoes replica identity full;

-- ------------------------------------------------------------
-- PRIMEIRO ADMIN
-- 1) Em Authentication → Users → "Add user", crie o seu login (marque
--    "Auto Confirm User").
-- 2) Rode a linha abaixo trocando o e-mail:
--
-- update usuarios set nivel = 'admin', nome = 'SEU NOME' where email = 'seu@email.com';
-- ============================================================
