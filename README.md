# Localiza — Inventário de Caminhões

Sistema web (e app Android, opcional) para controlar a entrada e a saída de caminhões no pátio: placa, fotos, KM, motorista, pátio, situação do veículo e trajeto dentro do pátio.

Derivado do módulo "Inventário de Caminhões" do sistema da GVEL, mas **independente**: código, banco e site próprios.

## O que tem

| Tela | Rota | Quem acessa |
|---|---|---|
| Dashboard do pátio | `/` | todos |
| Movimentações (lista, edição, exclusão) | `/movimentacoes` | todos; editar/excluir só admin |
| Registrar entrada (com até 5 fotos) | `/movimentacoes/nova` | todos |
| Detalhe do veículo (trajeto, saída, histórico, galeria de fotos) | `/veiculos/:id` | todos; editar lançamento só admin |
| Configurações: Pátios e Usuários | `/configuracoes` | só admin |

Perfis: **Administrador** (tudo) e **Operador** (pátio).

Sem clientes: a frota é toda da Localiza. Na entrada, a placa é escolhida da frota cadastrada (ou cadastra um veículo novo na hora).

## Colocar no ar (primeira vez)

### 1. Banco (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. Em **SQL Editor**, cole e rode `supabase/migrations/0001_localiza_schema.sql`.
   Ele cria tudo: tabelas, segurança (RLS), bucket de fotos e tempo real. Pode rodar de novo sem problema.
3. Em **Authentication → Users → Add user**, crie o seu login (marque *Auto Confirm User*).
4. No SQL Editor, torne-se admin:
   ```sql
   update usuarios set nivel = 'admin', nome = 'SEU NOME' where email = 'seu@email.com';
   ```
5. Publique as funções de usuário (criar, excluir, redefinir senha), com a [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase functions deploy create-usuario
   npx supabase functions deploy delete-usuario
   npx supabase functions deploy reset-senha
   ```
   Sem elas, a tela de Usuários não consegue criar logins (o resto funciona).

### 2. Configurar o app

Copie `.env.example` para `.env` e preencha com os dados de **Project Settings → API**:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### 3. Logo

Coloque o logo da Localiza em `public/logo-localiza.png` (quadrado, de preferência 512×512, fundo transparente). Ele é usado no menu, no login, na aba do navegador e no ícone do app. Sem o arquivo, aparece um selo verde com "L".

A cor principal (verde) fica em `src/index.css` (`--color-primary`) e na tabela `companies.primary_color`.

### 4. Rodar e publicar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
```

Publicação: crie um projeto novo na Vercel apontando para este repositório e configure as duas variáveis do `.env` em *Environment Variables*. O `vercel.json` já cuida das rotas.

## Estrutura

- `src/pages/` — telas (Dashboard, Movimentacoes, RegistrarEntrada, VeiculoDetalhe, Configuracoes, Login, TrocarSenha)
- `src/hooks/` — acesso aos dados (`useMovimentacoes`, `useVeiculos`, `usePatios`, `useStatusManutencao`, `useHistoricoMovimentacao`, `useUsuarios`, `useMarcasModelos`)
- `src/components/` — componentes (menu, cabeçalho, galeria de fotos, trajeto…)
- `supabase/migrations/0001_localiza_schema.sql` — banco completo
- `supabase/functions/` — Edge Functions de usuário
- `docs/modulos/patio.md` — regras do pátio
