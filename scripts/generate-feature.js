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
  const content = `import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { create${EntityName}Id } from "@backend/domain";
import {
  create${EntityName}RequestSchema,
  update${EntityName}RequestSchema,
} from "@dtos/request";

import { new${EntityName}Handler } from "./${entityName}Handler";
import { new${EntityName}Repository } from "./${entityName}Repository";
import { new${EntityName}Usecase } from "./${entityName}Usecase";

import type { AppContext } from "../../context";

export function create${EntityName}Route() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof new${EntityName}Handler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const repo = new${EntityName}Repository(db);
    const uc = new${EntityName}Usecase(repo);
    const h = new${EntityName}Handler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const userId = c.get("userId");
      const res = await c.var.h.get${EntityName}s(userId);
      return c.json(res);
    })
    .get("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const ${entityName}Id = create${EntityName}Id(id);

      const res = await c.var.h.get${EntityName}(userId, ${entityName}Id);

      return c.json(res);
    })
    .post("/", zValidator("json", create${EntityName}RequestSchema), async (c) => {
      const userId = c.get("userId");
      const params = c.req.valid("json");

      const res = await c.var.h.create${EntityName}(userId, params);

      return c.json(res);
    })
    .put("/:id", zValidator("json", update${EntityName}RequestSchema), async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const ${entityName}Id = create${EntityName}Id(id);
      const params = c.req.valid("json");

      const res = await c.var.h.update${EntityName}(userId, ${entityName}Id, params);

      return c.json(res);
    })
    .delete("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const ${entityName}Id = create${EntityName}Id(id);

      const res = await c.var.h.delete${EntityName}(userId, ${entityName}Id);

      return c.json(res);
    });
}

export const ${entityName}Route = create${EntityName}Route();
`;
  fs.writeFileSync(path.join(featurePath, `${entityName}Route.ts`), content);
}

function generateHandler() {
  const content = `import type { Create${EntityName}Request, Update${EntityName}Request } from "@dtos/request";
import { Get${EntityName}ResponseSchema, Get${EntityName}sResponseSchema } from "@dtos/response";

import { AppError } from "../../error";

import type { ${EntityName}Usecase } from ".";
import type { ${EntityName}Id, UserId } from "@backend/domain";

export function new${EntityName}Handler(uc: ${EntityName}Usecase) {
  return {
    get${EntityName}s: get${EntityName}s(uc),
    get${EntityName}: get${EntityName}(uc),
    create${EntityName}: create${EntityName}(uc),
    update${EntityName}: update${EntityName}(uc),
    delete${EntityName}: delete${EntityName}(uc),
  };
}

function get${EntityName}s(uc: ${EntityName}Usecase) {
  return async (userId: UserId) => {
    const ${entityName}s = await uc.get${EntityName}s(userId);

    const response${EntityName}s = ${entityName}s.map((${entityName}) => ({
      ...${entityName},
      id: ${entityName}.id,
      userId: ${entityName}.userId,
    }));

    const parsed${EntityName}s = Get${EntityName}sResponseSchema.safeParse(response${EntityName}s);
    if (!parsed${EntityName}s.success) {
      throw new AppError("get${EntityName}sHandler: failed to parse ${entityName}s", 500);
    }

    return parsed${EntityName}s.data;
  };
}

function get${EntityName}(uc: ${EntityName}Usecase) {
  return async (userId: UserId, ${entityName}Id: ${EntityName}Id) => {
    const ${entityName} = await uc.get${EntityName}(userId, ${entityName}Id);

    const response${EntityName} = {
      ...${entityName},
      id: ${entityName}.id,
      userId: ${entityName}.userId,
    };

    const parsed${EntityName} = Get${EntityName}ResponseSchema.safeParse(response${EntityName});
    if (!parsed${EntityName}.success) {
      throw new AppError("get${EntityName}Handler: failed to parse ${entityName}", 500);
    }

    return parsed${EntityName}.data;
  };
}

function create${EntityName}(uc: ${EntityName}Usecase) {
  return async (userId: UserId, params: Create${EntityName}Request) => {
    const ${entityName} = await uc.create${EntityName}(userId, params);

    const parsed${EntityName} = Get${EntityName}ResponseSchema.safeParse(${entityName});
    if (!parsed${EntityName}.success) {
      throw new AppError("create${EntityName}Handler: failed to parse ${entityName}", 500);
    }

    return parsed${EntityName}.data;
  };
}

function update${EntityName}(uc: ${EntityName}Usecase) {
  return async (userId: UserId, ${entityName}Id: ${EntityName}Id, params: Update${EntityName}Request) => {
    const ${entityName} = await uc.update${EntityName}(userId, ${entityName}Id, params);

    const response${EntityName} = {
      ...${entityName},
      id: ${entityName}.id,
      userId: ${entityName}.userId,
    };

    const parsed${EntityName} = Get${EntityName}ResponseSchema.safeParse(response${EntityName});
    if (!parsed${EntityName}.success) {
      throw new AppError("update${EntityName}Handler: failed to parse ${entityName}", 500);
    }

    return parsed${EntityName}.data;
  };
}

function delete${EntityName}(uc: ${EntityName}Usecase) {
  return async (userId: UserId, ${entityName}Id: ${EntityName}Id) => {
    await uc.delete${EntityName}(userId, ${entityName}Id);

    return { message: "success" };
  };
}
`;
  fs.writeFileSync(path.join(featurePath, `${entityName}Handler.ts`), content);
}

