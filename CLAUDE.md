# Controlo Financeiro — CLAUDE.md

Ferramenta pessoal (uso interno) para registar **entradas e saídas** de dinheiro de **duas empresas**, em **AOA e USDT**, por **carteira** (banco ou wallet Binance), com **categoria** (finalidade) e **destino** (para onde foi o valor).

Utilizador único (dono). Sem multi-tenant. Sem registo público.

---

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js 20 + Fastify + TypeScript |
| ORM / BD | Prisma + PostgreSQL |
| Frontend | React 18 + Vite + Tailwind + TypeScript |
| Auth | Email + password (argon2), JWT em cookie httpOnly |
| Excel | exceljs |
| Deploy | VPS pessoal: PM2 + Nginx + HTTPS (certbot) |

**Não usar:** Redis, BullMQ, SMS, Cloudinary, ProxyPay. Não são necessários aqui.

---

## 2. Regras críticas

1. **Dinheiro nunca em `float`.** Usar `Decimal` (Prisma) / `decimal.js`. Na API, valores viajam como **string** (`"1250.50"`).
2. **Cada valor fica na moeda original** (AOA ou USDT), com decimais. **Não** converter tudo para AOA inteiro (exceção à convenção habitual: USDT tem decimais).
3. **Saldo nunca é guardado.** É sempre calculado: `saldoInicial + Σ entradas − Σ saídas` por carteira.
4. **Moeda do movimento = moeda da carteira.** O formulário mostra a moeda preenchida automaticamente (só leitura). Banco com duas moedas → criar duas carteiras.
5. **Soft delete** em movimentos (`eliminadoEm`). Nunca apagar definitivamente.
6. **Totais em AOA são estimativa**, calculados com a taxa USDT→AOA registada. Totais por moeda são os valores reais.
7. Toda a UI em **português (pt-AO)**; formato de números `1 250,50`; datas `dd/mm/aaaa`.
8. **Mobile-first.** O registo rápido é feito sobretudo no telemóvel.

---

## 3. Modelo de dados (Prisma)

```prisma
enum Moeda        { AOA USDT }
enum TipoCarteira { BANCO WALLET_BINANCE OUTRO }
enum TipoMovimento { ENTRADA SAIDA }
enum TipoCategoria { ENTRADA SAIDA AMBOS }
enum TipoDestino  { PESSOA FORNECEDOR CLIENTE CARTEIRA_EXTERNA OUTRO }

model User {
  id           String   @id @default(cuid())
  nome         String
  email        String   @unique
  passwordHash String
  criadoEm     DateTime @default(now())
}

model Empresa {
  id         String   @id @default(cuid())
  nome       String
  nif        String?
  ativa      Boolean  @default(true)
  carteiras  Carteira[]
  movimentos Movimento[]
  categorias Categoria[]
  destinos   Destino[]
}

model Carteira {
  id           String       @id @default(cuid())
  empresaId    String
  empresa      Empresa      @relation(fields: [empresaId], references: [id])
  nome         String       // ex.: "BAI Kwanzas", "Binance USDT"
  tipo         TipoCarteira
  moeda        Moeda
  saldoInicial Decimal      @default(0) @db.Decimal(20, 8)
  ativa        Boolean      @default(true)
  movimentos   Movimento[]
  @@unique([empresaId, nome])
}

model Categoria {            // FINALIDADE: salários, fornecedor, impostos, venda...
  id        String        @id @default(cuid())
  empresaId String
  empresa   Empresa       @relation(fields: [empresaId], references: [id])
  nome      String
  tipo      TipoCategoria @default(AMBOS)
  ativa     Boolean       @default(true)
  @@unique([empresaId, nome])
}

model Destino {              // PARA ONDE foi o valor: pessoa, fornecedor, cliente...
  id        String      @id @default(cuid())
  empresaId String
  empresa   Empresa     @relation(fields: [empresaId], references: [id])
  nome      String
  tipo      TipoDestino @default(OUTRO)
  ativo     Boolean     @default(true)
  @@unique([empresaId, nome])
}

model Movimento {
  id            String        @id @default(cuid())
  empresaId     String
  empresa       Empresa       @relation(fields: [empresaId], references: [id])
  carteiraId    String
  carteira      Carteira      @relation(fields: [carteiraId], references: [id])
  tipo          TipoMovimento
  valor         Decimal       @db.Decimal(20, 8)   // sempre positivo
  moeda         Moeda                              // copiada da carteira
  taxaCambio    Decimal?      @db.Decimal(20, 8)   // AOA por 1 USDT (opcional)
  categoriaId   String?
  destinoId     String?
  data          DateTime                           // data do movimento
  descricao     String?
  transferenciaId String?                          // liga as 2 pernas de uma transferência/câmbio
  criadoEm      DateTime      @default(now())
  atualizadoEm  DateTime      @updatedAt
  eliminadoEm   DateTime?
  @@index([empresaId, data])
  @@index([carteiraId, data])
  @@index([transferenciaId])
}

model TaxaCambio {           // histórico da taxa USDT→AOA
  id    String   @id @default(cuid())
  data  DateTime @default(now())
  valor Decimal  @db.Decimal(20, 8)   // AOA por 1 USDT
}
```

