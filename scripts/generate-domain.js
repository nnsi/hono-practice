#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node generate-domain.js <domainName>');
  console.error('Example: node generate-domain.js product');
  process.exit(1);
}

const entityName = args[0].toLowerCase();
const EntityName = entityName.charAt(0).toUpperCase() + entityName.slice(1);

// Paths
const backendPath = path.join(__dirname, '../apps/backend');
const domainPath = path.join(backendPath, 'domain', entityName);

// Create directories
function createDirectories() {
  console.log(`Creating domain directory for ${entityName}...`);
  fs.mkdirSync(domainPath, { recursive: true });
}

// Domain templates
function generateDomainEntity() {
  const content = `import { z } from 'zod';
import { DomainValidateError } from '@backend/error';
import { ${entityName}Id } from './${entityName}Id';

const ${entityName}BaseSchema = z.object({
  name: z.string().min(1),
  // Add more fields as needed
});

const ${entityName}NewSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('new'),
    ...${entityName}BaseSchema.shape,
  }),
]);

const ${entityName}PersistedSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('persisted'),
    id: ${entityName}Id,
    ...${entityName}BaseSchema.shape,
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
]);

export const ${entityName}Schema = z.union([${entityName}NewSchema, ${entityName}PersistedSchema]);

export type ${EntityName} = z.infer<typeof ${entityName}Schema>;

export const create${EntityName} = (data: unknown): ${EntityName} => {
  const result = ${entityName}Schema.safeParse(data);
  if (!result.success) {
    throw new DomainValidateError(
      \`Invalid ${entityName} data: \${result.error.message}\`,
      result.error,
    );
  }
  return result.data;
};
`;
  fs.writeFileSync(path.join(domainPath, `${entityName}.ts`), content);
}

function generateDomainId() {
  const content = `import { z } from 'zod';
import { uuidv7 } from 'uuidv7';

const brand = Symbol('${entityName}Id');

export const ${entityName}Id = z.string().uuid().brand(brand);

export type ${EntityName}Id = z.infer<typeof ${entityName}Id>;

export const create${EntityName}Id = (): ${EntityName}Id => {
  return uuidv7() as ${EntityName}Id;
};
`;
  fs.writeFileSync(path.join(domainPath, `${entityName}Id.ts`), content);
}

function generateDomainIndex() {
  const content = `export * from './${entityName}';
export * from './${entityName}Id';
`;
  fs.writeFileSync(path.join(domainPath, 'index.ts'), content);
}

function updateDomainExports() {
  const domainIndexPath = path.join(backendPath, 'domain', 'index.ts');
  if (fs.existsSync(domainIndexPath)) {
    const currentContent = fs.readFileSync(domainIndexPath, 'utf-8');
    const exportLine = `export * from './${entityName}';`;
    
    if (!currentContent.includes(exportLine)) {
      const updatedContent = currentContent.trim() + '\n' + exportLine + '\n';
      fs.writeFileSync(domainIndexPath, updatedContent);
      console.log(`✅ Updated domain/index.ts with ${entityName} export`);
    }
  } else {
    console.log('⚠️  Could not find domain/index.ts - please add export manually');
  }
}

// Main execution
function generateDomain() {
  createDirectories();
  
  // Generate domain files
  generateDomainEntity();
  generateDomainId();
  generateDomainIndex();
  
  // Update domain exports
  updateDomainExports();
  
  console.log(`✅ Successfully generated domain model for ${entityName}!`);
  console.log(`
Domain files created:
- domain/${entityName}/${entityName}.ts
- domain/${entityName}/${entityName}Id.ts
- domain/${entityName}/index.ts

Next steps:
1. Customize the fields in ${entityName}.ts as needed
2. Add validation rules specific to your domain
`);
}

// Run the generator
try {
  generateDomain();
} catch (error) {
  console.error('Error generating domain:', error);
  process.exit(1);
}