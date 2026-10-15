# Controlo Financeiro — SPRINTS.md

Plano por fases. Cada sprint termina com algo utilizável. Ler `CLAUDE.md` antes de cada sprint.

Legenda: `[ ]` por fazer · `[x]` feito

---

## Sprint 0 — Base e autenticação

- [x] Monorepo `backend/` + `frontend/`, TypeScript, ESLint
- [x] Fastify + Prisma + PostgreSQL ligados
- [x] `schema.prisma` completo (ver CLAUDE.md §3) + primeira migração
- [x] Login/logout/me (argon2 + cookie httpOnly) + rate limit
- [x] Script `npm run user:create`
- [x] Frontend: Vite + Tailwind, ecrã de login, rota protegida

**Aceitação:** consigo criar o meu utilizador, entrar e sair; rotas sem sessão devolvem 401.

---

## Sprint 1 — Cadastros

- [ ] CRUD Empresas (2 empresas no seed)
- [ ] CRUD Carteiras (tipo, moeda, saldo inicial)
- [ ] CRUD Categorias (por empresa, tipo entrada/saída/ambos)
- [ ] CRUD Destinos (por empresa, com tipo)
- [ ] Seed com exemplos: carteiras "Banco AOA" e "Binance USDT"; categorias base (Venda, Serviço, Salários, Fornecedor, Impostos, Outros)
- [ ] Seletor de empresa no topo (persistente)
- [ ] Ecrã de Definições

**Aceitação:** configuro as duas empresas com as suas carteiras, categorias e destinos.

---

## Sprint 2 — Registo de movimentos e saldos

- [ ] `POST /movimentos` com todas as validações (CLAUDE.md §3)
- [ ] Moeda derivada da carteira
- [ ] `GET /saldos` (por carteira e por moeda)
- [ ] Ecrã **Registo rápido** (mobile-first), com criação inline de categoria/destino
- [ ] Editar e eliminar (soft delete)
- [ ] Testes: cálculo de saldo, validações

**Aceitação:** registo uma entrada em USDT e uma saída em AOA em menos de 15 segundos cada; os saldos batem certo.

---

## Sprint 3 — Histórico e dashboard

- [ ] `GET /movimentos` com filtros e paginação
- [ ] Ecrã Histórico (tabela, filtros, pesquisa)
- [ ] `GET /dashboard` (totais por moeda, por categoria, por destino, por período)
- [ ] Ecrã Dashboard (cartões de saldo, entradas vs saídas, top categorias/destinos)
- [ ] Tabela `TaxaCambio` + `GET/POST /taxas`
- [ ] Estimativa total em AOA com a taxa mais recente (identificada como estimativa)

**Aceitação:** vejo, por empresa e período, quanto entrou, quanto saiu e para onde, em AOA e USDT separados.

---

## Sprint 4 — Transferências e câmbio

- [ ] `POST /transferencias` (2 movimentos ligados por `transferenciaId`)
- [ ] Suporte a câmbio USDT↔AOA com taxa guardada
- [ ] Suporte a transferência entre empresas
- [ ] Eliminar uma perna elimina a outra (transação)
- [ ] Ecrã Transferência / Câmbio
- [ ] Excluir transferências internas dos totais de "entradas/saídas" do dashboard (ou mostrá-las à parte)
- [ ] Testes: câmbio, eliminação ligada, dashboard sem dupla contagem

**Aceitação:** converter USDT em Kwanzas atualiza os dois saldos e não conta como receita nem despesa.

---

## Sprint 5 — Exportação, deploy e backups

- [ ] `GET /exportar/movimentos.xlsx` com os filtros do histórico
- [ ] `ecosystem.config.js` (PM2), `nginx.conf`, HTTPS com certbot
- [ ] Build do frontend servido pelo Nginx; `/api` em proxy
- [ ] `backup.sh` com `pg_dump` diário (cron), retenção 30 dias, cópia fora do VPS
- [ ] Testar o restauro de um backup
- [ ] Revisão de segurança (cookies, CORS, variáveis de ambiente)

**Aceitação:** a app está online em HTTPS, o Excel exporta, e um backup restaura sem erros.

---

## Fase futura (só se fizer falta)

- Anexos (comprovativos/PDF) por movimento
- Importar extrato bancário (CSV)
- Mais moedas (USD, EUR)
- Orçamento mensal por categoria
- Registo de auditoria (quem alterou o quê)
