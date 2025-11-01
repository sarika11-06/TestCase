# Project Structure

```
PromptTestCase/
├── client/                          # ✅ FRONTEND ONLY
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── ui/                  # shadcn UI components
│   │   │   └── TestCaseGenerator.tsx
│   │   ├── pages/                   # Page components
│   │   │   └── Home.tsx
│   │   ├── lib/                     # Frontend utilities
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── __tests__/               # Frontend tests
│   │   ├── App.tsx                  # Main app component
│   │   ├── main.tsx                 # React entry point
│   │   └── index.css                # Global styles
│   ├── index.html                   # HTML template
│   ├── public/                      # Static assets
│   ├── tsconfig.json                # Client TypeScript config
│   └── vite.config.ts               # Client Vite config (optional)
│
├── server/                          # ✅ BACKEND ONLY
│   ├── routes.ts                    # API endpoints
│   ├── scraper.ts                   # Playwright scraping
│   ├── testCaseGenerator.ts        # Test generation
│   ├── openai.ts                    # OpenAI client
│   ├── xpathStorage.ts              # Data persistence
│   ├── vite.ts                      # Vite dev middleware
│   ├── index.ts                     # Server entry point
│   └── tsconfig.json                # Server TypeScript config
│
├── shared/                          # ✅ SHARED CODE
│   └── schema.ts                    # Zod schemas (both sides)
│
├── scraped-xpaths/                  # Runtime data (gitignored)
│
├── dist/                            # Build output
│   ├── public/                      # Built frontend
│   └── index.js                     # Built backend
│
├── vite.config.ts                   # Root Vite config
├── tsconfig.json                    # Root TypeScript config
├── tailwind.config.ts               # Tailwind config
├── components.json                  # shadcn config
├── vitest.config.ts                 # Test config
├── package.json                     # Dependencies & scripts
├── .gitignore
├── .env
├── PROJECT_STRUCTURE.md
├── README.md
└── design_guidelines.md
```

## Clear Separation Rules

### ✅ Client Directory (`client/`)
**Purpose**: All frontend React code
**Contains**:
- React components (.tsx)
- React hooks
- Frontend utilities
- Styles (CSS/Tailwind)
- Client-side tests
- HTML template
- Static assets

**Dependencies**: 
- React, React DOM
- TanStack Query
- Tailwind CSS
- shadcn UI
- Wouter
- React Hook Form

**Build Output**: `dist/public/` (static files)

**Dev Server**: Vite dev server on port 5173 (proxied through Express in dev)

---

### ✅ Server Directory (`server/`)
**Purpose**: All backend Node.js/Express code
**Contains**:
- Express routes
- Business logic
- Database/File operations
- External API integrations (OpenAI)
- Web scraping (Playwright)
- Middleware

**Dependencies**:
- Express
- Playwright
- OpenAI SDK
- Axios
- File system (fs)

**Build Output**: `dist/index.js` (bundled server)

**Runtime**: Node.js with Express on port 3000

---

### ✅ Shared Directory (`shared/`)
**Purpose**: Code used by BOTH client and server
**Contains**:
- Zod schemas for validation
- TypeScript types/interfaces
- Constants shared across stack

**Rules**:
- ❌ NO React code
- ❌ NO Express code
- ❌ NO browser-specific APIs
- ❌ NO Node-specific APIs
- ✅ Only pure TypeScript types and schemas

---

## Development Workflow

### Start Development
```bash
npm run dev              # Starts Express + Vite middleware (recommended)
# OR separately:
npm run dev:server       # Starts Express on port 3000
npm run dev:client       # Starts Vite on port 5173
```

### Build for Production
```bash
npm run build            # Builds both client and server
npm start                # Runs production build
```

### Type Checking
```bash
npm run check            # Check all TypeScript
npm run check:client     # Check client only
npm run check:server     # Check server only
```

---

## Import Rules

### ✅ Client can import:
```typescript
import { something } from "@/components/..."  // Client code
import { schema } from "@shared/schema"       // Shared code
```

### ✅ Server can import:
```typescript
import express from "express"                 // Server modules
import { schema } from "../shared/schema"     // Shared code
```

### ❌ Client CANNOT import:
```typescript
import { route } from "../server/routes"      // ❌ NO SERVER CODE
import fs from "fs"                           // ❌ NO NODE APIS
```

### ❌ Server CANNOT import:
```typescript
import { Button } from "../client/src/..."    // ❌ NO CLIENT CODE
import React from "react"                     // ❌ NO REACT
```

---

## File Organization Best Practices

1. **One concern per directory**: Don't mix UI with API logic
2. **Shared code is minimal**: Only types and schemas
3. **Build outputs are separate**: `dist/public/` vs `dist/index.js`
4. **Config files at root**: Easier tooling setup
5. **Environment per directory**: Client has client config, server has server config

This structure ensures:
- ✅ Clear separation of concerns
- ✅ Easy to understand where code belongs
- ✅ Independent scaling (deploy client and server separately if needed)
- ✅ Type safety across the stack
- ✅ No accidental cross-contamination