function generateUsecase() {
  const content = `import {
  create${EntityName}Entity,
  create${EntityName}Id,
  type ${EntityName},
  type ${EntityName}Id,
  type UserId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";

import type { ${EntityName}Repository } from ".";

export type Create${EntityName}InputParams = {
  name: string;
  // Add more fields as needed
};

export type Update${EntityName}InputParams = {
  name?: string;
  // Add more fields as needed
};

export type ${EntityName}Usecase = {
  get${EntityName}s: (userId: UserId) => Promise<${EntityName}[]>;
  get${EntityName}: (userId: UserId, ${entityName}Id: ${EntityName}Id) => Promise<${EntityName}>;
  create${EntityName}: (userId: UserId, params: Create${EntityName}InputParams) => Promise<${EntityName}>;
  update${EntityName}: (
    userId: UserId,
    ${entityName}Id: ${EntityName}Id,
    params: Update${EntityName}InputParams,
  ) => Promise<${EntityName}>;
  delete${EntityName}: (userId: UserId, ${entityName}Id: ${EntityName}Id) => Promise<void>;
};

export function new${EntityName}Usecase(repo: ${EntityName}Repository): ${EntityName}Usecase {
  return {
    get${EntityName}s: get${EntityName}s(repo),
    get${EntityName}: get${EntityName}(repo),
    create${EntityName}: create${EntityName}(repo),
    update${EntityName}: update${EntityName}(repo),
    delete${EntityName}: delete${EntityName}(repo),
  };
}

function get${EntityName}s(repo: ${EntityName}Repository) {
  return async (userId: UserId) => {
    return await repo.get${EntityName}sByUserId(userId);
  };
}

function get${EntityName}(repo: ${EntityName}Repository) {
  return async (userId: UserId, ${entityName}Id: ${EntityName}Id) => {
    const ${entityName} = await repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id);
    if (!${entityName}) throw new ResourceNotFoundError("${entityName} not found");

    return ${entityName};
  };
}

function create${EntityName}(repo: ${EntityName}Repository) {
  return async (userId: UserId, params: Create${EntityName}InputParams) => {
    const ${entityName} = create${EntityName}Entity({
      type: "new",
      id: create${EntityName}Id(),
      userId: userId,
      name: params.name,
      // Add more fields as needed
    });

    return await repo.create${EntityName}(${entityName});
  };
}

function update${EntityName}(repo: ${EntityName}Repository) {
  return async (
    userId: UserId,
    ${entityName}Id: ${EntityName}Id,
    params: Update${EntityName}InputParams,
  ) => {
    const ${entityName} = await repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id);
    if (!${entityName})
      throw new ResourceNotFoundError("update${EntityName}Usecase:${entityName} not found");

    const new${EntityName} = create${EntityName}Entity({
      ...${entityName},
      ...params,
    });

    const update${EntityName} = await repo.update${EntityName}(new${EntityName});
    if (!update${EntityName})
      throw new ResourceNotFoundError("update${EntityName}Usecase${entityName} not found");

    return update${EntityName};
  };
}

function delete${EntityName}(repo: ${EntityName}Repository) {
  return async (userId: UserId, ${entityName}Id: ${EntityName}Id) => {
    const ${entityName} = await repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id);
    if (!${entityName}) throw new ResourceNotFoundError("${entityName} not found");

    await repo.delete${EntityName}(${entityName});

    return;
  };
}
`;
  fs.writeFileSync(path.join(featurePath, `${entityName}Usecase.ts`), content);
}

