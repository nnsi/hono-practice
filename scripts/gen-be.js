#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage:');
  console.error('  npm run gen-be dm <domainName>   - Generate domain model');
  console.error('  npm run gen-be feat <featureName> - Generate feature module');
  console.error('');
  console.error('Examples:');
  console.error('  npm run gen-be dm product');
  console.error('  npm run gen-be feat product');
  process.exit(1);
}

const command = args[0];
const name = args[1];

try {
  switch (command) {
    case 'dm':
    case 'domain':
      console.log(`Generating domain model: ${name}`);
      execSync(`node ${path.join(__dirname, 'generate-domain.js')} ${name}`, { stdio: 'inherit' });
      break;
    
    case 'feat':
    case 'feature':
      console.log(`Generating feature module: ${name}`);
      execSync(`node ${path.join(__dirname, 'generate-feature.js')} ${name}`, { stdio: 'inherit' });
      break;
    
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Use "dm" for domain model or "feat" for feature module');
      process.exit(1);
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}