#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node generate-domain.js <domainName>");
  console.error("Example: node generate-domain.js product");
  process.exit(1);
}

const entityName = args[0].toLowerCase();
const EntityName = entityName.charAt(0).toUpperCase() + entityName.slice(1);

// Paths — domain models live in packages/domain/
const domainBasePath = path.join(__dirname, "../packages/domain");
const domainPath = path.join(domainBasePath, entityName);

// Create directories
function createDirectories() {
  console.log(`Creating domain directory for ${entityName}...`);
  fs.mkdirSync(domainPath, { recursive: true });
}

// Domain schema (ID + Entity in a single file, matching actual codebase pattern)
function generateDomainSchema() {
  const content = `import { DomainValidateError } from "../errors";
import { userIdSchema } from "../user/userSchema";
import { v7 } from "uuid";
import { z } from "zod";

// ${EntityName}Id
export const ${entityName}IdSchema = z.string().uuid().brand<"${EntityName}Id">();
export type ${EntityName}Id = z.infer<typeof ${entityName}IdSchema>;

export function create${EntityName}Id(id?: string): ${EntityName}Id {
  const parsedId = ${entityName}IdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError("create${EntityName}Id: Invalid id");
  }
  return parsedId.data;
}

// ${EntityName} Entity
const Base${EntityName}Schema = z.object({
  id: ${entityName}IdSchema,
  userId: userIdSchema,
  name: z.string(),
  // TODO: Add more fields as needed
});

const New${EntityName}Schema = Base${EntityName}Schema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const Persisted${EntityName}Schema = Base${EntityName}Schema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const ${EntityName}Schema = z.discriminatedUnion("type", [
  New${EntityName}Schema,
  Persisted${EntityName}Schema,
]);
export type ${EntityName} = z.infer<typeof ${EntityName}Schema>;
export type ${EntityName}Input = z.input<typeof ${EntityName}Schema>;

export function create${EntityName}Entity(params: ${EntityName}Input): ${EntityName} {
  const parsedEntity = ${EntityName}Schema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError("create${EntityName}Entity: invalid params");
  }
  return parsedEntity.data;
}
`;
  fs.writeFileSync(path.join(domainPath, `${entityName}Schema.ts`), content);
}

function generateDomainIndex() {
  const content = `export * from "./${entityName}Schema";
`;
  fs.writeFileSync(path.join(domainPath, "index.ts"), content);
}

// Main execution
function generateDomain() {
  createDirectories();

  generateDomainSchema();
  generateDomainIndex();

  console.log(`✅ Successfully generated domain model for ${entityName}!`);
  console.log(`
Domain files created:
- packages/domain/${entityName}/${entityName}Schema.ts
- packages/domain/${entityName}/index.ts

Next steps:
1. Customize the fields in ${entityName}Schema.ts as needed
2. Add validation rules specific to your domain
`);
}

// Run the generator
try {
  generateDomain();
} catch (error) {
  console.error("Error generating domain:", error);
  process.exit(1);
}
