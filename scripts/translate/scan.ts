import { PrismaClient } from "@prisma/client";
import { runScan } from "../../src/lib/i18n/scan";
import { GoogleV2Translator } from "../../src/lib/i18n/translate";

async function main() {
  const prisma = new PrismaClient();
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY ?? "";
  const translator = new GoogleV2Translator({ apiKey });
  const cap = process.env.SCAN_CAP ? Number(process.env.SCAN_CAP) : 500;
  const charBudget = process.env.SCAN_CHAR_BUDGET ? Number(process.env.SCAN_CHAR_BUDGET) : undefined;
  try {
    const summary = await runScan({ prisma, translator, force: false, cap, charBudget });
    console.log("[translate-scan]", JSON.stringify(summary));
  } finally {
    await prisma.$disconnect();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error("[translate-scan] error", e); process.exit(1); });
