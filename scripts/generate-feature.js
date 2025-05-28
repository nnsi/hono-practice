#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node generate-feature.js <featureName>');
  console.error('Example: node generate-feature.js product');
  process.exit(1);
}

const entityName = args[0].toLowerCase();
const EntityName = entityName.charAt(0).toUpperCase() + entityName.slice(1);

// Paths
const backendPath = path.join(__dirname, '../apps/backend');
const featurePath = path.join(backendPath, 'feature', entityName);
const testPath = path.join(featurePath, 'test');

// Create directories
function createDirectories() {
  console.log(`Creating feature directory for ${entityName}...`);
  fs.mkdirSync(testPath, { recursive: true });
}

// Feature templates
function generateRoute() {
  const content = `import { zValidator } from '@hono/zod-validator';
import { createApp } from '@backend/lib/honoWithErrorHandling';
import { ${entityName}Handler } from './${entityName}Handler';
import { create${EntityName}RequestSchema } from '@dtos/request';
import { ${entityName}IdSchema } from '@dtos/response';

export const ${entityName}Route = () => {
  const app = createApp();

  app.use('*', async (c, next) => {
    c.set('${entityName}Handler', ${entityName}Handler());
    await next();
  });

  app.get('/', async (c) => {
    const handler = c.get('${entityName}Handler');
    const response = await handler.get${EntityName}s();
    return c.json(response);
  });

  app.get('/:id', zValidator('param', ${entityName}IdSchema), async (c) => {
    const handler = c.get('${entityName}Handler');
    const { id } = c.req.valid('param');
    const response = await handler.get${EntityName}(id);
    return c.json(response);
  });

  app.post('/', zValidator('json', create${EntityName}RequestSchema), async (c) => {
    const handler = c.get('${entityName}Handler');
    const request = c.req.valid('json');
    const response = await handler.create${EntityName}(request);
    return c.json(response, 201);
  });

  app.put('/:id', 
    zValidator('param', ${entityName}IdSchema),
    zValidator('json', create${EntityName}RequestSchema), 
    async (c) => {
      const handler = c.get('${entityName}Handler');
      const { id } = c.req.valid('param');
      const request = c.req.valid('json');
      const response = await handler.update${EntityName}(id, request);
      return c.json(response);
    }
  );

  app.delete('/:id', zValidator('param', ${entityName}IdSchema), async (c) => {
    const handler = c.get('${entityName}Handler');
    const { id } = c.req.valid('param');
    await handler.delete${EntityName}(id);
    return c.json({ success: true });
  });

  return app;
};
`;
  fs.writeFileSync(path.join(featurePath, `${entityName}Route.ts`), content);
}

function generateHandler() {
  const content = `import { AppError } from '@backend/error';
import { ${entityName}UseCase } from './${entityName}Usecase';
import { ${entityName}Repository } from './${entityName}Repository';
import { 
  ${entityName}ResponseSchema,
  ${entityName}sResponseSchema,
  type ${EntityName}Response,
  type ${EntityName}sResponse,
  type Create${EntityName}Request,
} from '@dtos/response';
import type { ${EntityName}Id } from '@backend/domain';

export const ${entityName}Handler = () => {
  const repository = ${entityName}Repository();
  const useCase = ${entityName}UseCase({ ${entityName}Repository: repository });

  return {
    get${EntityName}s: async (): Promise<${EntityName}sResponse> => {
      const ${entityName}s = await useCase.get${EntityName}s();
      const response = { ${entityName}s };
      const result = ${entityName}sResponseSchema.safeParse(response);
      if (!result.success) {
        throw new AppError(\`Invalid response: \${result.error.message}\`);
      }
      return result.data;
    },

    get${EntityName}: async (id: ${EntityName}Id): Promise<${EntityName}Response> => {
      const ${entityName} = await useCase.get${EntityName}({ id });
      const result = ${entityName}ResponseSchema.safeParse(${entityName});
      if (!result.success) {
        throw new AppError(\`Invalid response: \${result.error.message}\`);
      }
      return result.data;
    },

    create${EntityName}: async (request: Create${EntityName}Request): Promise<${EntityName}Response> => {
      const ${entityName} = await useCase.create${EntityName}(request);
      const result = ${entityName}ResponseSchema.safeParse(${entityName});
      if (!result.success) {
        throw new AppError(\`Invalid response: \${result.error.message}\`);
      }
      return result.data;
    },

    update${EntityName}: async (id: ${EntityName}Id, request: Create${EntityName}Request): Promise<${EntityName}Response> => {
      const ${entityName} = await useCase.update${EntityName}({ id, ...request });
      const result = ${entityName}ResponseSchema.safeParse(${entityName});
      if (!result.success) {
        throw new AppError(\`Invalid response: \${result.error.message}\`);
      }
      return result.data;
    },

    delete${EntityName}: async (id: ${EntityName}Id): Promise<void> => {
      await useCase.delete${EntityName}({ id });
    },
  };
};
`;
  fs.writeFileSync(path.join(featurePath, `${entityName}Handler.ts`), content);
}