function generateRepository() {
  const content = `import {
  create${EntityName}Entity,
  type ${EntityName},
  type ${EntityName}Id,
  ${EntityName}Schema,
  type UserId,
} from "@backend/domain";
import { DomainValidateError, ResourceNotFoundError } from "@backend/error";
import { ${entityName}s } from "@infra/drizzle/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type ${EntityName}Repository<T> = {
  get${EntityName}sByUserId: (userId: UserId) => Promise<${EntityName}[]>;
  get${EntityName}ByUserIdAnd${EntityName}Id: (
    userId: UserId,
    ${entityName}Id: ${EntityName}Id,
  ) => Promise<${EntityName} | undefined>;
  create${EntityName}: (${entityName}: ${EntityName}) => Promise<${EntityName}>;
  update${EntityName}: (${entityName}: ${EntityName}) => Promise<${EntityName} | undefined>;
  delete${EntityName}: (${entityName}: ${EntityName}) => Promise<void>;
  withTx: (tx: T) => ${EntityName}Repository<T>;
};

export function new${EntityName}Repository(
  db: QueryExecutor,
): ${EntityName}Repository<QueryExecutor> {
  return {
    get${EntityName}sByUserId: get${EntityName}sByUserId(db),
    get${EntityName}ByUserIdAnd${EntityName}Id: get${EntityName}ByUserIdAnd${EntityName}Id(db),
    create${EntityName}: create${EntityName}(db),
    update${EntityName}: update${EntityName}(db),
    delete${EntityName}: delete${EntityName}(db),
    withTx: (tx) => new${EntityName}Repository(tx),
  };
}

function get${EntityName}sByUserId(db: QueryExecutor) {
  return async (userId: UserId) => {
    const result = await db.query.${entityName}s.findMany({
      where: and(eq(${entityName}s.userId, userId), isNull(${entityName}s.deletedAt)),
      orderBy: desc(${entityName}s.createdAt),
    });

    return result.map((r) => {
      const ${entityName} = create${EntityName}Entity({ ...r, type: "persisted" });
      return ${entityName};
    });
  };
}

function get${EntityName}ByUserIdAnd${EntityName}Id(db: QueryExecutor) {
  return async (userId: UserId, ${entityName}Id: ${EntityName}Id) => {
    const result = await db.query.${entityName}s.findFirst({
      where: and(
        eq(${entityName}s.id, ${entityName}Id),
        eq(${entityName}s.userId, userId),
        isNull(${entityName}s.deletedAt),
      ),
    });

    if (!result) {
      return undefined;
    }

    const ${entityName} = create${EntityName}Entity({ ...result, type: "persisted" });

    return ${entityName};
  };
}

function create${EntityName}(db: QueryExecutor) {
  return async (${entityName}: ${EntityName}) => {
    const [result] = await db.insert(${entityName}s).values(${entityName}).returning();

    const persisted${EntityName} = ${EntityName}Schema.safeParse({
      ...result,
      type: "persisted",
    });
    if (!persisted${EntityName}.success) {
      throw new DomainValidateError("create${EntityName}: failed to parse ${entityName}");
    }

    return persisted${EntityName}.data;
  };
}

function update${EntityName}(db: QueryExecutor) {
  return async (${entityName}: ${EntityName}) => {
    const [result] = await db
      .update(${entityName}s)
      .set({
        name: ${entityName}.name,
        // Add more fields as needed
      })
      .where(and(eq(${entityName}s.id, ${entityName}.id), eq(${entityName}s.userId, ${entityName}.userId)))
      .returning();

    if (!result) {
      return undefined;
    }

    const update${EntityName} = create${EntityName}Entity({ ...result, type: "persisted" });

    return update${EntityName};
  };
}

function delete${EntityName}(db: QueryExecutor) {
  return async (${entityName}: ${EntityName}) => {
    const [result] = await db
      .update(${entityName}s)
      .set({ deletedAt: new Date() })
      .where(and(eq(${entityName}s.id, ${entityName}.id), eq(${entityName}s.userId, ${entityName}.userId)))
      .returning();

    if (!result) {
      throw new ResourceNotFoundError("${entityName} not found");
    }
  };
}
`;
  fs.writeFileSync(path.join(featurePath, `${entityName}Repository.ts`), content);
}

