# Hono-practice

- backend Hono / Prisma + Drizzle
- frontend React / Tanstack Router
- drizzle
- types
  - request
  - response

## Backend

### Architecture

Clean Arhitectureライク

- index.ts
  - context
    - context.ts
  - domain
    - {model}
      - domain.ts
      - {vo}.ts
  - feature
    - {feature}
      - route.ts
      - handler.ts
      - usecase.ts
      - repository.ts
  - infra
    - {orm}
      - Instance.ts
      - Transaction.ts
  - query
    - {feature}QueryService.ts

```txt
handler -> usecase -> entities <- repository
                   -> query
```

## Frontend