function generateUsecase() {
  const content = `import { ResourceNotFoundError } from '@backend/error';
import type { ${EntityName}, ${EntityName}Id } from '@backend/domain';
import type { ${EntityName}Repository } from './${entityName}Repository';

type Get${EntityName}sInput = void;
type Get${EntityName}sOutput = ${EntityName}[];

type Get${EntityName}Input = {
  id: ${EntityName}Id;
};
type Get${EntityName}Output = ${EntityName};

type Create${EntityName}Input = {
  name: string;
  // Add more fields as needed
};
type Create${EntityName}Output = ${EntityName};

type Update${EntityName}Input = {
  id: ${EntityName}Id;
  name: string;
  // Add more fields as needed
};
type Update${EntityName}Output = ${EntityName};

type Delete${EntityName}Input = {
  id: ${EntityName}Id;
};
type Delete${EntityName}Output = void;

export type ${EntityName}UseCase = {
  get${EntityName}s: (input?: Get${EntityName}sInput) => Promise<Get${EntityName}sOutput>;
  get${EntityName}: (input: Get${EntityName}Input) => Promise<Get${EntityName}Output>;
  create${EntityName}: (input: Create${EntityName}Input) => Promise<Create${EntityName}Output>;
  update${EntityName}: (input: Update${EntityName}Input) => Promise<Update${EntityName}Output>;
  delete${EntityName}: (input: Delete${EntityName}Input) => Promise<Delete${EntityName}Output>;
};

type Deps = {
  ${entityName}Repository: ${EntityName}Repository;
};

export const ${entityName}UseCase = ({ ${entityName}Repository }: Deps): ${EntityName}UseCase => ({
  get${EntityName}s: async () => {
    return await ${entityName}Repository.findAll();
  },

  get${EntityName}: async ({ id }) => {
    const ${entityName} = await ${entityName}Repository.findById(id);
    if (!${entityName}) {
      throw new ResourceNotFoundError(\`${EntityName} with id \${id} not found\`);
    }
    return ${entityName};
  },

  create${EntityName}: async ({ name }) => {
    const new${EntityName}: ${EntityName} = {
      status: 'new',
      name,
    };
    return await ${entityName}Repository.save(new${EntityName});
  },

  update${EntityName}: async ({ id, name }) => {
    const existing = await ${entityName}Repository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundError(\`${EntityName} with id \${id} not found\`);
    }
    const updated${EntityName}: ${EntityName} = {
      ...existing,
      name,
    };
    return await ${entityName}Repository.save(updated${EntityName});
  },

  delete${EntityName}: async ({ id }) => {
    const existing = await ${entityName}Repository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundError(\`${EntityName} with id \${id} not found\`);
    }
    await ${entityName}Repository.delete(id);
  },
});
`;
  fs.writeFileSync(path.join(featurePath, `${entityName}Usecase.ts`), content);
}

