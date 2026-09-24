import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function buscarPrecoLigaMagic(nomeCarta: string): Promise<number | null> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const url = `https://www.ligamagic.com.br/?view=cards/card&card=${encodeURIComponent(nomeCarta)}&tipo=1`;
  await page.goto(url, { waitUntil: "networkidle" });

  const precoTexto = await page.locator("#container-price-mkp-card .min .price").first().textContent();

  await browser.close();

  if (!precoTexto) return null;

  const precoLimpo = precoTexto.replace("R$", "").replace(".", "").replace(",", ".").trim();
  return parseFloat(precoLimpo);
}

async function main() {
  const cartasParaMonitorar = ["Sol Ring", "Lightning Bolt", "Counterspell"];

  for (const nome of cartasParaMonitorar) {
    console.log(`Buscando preço de: ${nome}`);

    const preco = await buscarPrecoLigaMagic(nome);

    if (preco === null) {
      console.log(`Não encontrou preço para ${nome}`);
      continue;
    }

    const card = await prisma.card.findFirst({ where: { nome } });
    if (!card) {
      console.log(`Carta "${nome}" não está no banco de dados`);
      continue;
    }

    await prisma.priceHistory.create({
      data: { cardId: card.id, preco },
    });

    console.log(`${nome}: R$ ${preco}`);

    await new Promise((r) => setTimeout(r, 3000));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());