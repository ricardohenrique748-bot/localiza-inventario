-- ============================================================
-- RESET DE DADOS: apaga tudo o que foi cadastrado no sistema.
-- Rodar no Supabase > SQL Editor. NÃO TEM VOLTA.
--
-- Mantém: estrutura das tabelas, a empresa LOCALIZA e os logins
-- (usuarios / auth.users), senão ninguém consegue entrar.
-- ============================================================

begin;

-- Histórico de trajeto, movimentações e veículos
truncate table movimentacao_historico, movimentacoes, veiculos restart identity cascade;

-- Cadastros auxiliares
truncate table patios, status_manutencao restart identity cascade;

-- Catálogo de marcas e modelos
truncate table modelos, marcas restart identity cascade;

commit;

-- ------------------------------------------------------------
-- OPCIONAL: apagar também todos os usuários que NÃO são admin.
-- Tire os "--" das linhas abaixo para executar.
-- ------------------------------------------------------------
-- delete from auth.users
-- where id in (select id from public.usuarios where nivel <> 'admin');

-- ------------------------------------------------------------
-- Fotos: o Supabase não deixa apagar arquivos do Storage por SQL.
-- Apague pelo painel: Storage > bucket "fotos-inspecao" >
-- selecione as pastas > Delete.
-- ------------------------------------------------------------
