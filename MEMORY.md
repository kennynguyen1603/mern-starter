# MERN Stack Monorepo — Project Rules & Conventions

## Tech Stack
- **M** — MongoDB + Mongoose
- **E** — Express.js 5
- **R** — React 19 (Vite)
- **N** — Node.js 22

## Monorepo Structure
```
mern-monorepo/
├── packages/
│   ├── api/          → @mern/api (Express + MongoDB backend)
│   ├── web/          → @mern/web (React + Vite frontend)
│   └── shared/       → @mern/shared (Shared TypeScript types)
├── package.json      → Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.json     → Root TS project references
├── .env.development  → Environment variables
└── docker-compose.yml → MongoDB container
```

## Package Manager
- **pnpm** with workspaces (`pnpm-workspace.yaml`)
- Always use `pnpm` (not npm/yarn)

## Scripts
| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Run API + Web concurrently         |
| `pnpm dev:api`     | Run API only (port 4000)           |
| `pnpm dev:web`     | Run Web only (port 5173)           |
| `pnpm build`       | Build all packages                 |
| `pnpm lint`        | Lint all TypeScript files          |
| `pnpm format`      | Format with Prettier               |

## Environment Variables
- **Server-side**: Use `process.env.VARIABLE_NAME` (no VITE_ prefix)
- **Client-side**: Use `import.meta.env.VITE_VARIABLE_NAME` (must have VITE_ prefix)
- Env file: `.env.development` at root

## API Architecture
Follows layered architecture pattern:
```
Routes → Controllers → Services → Repositories → Models
```
- **Response & Error Handling Constraints**: See [API_RESPONSE_STANDARD.md](apps/api/src/docs/API_RESPONSE_STANDARD.md) for standard conventions regarding `SuccessResponse`, `ErrorResponse`, and Controller vs Service layer duties.

## Coding Conventions
- TypeScript strict mode everywhere
- ESM modules (`"type": "module"`)
- File imports with `.js` extension in API (NodeNext resolution)
- Prettier: semi, singleQuote, 80 printWidth, trailingComma all
