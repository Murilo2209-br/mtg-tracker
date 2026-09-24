-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "edicao" TEXT NOT NULL,
    "imagemUrl" TEXT NOT NULL,
    "scryfallId" TEXT NOT NULL,
    "ligamagicId" TEXT,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "dataColetada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_scryfallId_key" ON "Card"("scryfallId");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