function generateFeatureIndex() {
  const content = `export * from "./${entityName}Handler";
export * from "./${entityName}Repository";
export * from "./${entityName}Route";
export * from "./${entityName}Usecase";
`;
  fs.writeFileSync(path.join(featurePath, 'index.ts'), content);
}

// Test templates
function generateRouteTest() {
  const content = `import { testClient } from "hono/testing";
import { describe, expect, it, vi } from "vitest";
import { mockAuth } from "@backend/middleware/mockAuthMiddleware";
import { create${EntityName}Route } from "../${entityName}Route";
import { drizzleInstance } from "@backend/infra/rdb/drizzle";

describe("${entityName}Route", () => {
  const mockDB = drizzleInstance();
  const app = mockAuth(create${EntityName}Route());
  const client = testClient(app, {
    DB: mockDB,
  });

  describe("GET /", () => {
    it("should return empty array when no ${entityName}s exist", async () => {
      const response = await client.api.v1.${entityName}s.$get();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual([]);
    });
  });

  describe("POST /", () => {
    it("should create a new ${entityName}", async () => {
      const response = await client.api.v1.${entityName}s.$post({
        json: {
          name: "Test ${EntityName}",
        },
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        name: "Test ${EntityName}",
      });
      expect(body.id).toBeDefined();
    });

    it("should return 400 for invalid request", async () => {
      const response = await client.api.v1.${entityName}s.$post({
        json: {
          name: "",
        },
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /:id", () => {
    it("should return 404 for non-existent ${entityName}", async () => {
      const response = await client.api.v1.${entityName}s[":id"].$get({
        param: { id: "01234567-89ab-cdef-0123-456789abcdef" },
      });
      expect(response.status).toBe(404);
    });
  });

  describe("PUT /:id", () => {
    it("should return 404 for non-existent ${entityName}", async () => {
      const response = await client.api.v1.${entityName}s[":id"].$put({
        param: { id: "01234567-89ab-cdef-0123-456789abcdef" },
        json: {
          name: "Updated ${EntityName}",
        },
      });
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /:id", () => {
    it("should return 404 for non-existent ${entityName}", async () => {
      const response = await client.api.v1.${entityName}s[":id"].$delete({
        param: { id: "01234567-89ab-cdef-0123-456789abcdef" },
      });
      expect(response.status).toBe(404);
    });
  });
});
`;
  fs.writeFileSync(path.join(testPath, `${entityName}Route.test.ts`), content);
}