function generateRepository() {
  const content = `import { create${EntityName}, create${EntityName}Id, type ${EntityName}, type ${EntityName}Id } from '@backend/domain';
import { SqlExecutionError } from '@backend/error';
import { drizzleInstance, type DrizzleTransaction } from '@backend/infra/rdb/drizzle';
import { ${entityName}s } from '@infra/drizzle/schema';
import { eq } from 'drizzle-orm';

export type ${EntityName}Repository = {
  withTransaction: (tx: DrizzleTransaction) => ${EntityName}Repository;
  findAll: () => Promise<${EntityName}[]>;
  findById: (id: ${EntityName}Id) => Promise<${EntityName} | undefined>;
  save: (${entityName}: ${EntityName}) => Promise<${EntityName}>;
  delete: (id: ${EntityName}Id) => Promise<void>;
};

export const ${entityName}Repository = (): ${EntityName}Repository => {
  const repository = (db = drizzleInstance()): ${EntityName}Repository => ({
    withTransaction: (tx: DrizzleTransaction) => repository(tx),

    findAll: async () => {
      try {
        const results = await db.select().from(${entityName}s);
        return results.map((row) =>
          create${EntityName}({
            status: 'persisted',
            id: row.id as ${EntityName}Id,
            name: row.name,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
        );
      } catch (error) {
        throw new SqlExecutionError(\`Failed to find all ${entityName}s\`, error as Error);
      }
    },

    findById: async (id: ${EntityName}Id) => {
      try {
        const results = await db.select().from(${entityName}s).where(eq(${entityName}s.id, id));
        if (results.length === 0) {
          return undefined;
        }
        const row = results[0];
        return create${EntityName}({
          status: 'persisted',
          id: row.id as ${EntityName}Id,
          name: row.name,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      } catch (error) {
        throw new SqlExecutionError(\`Failed to find ${entityName} by id: \${id}\`, error as Error);
      }
    },

    save: async (${entityName}: ${EntityName}) => {
      try {
        const now = new Date();
        if (${entityName}.status === 'new') {
          const id = create${EntityName}Id();
          const [inserted] = await db
            .insert(${entityName}s)
            .values({
              id,
              name: ${entityName}.name,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          return create${EntityName}({
            status: 'persisted',
            id: inserted.id as ${EntityName}Id,
            name: inserted.name,
            createdAt: inserted.createdAt,
            updatedAt: inserted.updatedAt,
          });
        } else {
          const [updated] = await db
            .update(${entityName}s)
            .set({
              name: ${entityName}.name,
              updatedAt: now,
            })
            .where(eq(${entityName}s.id, ${entityName}.id))
            .returning();
          return create${EntityName}({
            status: 'persisted',
            id: updated.id as ${EntityName}Id,
            name: updated.name,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          });
        }
      } catch (error) {
        throw new SqlExecutionError(\`Failed to save ${entityName}\`, error as Error);
      }
    },

    delete: async (id: ${EntityName}Id) => {
      try {
        await db.delete(${entityName}s).where(eq(${entityName}s.id, id));
      } catch (error) {
        throw new SqlExecutionError(\`Failed to delete ${entityName} with id: \${id}\`, error as Error);
      }
    },
  });

  return repository();
};
`;
  fs.writeFileSync(path.join(featurePath, `${entityName}Repository.ts`), content);
}

function generateFeatureIndex() {
  const content = `export * from './${entityName}Route';
export * from './${entityName}Handler';
export * from './${entityName}Usecase';
export * from './${entityName}Repository';
`;
  fs.writeFileSync(path.join(featurePath, 'index.ts'), content);
}

