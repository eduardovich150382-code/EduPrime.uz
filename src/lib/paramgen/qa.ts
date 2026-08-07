import fs from "fs";
import { qaTemplate, Template } from "./paramgen";
const templates: Template[] = JSON.parse(fs.readFileSync("./templates.json","utf8"));
let total = 0;
for (const t of templates) {
  const r = qaTemplate(t, 200);
  total += r.produced;
  console.log(`\n=== ${r.templateId}\n    faza=${r.spaceSize} | ishlab chiqarildi=${r.produced} | to'yinganlik=${r.saturation} | noyob javob=${r.uniqueAnswers}`);
  if (r.problems.length) console.log("    ⚠ " + r.problems.join(" | "));
  const s = r.sample!;
  console.log("    Q:", s.stem);
  console.log("      " + s.choices.map(c=>`${c.key}) ${c.text}${c.correct?" ✔":""}`).join("  "));
}
console.log(`\nJAMI: ${total} ta savol / 10 shablon`);
