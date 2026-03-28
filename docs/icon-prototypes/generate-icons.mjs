import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const svg = readFileSync("./docs/icon-prototypes/concept-d-white-amber.svg");
const outDir = "./docs/icon-prototypes";

const sizes = [
  { name: "favicon-32", size: 32 },
  { name: "apple-touch-icon-180", size: 180 },
  { name: "icon-192", size: 192 },
  { name: "icon-512", size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(`${outDir}/${name}.png`);
  console.log(`Generated ${name}.png (${size}x${size})`);
}

console.log("Done!");
