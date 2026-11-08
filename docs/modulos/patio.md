# Pátio — Inventário de Caminhões

Controle de entrada e saída dos caminhões da frota da Localiza no pátio.

- **Telas:** `Dashboard.tsx` (`/`), `Movimentacoes.tsx`, `RegistrarEntrada.tsx`, `VeiculoDetalhe.tsx`
- **Dados:** `useMovimentacoes`, `useVeiculos`, `usePatios`, `useStatusManutencao`, `useHistoricoMovimentacao`
- **Tabelas:** `movimentacoes`, `veiculos`, `patios`, `status_manutencao`, `movimentacao_historico`

## Fluxo

1. **Entrada** (`registrarEntrada`): escolhe a placa da frota (ou cadastra um veículo novo — `upsertVeiculo` pela placa) e grava a movimentação com `status = 'no_patio'`, pátio, motorista, KM e até 5 fotos (frente, laterais, traseira, painel) mais fotos extras. Quem registrou é gravado pelo trigger `set_movimentacao_usuario`. Sem internet, a entrada fica como rascunho no aparelho (`src/lib/rascunhosEntrada.ts`) para reenviar depois.
2. **No pátio:** o veículo pode trocar de pátio e de situação (`status_manutencao`). Cada etapa do trajeto vai para `movimentacao_historico`.
3. **Saída** (`registrarSaida`): grava data, KM, destino e `status = 'saiu'`.

Todas as gravações disparam o evento `movimentacao_updated` no navegador, e `movimentacoes` está no Realtime: as outras telas atualizam sozinhas.

## Dashboard

Veículos no pátio, entradas/saídas e mudanças de etapa do período, agrupados por **pátio**. Filtros por placa, período, pátio, marca, modelo e situação. Admin exporta a lista do pátio em CSV (abre no Excel) com os dias parados.

## Pátios e situações

Pátios: Configurações → Pátios, ou "+ Criar" nos formulários. Nomes em maiúsculas. Pátios duplicados se corrigem com **Mesclar**, que move as movimentações para o destino e apaga a origem.

Situações (`status_manutencao`): o banco já vem com CORRETIVA e PREVENTIVA; novas podem ser criadas pelos formulários.

## Regras

- Editar e excluir movimentações, editar lançamentos na tela do veículo: só admin (a exclusão também é travada no banco).
- Configurações (pátios e usuários): só admin.
- Um operador não consegue se promover a admin (trigger `protege_campos_usuario`).
- Fotos ficam no bucket `fotos-inspecao`, na pasta com o id da empresa.
