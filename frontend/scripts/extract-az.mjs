import fs from "fs";
import path from "path";
import mammoth from "mammoth";

async function main() {
  const docPath = "c:/Users/ayusm/Desktop/HACKATHON/IIT Kharagpur/Living memory final/A-Z_Directory.docx";
  try {
    const { value } = await mammoth.extractRawText({ path: docPath });
    const lines = value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const map = {};
    let currentLetter = null;
    for (const line of lines) {
      const m = line.match(/^([A-Z])\b/);
      if (m && line.length === 1) {
        currentLetter = m[1];
        if (!map[currentLetter]) map[currentLetter] = [];
        continue;
      }
      if (!currentLetter) continue;
      // Treat non-empty lines until next single letter as entries
      if (!/^[A-Z]$/.test(line)) {
        map[currentLetter].push({ title: line });
      }
    }
    const outDir = path.resolve("public");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "az.json");
    fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
    console.log("Written:", outPath);
  } catch (err) {
    console.error("Failed to parse DOCX:", err.message);
    process.exit(1);
  }
}

main();