Validações (servidor):
- `valor > 0`.
- `carteira.empresaId === empresaId`; `categoria` e `destino` pertencem à mesma empresa.
- `categoria.tipo` compatível com `tipo` do movimento.
- `moeda` é sempre derivada da carteira (ignorar o que vier do cliente).

---

## 4. API (REST, prefixo `/api`)

Todas protegidas por auth, exceto `POST /auth/login`.

| Método | Rota | Função |
|---|---|---|
| POST | `/auth/login` · `/auth/logout` · GET `/auth/me` | Sessão |
| CRUD | `/empresas` | Empresas |
| CRUD | `/carteiras?empresaId=` | Carteiras |
| CRUD | `/categorias?empresaId=` | Categorias |
| CRUD | `/destinos?empresaId=` | Destinos |
| GET | `/movimentos` | Lista com filtros + paginação |
| POST | `/movimentos` | Criar entrada/saída |
| PATCH/DELETE | `/movimentos/:id` | Editar / soft delete |
| POST | `/transferencias` | Transferência ou câmbio entre carteiras (2 movimentos ligados) |
| GET | `/saldos?empresaId=` | Saldo por carteira e por moeda |
| GET | `/dashboard?empresaId=&de=&ate=` | Resumo: entradas/saídas por moeda, por categoria, por destino, estimativa AOA |
| GET/POST | `/taxas` | Histórico / nova taxa USDT→AOA |
| GET | `/exportar/movimentos.xlsx` | Excel com os mesmos filtros do histórico |

Filtros de `/movimentos`: `empresaId`, `carteiraId`, `moeda`, `tipo`, `categoriaId`, `destinoId`, `de`, `ate`, `q` (texto), `page`, `limit`.

---

## 5. Ecrãs (frontend)

1. **Login.**
2. **Seletor de empresa** fixo no topo (lembra a última escolha).
3. **Registo rápido** (ecrã principal). Ordem dos campos:
   `Entrada/Saída` → `Carteira` → `Valor` (moeda automática) → `Categoria` → `Destino` → `Data` (hoje por defeito) → `Nota`.
   Permitir criar categoria/destino novos sem sair do formulário.
4. **Dashboard:** cartões de saldo por carteira; totais por moeda; entradas vs saídas do período; top categorias; top destinos; estimativa em AOA.
5. **Histórico:** tabela com filtros, edição, eliminação, exportar Excel.
6. **Transferência / Câmbio:** origem, destino, valor enviado, valor recebido, taxa.
7. **Definições:** empresas, carteiras, categorias, destinos, taxa USDT→AOA.

---

## 6. Transferência / câmbio

`POST /transferencias` cria **2 movimentos** com o mesmo `transferenciaId`:
- SAÍDA na carteira de origem (valor enviado, na moeda de origem);
- ENTRADA na carteira de destino (valor recebido, na moeda de destino).

Se as moedas diferem, guardar a `taxaCambio` usada. Se a transferência for entre empresas, as duas pernas pertencem a empresas diferentes. Eliminar uma perna elimina a outra (mesma transação).

---

## 7. Segurança

- Passwords com **argon2**. Cookie `httpOnly`, `secure`, `sameSite=strict`.
- Rate limit no login (`@fastify/rate-limit`).
- Validação de input com **zod** em todas as rotas.
- HTTPS obrigatório (Nginx + certbot).
- `.env` fora do Git. Variáveis: `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `PORT`, `NODE_ENV`.
- Utilizador criado por **seed/CLI** (`npm run user:create`), não por endpoint público.

---

## 8. Estrutura de pastas

```
/
├─ CLAUDE.md
├─ SPRINTS.md
├─ backend/
│  ├─ prisma/ (schema.prisma, seed.ts)
│  └─ src/ (server.ts, routes/, services/, schemas/, lib/)
├─ frontend/
│  └─ src/ (pages/, components/, api/, lib/)
└─ deploy/ (ecosystem.config.js, nginx.conf, backup.sh)
```

---

## 9. Deploy e backups

- PM2 para o backend; Nginx serve o build do frontend e faz proxy de `/api`.
- **Backup diário** do PostgreSQL com `pg_dump` (cron), retenção 30 dias, cópia fora do VPS.
- Testar o restauro pelo menos uma vez.

---

## 10. Convenções de código

- TypeScript estrito. Nomes de entidades e UI em português; código em inglês onde for técnico.
- Lógica de saldos e dashboard em `services/`, com testes (Vitest) para: saldo, transferência, câmbio, soft delete.
- Commits pequenos, um por tarefa do `SPRINTS.md`.
