import { Prisma, PrismaClient } from "@prisma/client";

function createPrisma() {
  return new PrismaClient().$extends({
    name: "SoftDelete",
    model: {
      $allModels: {
        async findManyWithTrashed<T, A>(
          this: T,
          args: Prisma.Args<T, "findMany">
        ): Promise<Prisma.Result<T, A, "findMany">> {
          const context = Prisma.getExtensionContext(this);
          const result = await (context as any).findMany({
            ...args,
            withTrashed: true,
          });

          return result;
        },
        async findFirstWithTrashed<T, A>(
          this: T,
          args: Prisma.Args<T, "findFirst">
        ): Promise<Prisma.Result<T, A, "findFirst">> {
          const context = Prisma.getExtensionContext(this);
          const result = await (context as any).findFirst({
            ...args,
            withTrashed: true,
          });

          return result;
        },
        async findUniqueWithTrashed<T, A>(
          this: T,
          args: Prisma.Args<T, "findUnique">
        ): Promise<Prisma.Result<T, A, "findUnique">> {
          const context = Prisma.getExtensionContext(this);
          const result = await (context as any).findUnique({
            ...args,
            withTrashed: true,
          });

          return result;
        },
        async delete<T, A>(
          this: T,
          args: Prisma.Args<T, "delete"> & { forceDelete?: boolean }
        ): Promise<Prisma.Result<T, A, "delete">> {
          const context = Prisma.getExtensionContext(this);
          const { forceDelete, ...restArgs } = args;

          const model = Prisma.dmmf.datamodel.models.find(
            (m) => m.name === context.name
          );
          const hasSoftDelete = model?.fields.some(
            (f) => f.name === "deletedAt"
          );

          if (forceDelete || !hasSoftDelete) {
            return (context as any).$parent[context.$name as any].delete(
              restArgs
            );
          }
          const result = await (context as any).update({
            ...restArgs,
            data: {
              deletedAt: new Date(),
            },
          });

          return result;
        },
        async deleteMany<T, A>(
          this: T,
          args: Prisma.Args<T, "deleteMany"> & { forceDelete?: boolean }
        ): Promise<Prisma.Result<T, A, "deleteMany">> {
          const context = Prisma.getExtensionContext(this);
          const { forceDelete, ...restArgs } = args;

          const model = Prisma.dmmf.datamodel.models.find(
            (m) => m.name === context.name
          );
          const hasSoftDelete = model?.fields.some(
            (f) => f.name === "deletedAt"
          );

          if (forceDelete || !hasSoftDelete) {
            return (context as any).$parent[context.$name as any].delete(
              restArgs
            );
          }
          const result = await (context as any).updateMany({
            ...restArgs,
            data: {
              deletedAt: new Date(),
            },
          });

          return result;
        },
      },
    },
    query: {
      $allOperations({ model, operation, args, query }) {
        if (operation === "create" || operation === "createMany") {
          return query(args);
        }
        const dataModel = Prisma.dmmf.datamodel.models.find(
          (m) => m.name === model
        );
        if (!dataModel) return query(args);
        const existDeletedAtColumn = dataModel.fields.some(
          (field) => field.name === "deletedAt"
        );
        if (!existDeletedAtColumn) return query(args);

        if (args["withTrashed"]) {
          delete args?.["where"]?.["deletedAt"];
          delete args["withTrashed"];
        } else if (dataModel) {
          if (!args["where"]) {
            args["where"] = {};
          }
          args["where"]["deletedAt"] = null;
        }
        return query(args);
      },
    },
  });
}

export type ExtendedPrisma = ReturnType<typeof createPrisma>;

declare const globalThis: {
  prismaGlobal: ExtendedPrisma;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? createPrisma();