// Test templates
function generateRouteTest() {
  const content = `import { testClient } from 'hono/testing';
import { describe, expect, it } from 'vitest';
import { mockAuth } from '@backend/middleware/mockAuthMiddleware';
import { ${entityName}Route } from '../${entityName}Route';

describe('${entityName}Route', () => {
  const client = testClient(mockAuth(${entityName}Route()));

  describe('GET /${entityName}s', () => {
    it('should return empty array when no ${entityName}s exist', async () => {
      const response = await client.api.v1.${entityName}s.$get();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ ${entityName}s: [] });
    });
  });

  describe('POST /${entityName}s', () => {
    it('should create a new ${entityName}', async () => {
      const response = await client.api.v1.${entityName}s.$post({
        json: {
          name: 'Test ${EntityName}',
        },
      });
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toMatchObject({
        name: 'Test ${EntityName}',
      });
      expect(body.id).toBeDefined();
    });

    it('should return 400 for invalid request', async () => {
      const response = await client.api.v1.${entityName}s.$post({
        json: {
          name: '',
        },
      });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /${entityName}s/:id', () => {
    it('should return 404 for non-existent ${entityName}', async () => {
      const response = await client.api.v1.${entityName}s[':id'].$get({
        param: { id: '01234567-89ab-cdef-0123-456789abcdef' },
      });
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid id format', async () => {
      const response = await client.api.v1.${entityName}s[':id'].$get({
        param: { id: 'invalid-id' },
      });
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /${entityName}s/:id', () => {
    it('should return 404 for non-existent ${entityName}', async () => {
      const response = await client.api.v1.${entityName}s[':id'].$put({
        param: { id: '01234567-89ab-cdef-0123-456789abcdef' },
        json: {
          name: 'Updated ${EntityName}',
        },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /${entityName}s/:id', () => {
    it('should return 404 for non-existent ${entityName}', async () => {
      const response = await client.api.v1.${entityName}s[':id'].$delete({
        param: { id: '01234567-89ab-cdef-0123-456789abcdef' },
      });
      expect(response.status).toBe(404);
    });
  });
});
`;
  fs.writeFileSync(path.join(testPath, `${entityName}Route.test.ts`), content);
}

function generateUsecaseTest() {
  const content = `import { describe, expect, it } from 'vitest';
import { when, instance, mock, verify, anything } from 'ts-mockito';
import { ${entityName}UseCase } from '../${entityName}Usecase';
import type { ${EntityName}Repository } from '../${entityName}Repository';
import type { ${EntityName}, ${EntityName}Id } from '@backend/domain';
import { ResourceNotFoundError } from '@backend/error';

describe('${entityName}UseCase', () => {
  const setup = () => {
    const repository = mock<${EntityName}Repository>();
    const useCase = ${entityName}UseCase({ ${entityName}Repository: instance(repository) });
    return { repository, useCase };
  };

  describe('get${EntityName}s', () => {
    it('should return all ${entityName}s', async () => {
      const { repository, useCase } = setup();
      const expected${EntityName}s: ${EntityName}[] = [
        {
          status: 'persisted',
          id: 'test-id-1' as ${EntityName}Id,
          name: 'Test ${EntityName} 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          status: 'persisted',
          id: 'test-id-2' as ${EntityName}Id,
          name: 'Test ${EntityName} 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      when(repository.findAll()).thenResolve(expected${EntityName}s);

      const result = await useCase.get${EntityName}s();

      expect(result).toEqual(expected${EntityName}s);
      verify(repository.findAll()).once();
    });
  });

  describe('get${EntityName}', () => {
    it('should return ${entityName} when it exists', async () => {
      const { repository, useCase } = setup();
      const id = 'test-id' as ${EntityName}Id;
      const expected${EntityName}: ${EntityName} = {
        status: 'persisted',
        id,
        name: 'Test ${EntityName}',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      when(repository.findById(id)).thenResolve(expected${EntityName});

      const result = await useCase.get${EntityName}({ id });

      expect(result).toEqual(expected${EntityName});
      verify(repository.findById(id)).once();
    });

    it('should throw ResourceNotFoundError when ${entityName} does not exist', async () => {
      const { repository, useCase } = setup();
      const id = 'non-existent-id' as ${EntityName}Id;

      when(repository.findById(id)).thenResolve(undefined);

      await expect(useCase.get${EntityName}({ id })).rejects.toThrow(
        new ResourceNotFoundError(\`${EntityName} with id \${id} not found\`)
      );
    });
  });

  describe('create${EntityName}', () => {
    it('should create and return new ${entityName}', async () => {
      const { repository, useCase } = setup();
      const input = { name: 'New ${EntityName}' };
      const expected${EntityName}: ${EntityName} = {
        status: 'persisted',
        id: 'new-id' as ${EntityName}Id,
        name: input.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      when(repository.save(anything())).thenResolve(expected${EntityName});

      const result = await useCase.create${EntityName}(input);

      expect(result).toEqual(expected${EntityName});
      verify(repository.save(anything())).once();
    });
  });

  describe('update${EntityName}', () => {
    it('should update and return ${entityName} when it exists', async () => {
      const { repository, useCase } = setup();
      const id = 'test-id' as ${EntityName}Id;
      const existing${EntityName}: ${EntityName} = {
        status: 'persisted',
        id,
        name: 'Old Name',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated${EntityName}: ${EntityName} = {
        ...existing${EntityName},
        name: 'Updated Name',
      };

      when(repository.findById(id)).thenResolve(existing${EntityName});
      when(repository.save(anything())).thenResolve(updated${EntityName});

      const result = await useCase.update${EntityName}({ id, name: 'Updated Name' });

      expect(result).toEqual(updated${EntityName});
      verify(repository.findById(id)).once();
      verify(repository.save(anything())).once();
    });

    it('should throw ResourceNotFoundError when ${entityName} does not exist', async () => {
      const { repository, useCase } = setup();
      const id = 'non-existent-id' as ${EntityName}Id;

      when(repository.findById(id)).thenResolve(undefined);

      await expect(
        useCase.update${EntityName}({ id, name: 'Updated Name' })
      ).rejects.toThrow(new ResourceNotFoundError(\`${EntityName} with id \${id} not found\`));
    });
  });

  describe('delete${EntityName}', () => {
    it('should delete ${entityName} when it exists', async () => {
      const { repository, useCase } = setup();
      const id = 'test-id' as ${EntityName}Id;
      const existing${EntityName}: ${EntityName} = {
        status: 'persisted',
        id,
        name: 'Test ${EntityName}',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      when(repository.findById(id)).thenResolve(existing${EntityName});
      when(repository.delete(id)).thenResolve();

      await useCase.delete${EntityName}({ id });

      verify(repository.findById(id)).once();
      verify(repository.delete(id)).once();
    });

    it('should throw ResourceNotFoundError when ${entityName} does not exist', async () => {
      const { repository, useCase } = setup();
      const id = 'non-existent-id' as ${EntityName}Id;

      when(repository.findById(id)).thenResolve(undefined);

      await expect(useCase.delete${EntityName}({ id })).rejects.toThrow(
        new ResourceNotFoundError(\`${EntityName} with id \${id} not found\`)
      );
    });
  });
});
`;
  fs.writeFileSync(path.join(testPath, `${entityName}Usecase.test.ts`), content);
}

