import { PrismaClient } from "@prisma/client";
import { gunzipSync } from "zlib";

const prisma = new PrismaClient();

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const headers = {
  "User-Agent": "MTGTracker/1.0 (projeto pessoal de estudo)",
  Accept: "application/json",
};

async function main() {
  console.log("Buscando lista de arquivos da Scryfall...");
  const bulkRes = await fetch("https://api.scryfall.com/bulk-data", { headers });

  if (!bulkRes.ok) {
    const texto = await bulkRes.text();
    throw new Error(`Scryfall retornou erro ${bulkRes.status}: ${texto}`);
  }

  const bulkData = await bulkRes.json();

  if (!bulkData.data) {
    console.log("Resposta recebida:", JSON.stringify(bulkData));
    throw new Error("A resposta da Scryfall não veio no formato esperado");
  }

  const oracleCards = bulkData.data.find((d: any) => d.type === "oracle_cards");
  if (!oracleCards) throw new Error("Não encontrou o arquivo oracle_cards");

  console.log("Baixando catálogo completo (arquivo compactado, pode demorar um pouco)...");
  const arquivoRes = await fetch(oracleCards.jsonl_download_uri, { headers });
  const buffer = Buffer.from(await arquivoRes.arrayBuffer());
  const conteudo = gunzipSync(buffer).toString("utf-8");

  const linhas = conteudo.split("\n").filter((l) => l.trim().length > 0);

  console.log(`${linhas.length} cartas encontradas no arquivo. Filtrando e importando...`);

  const validas = linhas
    .map((linha) => JSON.parse(linha))
    .filter((c: any) => c.image_uris?.normal)
    .map((c: any) => ({
      nome: c.name,
      edicao: c.set_name,
      imagemUrl: c.image_uris.normal,
      scryfallId: c.id,
    }));

  console.log(`${validas.length} cartas válidas. Importando...`);

  const lotes = chunk(validas, 1000);
  let total = 0;

  for (const lote of lotes) {
    await prisma.card.createMany({ data: lote, skipDuplicates: true });
    total += lote.length;
    console.log(`${total} de ${validas.length} importadas...`);
  }

  console.log("Importação concluída!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());