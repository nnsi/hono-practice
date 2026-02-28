#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node generate-feature.js <featureName>");
  console.error("Example: node generate-feature.js product");
  process.exit(1);
}

const entityName = args[0].toLowerCase();
const EntityName = entityName.charAt(0).toUpperCase() + entityName.slice(1);

// Paths
const backendPath = path.join(__dirname, "../apps/backend");
const featurePath = path.join(backendPath, "feature", entityName);
const testPath = path.join(featurePath, "test");

// Create directories
function createDirectories() {
  console.log(`Creating feature directory for ${entityName}...`);
  fs.mkdirSync(testPath, { recursive: true });
}

// Feature templates
function generateRoute() {
  const content = `import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { create${EntityName}Id } from "@packages/domain/${entityName}/${entityName}Schema";
import { noopTracer } from "@backend/lib/tracer";
import {
  create${EntityName}RequestSchema,
  update${EntityName}RequestSchema,
} from "@dtos/request";

import type { AppContext } from "../../context";
import { new${EntityName}Handler } from "./${entityName}Handler";
import { new${EntityName}Repository } from "./${entityName}Repository";
import { new${EntityName}Usecase } from "./${entityName}Usecase";

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

    const tracer = c.get("tracer") ?? noopTracer;
    const repo = new${EntityName}Repository(db);
    const uc = new${EntityName}Usecase(repo, tracer);
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

export const new${EntityName}Route = create${EntityName}Route();
`;
  fs.writeFileSync(path.join(featurePath, `${entityName}Route.ts`), content);
}

function generateHandler() {
  const content = `import type { ${EntityName}Id } from "@packages/domain/${entityName}/${entityName}Schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { Create${EntityName}Request, Update${EntityName}Request } from "@dtos/request";
import { Get${EntityName}ResponseSchema, Get${EntityName}sResponseSchema } from "@dtos/response";

import { AppError } from "../../error";
import type { ${EntityName}Usecase } from ".";

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
  fs.writeFileSync(
    path.join(featurePath, `${entityName}Handler.ts`),
    content,
  );
}

function generateUsecase() {
  const content = `import {
  type ${EntityName},
  type ${EntityName}Id,
  create${EntityName}Entity,
  create${EntityName}Id,
} from "@packages/domain/${entityName}/${entityName}Schema";
import type { UserId } from "@packages/domain/user/userSchema";
import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";

import type { ${EntityName}Repository } from ".";

export type Create${EntityName}InputParams = {
  name: string;
  // TODO: Add more fields as needed
};

export type Update${EntityName}InputParams = {
  name?: string;
  // TODO: Add more fields as needed
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

export function new${EntityName}Usecase(
  repo: ${EntityName}Repository,
  tracer: Tracer,
): ${EntityName}Usecase {
  return {
    get${EntityName}s: get${EntityName}s(repo, tracer),
    get${EntityName}: get${EntityName}(repo, tracer),
    create${EntityName}: create${EntityName}(repo, tracer),
    update${EntityName}: update${EntityName}(repo, tracer),
    delete${EntityName}: delete${EntityName}(repo, tracer),
  };
}

function get${EntityName}s(repo: ${EntityName}Repository, tracer: Tracer) {
  return async (userId: UserId) => {
    return await tracer.span("db.get${EntityName}sByUserId", () =>
      repo.get${EntityName}sByUserId(userId),
    );
  };
}

function get${EntityName}(repo: ${EntityName}Repository, tracer: Tracer) {
  return async (userId: UserId, ${entityName}Id: ${EntityName}Id) => {
    const ${entityName} = await tracer.span("db.get${EntityName}ByUserIdAnd${EntityName}Id", () =>
      repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id),
    );
    if (!${entityName}) throw new ResourceNotFoundError("${entityName} not found");

    return ${entityName};
  };
}

function create${EntityName}(repo: ${EntityName}Repository, tracer: Tracer) {
  return async (userId: UserId, params: Create${EntityName}InputParams) => {
    const ${entityName} = create${EntityName}Entity({
      type: "new",
      id: create${EntityName}Id(),
      userId: userId,
      name: params.name,
      // TODO: Add more fields as needed
    });

    return await tracer.span("db.create${EntityName}", () =>
      repo.create${EntityName}(${entityName}),
    );
  };
}

function update${EntityName}(repo: ${EntityName}Repository, tracer: Tracer) {
  return async (
    userId: UserId,
    ${entityName}Id: ${EntityName}Id,
    params: Update${EntityName}InputParams,
  ) => {
    const ${entityName} = await tracer.span("db.get${EntityName}ByUserIdAnd${EntityName}Id", () =>
      repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id),
    );
    if (!${entityName})
      throw new ResourceNotFoundError("update${EntityName}Usecase:${entityName} not found");

    const new${EntityName} = create${EntityName}Entity({
      ...${entityName},
      ...params,
    });

    const updated${EntityName} = await tracer.span("db.update${EntityName}", () =>
      repo.update${EntityName}(new${EntityName}),
    );
    if (!updated${EntityName})
      throw new ResourceNotFoundError("update${EntityName}Usecase:${entityName} not found");

    return updated${EntityName};
  };
}