function updateFeatureExports() {
  const featureIndexPath = path.join(backendPath, 'feature', 'index.ts');
  if (fs.existsSync(featureIndexPath)) {
    const currentContent = fs.readFileSync(featureIndexPath, 'utf-8');
    const exportLine = `export * from './${entityName}';`;
    
    if (!currentContent.includes(exportLine)) {
      const updatedContent = currentContent.trim() + '\n' + exportLine + '\n';
      fs.writeFileSync(featureIndexPath, updatedContent);
      console.log(`✅ Updated feature/index.ts with ${entityName} export`);
    }
  } else {
    console.log('⚠️  Could not find feature/index.ts - please add export manually');
  }
}

// Main execution
function generateFeature() {
  createDirectories();
  
  // Generate feature files
  generateRoute();
  generateHandler();
  generateUsecase();
  generateRepository();
  generateFeatureIndex();
  
  // Generate test files
  generateRouteTest();
  generateUsecaseTest();
  
  // Update feature exports
  updateFeatureExports();
  
  console.log(`✅ Successfully generated feature for ${entityName}!`);
  console.log(`
Feature files created:
- feature/${entityName}/${entityName}Route.ts
- feature/${entityName}/${entityName}Handler.ts
- feature/${entityName}/${entityName}Usecase.ts
- feature/${entityName}/${entityName}Repository.ts
- feature/${entityName}/index.ts
- feature/${entityName}/test/${entityName}Route.test.ts
- feature/${entityName}/test/${entityName}Usecase.test.ts

Next steps:
1. Add the ${entityName} table to /infra/drizzle/schema.ts
2. Add DTOs to packages/dtos (request and response schemas)
3. Add the route to the main app.ts
4. Run migrations: npm run db-generate && npm run db-migrate
5. Implement your business logic in the usecase
`);
}

// Run the generator
try {
  generateFeature();
} catch (error) {
  console.error('Error generating feature:', error);
  process.exit(1);
}