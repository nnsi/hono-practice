# Hono-practice

- Hono / Prisma+Drizzle / React / Vite + Tanstack Router
  - TODO: Prismaやめたい

## Backend

### Architecture

Clean Arhitectureライク

- index.ts
  - context
    - context.ts
  - domain
    - baseVo.ts
    - (yet) baseModel.ts
    - {feature}
  - feature
    - {feature}
      - route.ts
      - handler.ts
      - usecase.ts
      - repository.ts
  - infra
    - xxxPort.ts
    - xxxAdapter.ts
  - lib
  - middleware
  - query
    - {feature}QueryService.ts

## Frontend
