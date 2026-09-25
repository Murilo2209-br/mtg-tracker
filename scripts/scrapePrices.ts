import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function buscarPrecoLigaMagic(nomeCarta: string): Promise<number | null> {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "pt-BR",
  });
  const page = await context.newPage();

  const url = `https://www.ligamagic.com.br/?view=cards/card&card=${encodeURIComponent(nomeCarta)}&tipo=1`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    const titulo = await page.title();
    console.log(`Título da página carregada: "${titulo}"`);

    if (!fs.existsSync("debug")) fs.mkdirSync("debug");
    await page.screenshot({ path: `debug/${nomeCarta.replace(/\s+/g, "_")}.png`, fullPage: true });

    const precoTexto = await page
      .locator("#container-price-mkp-card .min .price")
      .first()
      .textContent({ timeout: 15000 });

    if (!precoTexto) return null;

    const precoLimpo = precoTexto.replace("R$", "").replace(".", "").replace(",", ".").trim();
    return parseFloat(precoLimpo);
  } catch (e) {
    console.log(`Não conseguiu carregar o preço de "${nomeCarta}": ${(e as Error).message}`);
    return null;
  } finally {
    await browser.close();
  }
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