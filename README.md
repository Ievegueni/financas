# Controlo Financeiro

Ver `CLAUDE.md` (especificação) e `SPRINTS.md` (plano).

## Arranque local

```bash
npm install
cp backend/.env.example backend/.env   # editar segredos (≥32 caracteres)
cd backend && npx prisma migrate dev && cd ..
npm run user:create -- --nome "Nome" --email eu@exemplo.com
npm run dev:backend    # http://127.0.0.1:3000
npm run dev:frontend   # http://localhost:5173 (proxy /api → backend)
```

Verificações: `npm run lint`, `npm run typecheck`, `npm test`.
