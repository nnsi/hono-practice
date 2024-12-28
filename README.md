# Hono-practice

## Backend

### Architecture

Clean Arhitectureライク

- index.ts
  - context
    - context.ts
  - domain
    - {model}
      - {model}.ts
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