function delete${EntityName}(repo: ${EntityName}Repository, tracer: Tracer) {
  return async (userId: UserId, ${entityName}Id: ${EntityName}Id) => {
    const ${entityName} = await tracer.span("db.get${EntityName}ByUserIdAnd${EntityName}Id", () =>
      repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id),
    );
    if (!${entityName}) throw new ResourceNotFoundError("${entityName} not found");

    await tracer.span("db.delete${EntityName}", () =>
      repo.delete${EntityName}(${entityName}),
    );

    return;
  };
}
`;
  fs.writeFileSync(
    path.join(featurePath, `${entityName}Usecase.ts`),
    content,
  );
}

function generateRepository() {
  const content = `import {
  type ${EntityName},
  type ${EntityName}Id,
  ${EntityName}Schema,
  create${EntityName}Entity,
} from "@packages/domain/${entityName}/${entityName}Schema";
import type { UserId } from "@packages/domain/user/userSchema";
import { DomainValidateError } from "@packages/domain/errors";
import { ResourceNotFoundError } from "@backend/error";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { ${entityName}s } from "@infra/drizzle/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export type ${EntityName}Repository<T = any> = {
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
        // TODO: Add more fields as needed
      })
      .where(and(eq(${entityName}s.id, ${entityName}.id), eq(${entityName}s.userId, ${entityName}.userId)))
      .returning();

    if (!result) {
      return undefined;
    }

    const updated${EntityName} = create${EntityName}Entity({ ...result, type: "persisted" });

    return updated${EntityName};
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
  fs.writeFileSync(
    path.join(featurePath, `${entityName}Repository.ts`),
    content,
  );
}

function generateFeatureIndex() {
  const content = `export * from "./${entityName}Handler";
export * from "./${entityName}Repository";
export * from "./${entityName}Route";
export * from "./${entityName}Usecase";
`;
  fs.writeFileSync(path.join(featurePath, "index.ts"), content);
}

// Test templates
function generateRouteTest() {
  const content = `import { Hono } from "hono";
import { testClient } from "hono/testing";

import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { expect, test } from "vitest";

import { create${EntityName}Route } from "..";

test("GET ${entityName}s / success", async () => {
  const route = create${EntityName}Route();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get();

  expect(res.status).toEqual(200);
});

test("POST ${entityName} / success", async () => {
  const route = create${EntityName}Route();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      name: "Test ${EntityName}",
    },
  });

  expect(res.status).toEqual(200);
});

test("GET ${entityName}s/:id / success", async () => {
  const route = create${EntityName}Route();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  // TODO: Use a valid ID from test seed data
  const res = await client[":id"].$get({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  expect(res.status).toEqual(200);
});

test("PUT ${entityName}s/:id / success", async () => {
  const route = create${EntityName}Route();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  // TODO: Use a valid ID from test seed data
  const res = await client[":id"].$put({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
    json: {
      name: "Updated ${EntityName}",
    },
  });

  expect(res.status).toEqual(200);
});

test("DELETE ${entityName}s/:id / success", async () => {
  const route = create${EntityName}Route();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  // TODO: Use a valid ID from test seed data
  const res = await client[":id"].$delete({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  expect(res.status).toEqual(200);
});
`;
  fs.writeFileSync(
    path.join(testPath, `${entityName}Route.test.ts`),
    content,
  );
}

