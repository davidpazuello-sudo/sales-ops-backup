import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "lib"];
const ALLOWED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".css", ".md"]);

const forbiddenPatterns = [
  { label: "mojibake: Ã", regex: /Ã[\u0080-\u00BF]/g },
  { label: "mojibake: Â", regex: /Â[\u0080-\u00BF]/g },
  { label: "mojibake: ï¿½", regex: /ï¿½/g },
  { label: "replacement char", regex: /\uFFFD/g },
];

const criticalWords = [
  "Relatórios",
  "Vendedores",
  "Negócios",
  "Configurações",
  "Usuário",
  "Notificações",
  "Média",
  "Análise",
  "Sugestões",
  "métricas",
];

const commonBrokenVariants = [
  /RelatÃ³rios/g,
  /NegÃ³cios/g,
  /ConfiguraÃ§Ãµes/g,
  /UsuÃ¡rio/g,
  /NotificaÃ§Ãµes/g,
  /MÃ©dia/g,
  /AnÃ¡lise/g,
  /SugestÃµes/g,
  /mÃ©tricas/g,
];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(fullPath);
  }
  return files;
}

function getLine(source, index) {
  const lines = source.slice(0, index).split("\n");
  return lines.length;
}

async function main() {
  const files = (
    await Promise.all(
      TARGET_DIRS.map(async (dir) => {
        const full = path.join(ROOT, dir);
        try {
          await fs.access(full);
          return walk(full);
        } catch {
          return [];
        }
      }),
    )
  ).flat();

  const issues = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");

    for (const pattern of forbiddenPatterns) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        issues.push({
          filePath,
          line: getLine(content, match.index),
          reason: pattern.label,
          sample: match[0],
        });
      }
    }

    for (const broken of commonBrokenVariants) {
      broken.lastIndex = 0;
      let match;
      while ((match = broken.exec(content)) !== null) {
        issues.push({
          filePath,
          line: getLine(content, match.index),
          reason: "critical word broken",
          sample: match[0],
        });
      }
    }
  }

  if (issues.length > 0) {
    console.error("\nText quality check failed. Found invalid encoding/spelling patterns:\n");
    for (const issue of issues.slice(0, 200)) {
      console.error(
        `- ${path.relative(ROOT, issue.filePath)}:${issue.line} | ${issue.reason} | "${issue.sample}"`,
      );
    }
    console.error(`\nTotal issues: ${issues.length}`);
    process.exit(1);
  }

  console.log(`Text quality check passed. Protected words: ${criticalWords.join(", ")}`);
}

main().catch((error) => {
  console.error("Text quality check crashed:", error);
  process.exit(1);
});
