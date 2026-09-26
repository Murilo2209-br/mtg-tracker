import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const headers = {
  "User-Agent": "MTGTracker/1.0 (projeto pessoal de estudo)",
  Accept: "application/json",
};

async function buscarCotacaoDolar(): Promise<number> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL");
  const data = await res.json();
  return data.rates.BRL;
}

async function buscarPrecoUSD(nomeCarta: string): Promise<number | null> {
  const res = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(nomeCarta)}`,
    { headers }
  );

  if (!res.ok) return null;

  const card = await res.json();
  const precoUsd = card.prices?.usd;

  return precoUsd ? parseFloat(precoUsd) : null;
}

async function main() {
  const cotacao = await buscarCotacaoDolar();
  console.log(`Cotação atual: US$ 1 = R$ ${cotacao.toFixed(2)}`);

  const cartasParaMonitorar = ["Sol Ring", "Lightning Bolt", "Counterspell"];

  for (const nome of cartasParaMonitorar) {
    console.log(`Buscando preço de: ${nome}`);

    const precoUsd = await buscarPrecoUSD(nome);

    if (precoUsd === null) {
      console.log(`Não encontrou preço em dólar para ${nome}`);
      continue;
    }

    const precoBrl = precoUsd * cotacao;

    const card = await prisma.card.findFirst({ where: { nome } });
    if (!card) {
      console.log(`Carta "${nome}" não está no banco de dados`);
      continue;
    }

    await prisma.priceHistory.create({
      data: { cardId: card.id, preco: precoBrl },
    });

    console.log(`${nome}: US$ ${precoUsd} → R$ ${precoBrl.toFixed(2)}`);

    await new Promise((r) => setTimeout(r, 200));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());