function generateUsecaseTest() {
  const content = `import {
  type ${EntityName},
  type ${EntityName}Id,
  create${EntityName}Id,
} from "@packages/domain/${entityName}/${entityName}Schema";
import { type UserId, createUserId } from "@packages/domain/user/userSchema";
import { ResourceNotFoundError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import { type ${EntityName}Repository, new${EntityName}Usecase } from "..";

describe("${EntityName}Usecase", () => {
  let repo: ${EntityName}Repository;
  let usecase: ReturnType<typeof new${EntityName}Usecase>;

  beforeEach(() => {
    repo = mock<${EntityName}Repository>();
    usecase = new${EntityName}Usecase(instance(repo), noopTracer);
    reset(repo);
  });

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const ${entityName}Id1 = create${EntityName}Id("00000000-0000-4000-8000-000000000001");
  const ${entityName}Id2 = create${EntityName}Id("00000000-0000-4000-8000-000000000002");

  describe("get${EntityName}s", () => {
    type Get${EntityName}sTestCase = {
      name: string;
      userId: UserId;
      mockReturn: ${EntityName}[] | undefined;
      expectError: boolean;
    };

    const testCases: Get${EntityName}sTestCase[] = [
      {
        name: "success",
        userId: userId1,
        mockReturn: [
          {
            id: ${entityName}Id1,
            userId: userId1,
            name: "Test ${EntityName} 1",
            type: "new",
          },
          {
            id: ${entityName}Id2,
            userId: userId1,
            name: "Test ${EntityName} 2",
            type: "new",
          },
        ],
        expectError: false,
      },
      {
        name: "failed / get${EntityName}sByUserId error",
        userId: userId1,
        mockReturn: undefined,
        expectError: true,
      },
    ];

    testCases.forEach(({ name, userId, mockReturn, expectError }) => {
      it(\`\${name}\`, async () => {
        if (expectError) {
          when(repo.get${EntityName}sByUserId(userId)).thenReject(new Error());

          await expect(usecase.get${EntityName}s(userId)).rejects.toThrow(Error);
          return verify(repo.get${EntityName}sByUserId(userId)).once();
        }

        when(repo.get${EntityName}sByUserId(userId)).thenResolve(mockReturn!);

        const result = await usecase.get${EntityName}s(userId);
        expect(result).toEqual(mockReturn);

        verify(repo.get${EntityName}sByUserId(userId)).once();
      });
    });
  });

  describe("get${EntityName}", () => {
    type Get${EntityName}TestCase = {
      name: string;
      userId: UserId;
      ${entityName}Id: ${EntityName}Id;
      mockReturn: ${EntityName} | undefined;
      expectError?: {
        get${EntityName}?: Error;
        notFound?: ResourceNotFoundError;
      };
    };

    const testCases: Get${EntityName}TestCase[] = [
      {
        name: "success",
        userId: userId1,
        ${entityName}Id: ${entityName}Id1,
        mockReturn: {
          id: ${entityName}Id1,
          userId: userId1,
          name: "Test ${EntityName}",
          type: "new",
        },
      },
      {
        name: "failed / not found",
        userId: userId1,
        ${entityName}Id: ${entityName}Id1,
        mockReturn: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("${entityName} not found"),
        },
      },
      {
        name: "failed / get${EntityName}ByUserIdAnd${EntityName}Id error",
        userId: userId1,
        ${entityName}Id: ${entityName}Id1,
        mockReturn: undefined,
        expectError: {
          get${EntityName}: new Error(),
        },
      },
    ];

    testCases.forEach(({ name, userId, ${entityName}Id, mockReturn, expectError }) => {
      it(\`\${name}\`, async () => {
        if (expectError?.get${EntityName}) {
          when(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).thenReject(
            expectError.get${EntityName},
          );

          await expect(usecase.get${EntityName}(userId, ${entityName}Id)).rejects.toThrow(Error);
          return verify(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).once();
        }

        when(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).thenResolve(
          mockReturn,
        );

        if (expectError?.notFound) {
          await expect(usecase.get${EntityName}(userId, ${entityName}Id)).rejects.toThrow(
            ResourceNotFoundError,
          );
          return verify(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).once();
        }

        const result = await usecase.get${EntityName}(userId, ${entityName}Id);
        expect(result).toEqual(mockReturn);

        verify(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).once();
        expect(expectError).toBeUndefined();
      });
    });
  });

  describe("create${EntityName}", () => {
    type Create${EntityName}TestCase = {
      name: string;
      userId: UserId;
      inputParams: { name: string };
      mockReturn: ${EntityName} | undefined;
      expectError: boolean;
    };

    const testCases: Create${EntityName}TestCase[] = [
      {
        name: "success",
        userId: userId1,
        inputParams: { name: "New ${EntityName}" },
        mockReturn: {
          id: ${entityName}Id1,
          userId: userId1,
          name: "New ${EntityName}",
          type: "new",
        },
        expectError: false,
      },
      {
        name: "failed / create${EntityName} error",
        userId: userId1,
        inputParams: { name: "New ${EntityName}" },
        mockReturn: undefined,
        expectError: true,
      },
    ];

    testCases.forEach(
      ({ name, userId, inputParams, mockReturn, expectError }) => {
        it(\`\${name}\`, async () => {
          if (expectError) {
            when(repo.create${EntityName}(anything())).thenReject(new Error());
            await expect(
              usecase.create${EntityName}(userId, inputParams),
            ).rejects.toThrow(Error);
            return verify(repo.create${EntityName}(anything())).once();
          }

          when(repo.create${EntityName}(anything())).thenResolve(mockReturn!);

          const result = await usecase.create${EntityName}(userId, inputParams);

          expect(result).toEqual(mockReturn);
          verify(repo.create${EntityName}(anything())).once();
        });
      },
    );
  });

  describe("update${EntityName}", () => {
    type Update${EntityName}TestCase = {
      name: string;
      userId: UserId;
      ${entityName}Id: ${EntityName}Id;
      existing${EntityName}: ${EntityName} | undefined;
      updateParams: {
        name?: string;
      };
      updated${EntityName}: ${EntityName} | undefined;
      expectError?: {
        get${EntityName}?: Error;
        notFound?: ResourceNotFoundError;
        update${EntityName}?: Error;
      };
    };

    const testCases: Update${EntityName}TestCase[] = [
      {
        name: "success",
        userId: userId1,
        ${entityName}Id: ${entityName}Id1,
        existing${EntityName}: {
          id: ${entityName}Id1,
          userId: userId1,
          name: "Old Name",
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
        updateParams: { name: "Updated Name" },
        updated${EntityName}: {
          id: ${entityName}Id1,
          userId: userId1,
          name: "Updated Name",
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
      },
      {
        name: "failed / not found",
        userId: userId1,
        ${entityName}Id: ${entityName}Id2,
        existing${EntityName}: undefined,
        updateParams: { name: "Updated Name" },
        updated${EntityName}: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("${entityName} not found"),
        },
      },
      {
        name: "failed / get${EntityName}ByUserIdAnd${EntityName}Id error",
        userId: userId1,
        ${entityName}Id: ${entityName}Id1,
        existing${EntityName}: undefined,
        updateParams: { name: "Updated Name" },
        updated${EntityName}: undefined,
        expectError: {
          get${EntityName}: new Error(),
        },
      },
      {
        name: "failed / update${EntityName} error",
        userId: userId1,
        ${entityName}Id: ${entityName}Id1,
        existing${EntityName}: {
          id: ${entityName}Id1,
          userId: userId1,
          name: "Old Name",
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
        updateParams: { name: "Updated Name" },
        updated${EntityName}: {
          id: ${entityName}Id1,
          userId: userId1,
          name: "Updated Name",
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
        expectError: {
          update${EntityName}: new Error(),
        },
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        ${entityName}Id,
        existing${EntityName},
        updateParams,
        updated${EntityName},
        expectError,
      }) => {
        it(\`\${name}\`, async () => {
          if (expectError?.get${EntityName}) {
            when(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId1, ${entityName}Id1)).thenReject(
              expectError.get${EntityName},
            );
            await expect(
              usecase.update${EntityName}(userId, ${entityName}Id, updateParams),
            ).rejects.toThrow(Error);
            return verify(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).once();
          }

          if (expectError?.notFound) {
            when(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId1, ${entityName}Id1)).thenResolve(
              existing${EntityName},
            );
            await expect(
              usecase.update${EntityName}(userId, ${entityName}Id, updateParams),
            ).rejects.toThrow(ResourceNotFoundError);
            return verify(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).once();
          }

          when(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId1, ${entityName}Id1)).thenResolve(
            existing${EntityName},
          );

          if (expectError?.update${EntityName}) {
            when(repo.update${EntityName}(anything())).thenReject(
              expectError.update${EntityName},
            );
            await expect(
              usecase.update${EntityName}(userId, ${entityName}Id, updateParams),
            ).rejects.toThrow(Error);

            return verify(repo.update${EntityName}(anything())).once();
          }

          when(repo.update${EntityName}(anything())).thenResolve(updated${EntityName});

          const result = await usecase.update${EntityName}(userId, ${entityName}Id, updateParams);
          expect(result).toEqual(updated${EntityName});

          verify(repo.update${EntityName}(anything())).once();
          expect(expectError).toBeUndefined();
        });
      },
    );
  });

  describe("delete${EntityName}", () => {
    type Delete${EntityName}TestCase = {
      name: string;
      userId: UserId;
      ${entityName}Id: ${EntityName}Id;
      existing${EntityName}: ${EntityName} | undefined;
      expectError?: {
        get${EntityName}?: Error;
        notFound?: ResourceNotFoundError;
        delete${EntityName}?: Error;
      };
    };

    const testCases: Delete${EntityName}TestCase[] = [
      {
        name: "success",
        userId: userId1,
        ${entityName}Id: ${entityName}Id1,
        existing${EntityName}: {
          id: ${entityName}Id1,
          userId: userId1,
          name: "Test ${EntityName}",
          type: "new",
        },
      },
      {
        name: "failed / not found",
        userId: userId1,
        ${entityName}Id: ${entityName}Id1,
        existing${EntityName}: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("${entityName} not found"),
        },
      },
      {
        name: "failed / delete${EntityName} error",
        userId: userId1,
        ${entityName}Id: ${entityName}Id1,
        existing${EntityName}: {
          id: ${entityName}Id1,
          userId: userId1,
          name: "Test ${EntityName}",
          type: "new",
        },
        expectError: {
          delete${EntityName}: new Error(),
        },
      },
    ];

    testCases.forEach(({ name, userId, ${entityName}Id, existing${EntityName}, expectError }) => {
      it(\`\${name}\`, async () => {
        if (expectError?.get${EntityName}) {
          when(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).thenReject(
            expectError.get${EntityName},
          );

          await expect(usecase.delete${EntityName}(userId, ${entityName}Id)).rejects.toThrow(
            Error,
          );
          return verify(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).once();
        }

        when(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).thenResolve(
          existing${EntityName},
        );

        if (expectError?.notFound) {
          await expect(usecase.delete${EntityName}(userId, ${entityName}Id)).rejects.toThrow(
            ResourceNotFoundError,
          );
          return verify(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).once();
        }

        if (expectError?.delete${EntityName}) {
          when(repo.delete${EntityName}(existing${EntityName}!)).thenReject(
            expectError.delete${EntityName},
          );
          await expect(usecase.delete${EntityName}(userId, ${entityName}Id)).rejects.toThrow(
            Error,
          );

          return verify(repo.delete${EntityName}(existing${EntityName}!)).once();
        }

        await usecase.delete${EntityName}(userId, ${entityName}Id);

        verify(repo.delete${EntityName}(existing${EntityName}!)).once();
        verify(repo.get${EntityName}ByUserIdAnd${EntityName}Id(userId, ${entityName}Id)).once();
        expect(expectError).toBeUndefined();
      });
    });
  });
});
`;
  fs.writeFileSync(
    path.join(testPath, `${entityName}Usecase.test.ts`),
    content,
  );
}

function updateFeatureExports() {
  const featureIndexPath = path.join(backendPath, "feature", "index.ts");
  if (fs.existsSync(featureIndexPath)) {
    const currentContent = fs.readFileSync(featureIndexPath, "utf-8");
    const exportLine = `export * from "./${entityName}";`;

    if (!currentContent.includes(exportLine)) {
      const updatedContent = currentContent.trim() + "\n" + exportLine + "\n";
      fs.writeFileSync(featureIndexPath, updatedContent);
      console.log(`✅ Updated feature/index.ts with ${entityName} export`);
    }
  } else {
    console.log(
      "⚠️  Could not find feature/index.ts - please add export manually",
    );
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
1. Add the ${entityName} domain entities in packages/domain/${entityName}/
2. Add the ${entityName} table to infra/drizzle/schema.ts
3. Add DTOs to packages/types (request and response schemas)
4. Add the route to app.ts: app.route('/users/${entityName}s', new${EntityName}Route)
5. Run migrations: pnpm run db-generate && pnpm run db-migrate
6. Update the repository with actual field mappings
`);
}

// Run the generator
try {
  generateFeature();
} catch (error) {
  console.error("Error generating feature:", error);
  process.exit(1);
}
