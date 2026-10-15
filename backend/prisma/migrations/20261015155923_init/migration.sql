-- CreateEnum
CREATE TYPE "Moeda" AS ENUM ('AOA', 'USDT');

-- CreateEnum
CREATE TYPE "TipoCarteira" AS ENUM ('BANCO', 'WALLET_BINANCE', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('ENTRADA', 'SAIDA', 'AMBOS');

-- CreateEnum
CREATE TYPE "TipoDestino" AS ENUM ('PESSOA', 'FORNECEDOR', 'CLIENTE', 'CARTEIRA_EXTERNA', 'OUTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nif" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carteira" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCarteira" NOT NULL,
    "moeda" "Moeda" NOT NULL,
    "saldoInicial" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Carteira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL DEFAULT 'AMBOS',
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destino" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoDestino" NOT NULL DEFAULT 'OUTRO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Destino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "carteiraId" TEXT NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "valor" DECIMAL(20,8) NOT NULL,
    "moeda" "Moeda" NOT NULL,
    "taxaCambio" DECIMAL(20,8),
    "categoriaId" TEXT,
    "destinoId" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "transferenciaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "eliminadoEm" TIMESTAMP(3),

    CONSTRAINT "Movimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxaCambio" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor" DECIMAL(20,8) NOT NULL,

    CONSTRAINT "TaxaCambio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Carteira_empresaId_nome_key" ON "Carteira"("empresaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_empresaId_nome_key" ON "Categoria"("empresaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Destino_empresaId_nome_key" ON "Destino"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "Movimento_empresaId_data_idx" ON "Movimento"("empresaId", "data");

-- CreateIndex
CREATE INDEX "Movimento_carteiraId_data_idx" ON "Movimento"("carteiraId", "data");

-- CreateIndex
CREATE INDEX "Movimento_transferenciaId_idx" ON "Movimento"("transferenciaId");

-- AddForeignKey
ALTER TABLE "Carteira" ADD CONSTRAINT "Carteira_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destino" ADD CONSTRAINT "Destino_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_carteiraId_fkey" FOREIGN KEY ("carteiraId") REFERENCES "Carteira"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE SET NULL ON UPDATE CASCADE;