function generateUsecaseTest() {
  const content = `import { describe, expect, it } from "vitest";
import { when, instance, mock, verify, anything } from "ts-mockito";
import { new${EntityName}Usecase } from "../${entityName}Usecase";
import type { ${EntityName}Repository } from "../${entityName}Repository";
import type { ${EntityName}, ${EntityName}Id, UserId } from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

describe("${entityName}Usecase", () => {
  const setup = () => {
    const repository = mock<${EntityName}Repository<QueryExecutor>>();
    const useCase = new${EntityName}Usecase(instance(repository));
    return { repository, useCase };
  };

  const userId = "test-user-id" as UserId;

  describe("get${EntityName}s", () => {
    it("should return all ${entityName}s", async () => {
      const { repository, useCase } = setup();
      const expected${EntityName}s: ${EntityName}[] = [
        {
          type: "persisted",
          id: "test-id-1" as ${EntityName}Id,
          userId,
          name: "Test ${EntityName} 1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          type: "persisted",
          id: "test-id-2" as ${EntityName}Id,
          userId,
          name: "Test ${EntityName} 2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      when(repository.get${EntityName}sByUserId(userId)).thenResolve(expected${EntityName}s);

      const result = await useCase.get${EntityName}s(userId);

      expect(result).toEqual(expected${EntityName}s);
      verify(repository.get${EntityName}sByUserId(userId)).once();
    });
  });

  describe("get${EntityName}", () => {
    it("should return ${entityName} when it exists", async () => {
      const { repository, useCase } = setup();
      const id = "test-id" as ${EntityName}Id;
      const expected${EntityName}: ${EntityName} = {
        type: "persisted",
        id,
        userId,
        name: "Test ${EntityName}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      when(repository.get${EntityName}ByUserIdAnd${EntityName}Id(userId, id)).thenResolve(expected${EntityName});

      const result = await useCase.get${EntityName}(userId, id);

      expect(result).toEqual(expected${EntityName});
      verify(repository.get${EntityName}ByUserIdAnd${EntityName}Id(userId, id)).once();
    });

    it("should throw ResourceNotFoundError when ${entityName} does not exist", async () => {
      const { repository, useCase } = setup();
      const id = "non-existent-id" as ${EntityName}Id;

      when(repository.get${EntityName}ByUserIdAnd${EntityName}Id(userId, id)).thenResolve(undefined);

      await expect(useCase.get${EntityName}(userId, id)).rejects.toThrow(
        new ResourceNotFoundError("${entityName} not found")
      );
    });
  });

  describe("create${EntityName}", () => {
    it("should create and return new ${entityName}", async () => {
      const { repository, useCase } = setup();
      const input = { name: "New ${EntityName}" };
      const expected${EntityName}: ${EntityName} = {
        type: "persisted",
        id: "new-id" as ${EntityName}Id,
        userId,
        name: input.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      when(repository.create${EntityName}(anything())).thenResolve(expected${EntityName});

      const result = await useCase.create${EntityName}(userId, input);

      expect(result).toEqual(expected${EntityName});
      verify(repository.create${EntityName}(anything())).once();
    });
  });

  describe("update${EntityName}", () => {
    it("should update and return ${entityName} when it exists", async () => {
      const { repository, useCase } = setup();
      const id = "test-id" as ${EntityName}Id;
      const existing${EntityName}: ${EntityName} = {
        type: "persisted",
        id,
        userId,
        name: "Old Name",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated${EntityName}: ${EntityName} = {
        ...existing${EntityName},
        name: "Updated Name",
      };

      when(repository.get${EntityName}ByUserIdAnd${EntityName}Id(userId, id)).thenResolve(existing${EntityName});
      when(repository.update${EntityName}(anything())).thenResolve(updated${EntityName});

      const result = await useCase.update${EntityName}(userId, id, { name: "Updated Name" });

      expect(result).toEqual(updated${EntityName});
      verify(repository.get${EntityName}ByUserIdAnd${EntityName}Id(userId, id)).once();
      verify(repository.update${EntityName}(anything())).once();
    });

    it("should throw ResourceNotFoundError when ${entityName} does not exist", async () => {
      const { repository, useCase } = setup();
      const id = "non-existent-id" as ${EntityName}Id;

      when(repository.get${EntityName}ByUserIdAnd${EntityName}Id(userId, id)).thenResolve(undefined);

      await expect(
        useCase.update${EntityName}(userId, id, { name: "Updated Name" })
      ).rejects.toThrow(new ResourceNotFoundError("update${EntityName}Usecase:${entityName} not found"));
    });
  });

  describe("delete${EntityName}", () => {
    it("should delete ${entityName} when it exists", async () => {
      const { repository, useCase } = setup();
      const id = "test-id" as ${EntityName}Id;
      const existing${EntityName}: ${EntityName} = {
        type: "persisted",
        id,
        userId,
        name: "Test ${EntityName}",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      when(repository.get${EntityName}ByUserIdAnd${EntityName}Id(userId, id)).thenResolve(existing${EntityName});
      when(repository.delete${EntityName}(existing${EntityName})).thenResolve();

      await useCase.delete${EntityName}(userId, id);

      verify(repository.get${EntityName}ByUserIdAnd${EntityName}Id(userId, id)).once();
      verify(repository.delete${EntityName}(existing${EntityName})).once();
    });

    it("should throw ResourceNotFoundError when ${entityName} does not exist", async () => {
      const { repository, useCase } = setup();
      const id = "non-existent-id" as ${EntityName}Id;

      when(repository.get${EntityName}ByUserIdAnd${EntityName}Id(userId, id)).thenResolve(undefined);

      await expect(useCase.delete${EntityName}(userId, id)).rejects.toThrow(
        new ResourceNotFoundError("${entityName} not found")
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
1. Add the ${entityName} domain entities in /apps/backend/domain/${entityName}/
2. Add the ${entityName} table to /infra/drizzle/schema.ts
3. Add DTOs to packages/dtos (request and response schemas)
4. Add the route to the main app.ts: app.route('/${entityName}s', ${entityName}Route)
5. Run migrations: npm run db-generate && npm run db-migrate
6. Update the repository with actual field mappings
7. Implement your business logic in the usecase
`);
}

// Run the generator
try {
  generateFeature();
} catch (error) {
  console.error('Error generating feature:', error);
  process.exit(1);
}