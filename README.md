# AI Test Case Generator

Automatically generate comprehensive test cases for any website using AI-powered analysis and Playwright automation.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start development server
npm run dev
```

Visit `http://localhost:3000`

## 📁 Project Structure

```
client/     → Frontend (React + TypeScript + Tailwind)
server/     → Backend (Express + Playwright + OpenAI)
shared/     → Shared TypeScript schemas
```

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed organization.

## 🛠️ Available Scripts

```bash
npm run dev      # Start development server (frontend + backend)
npm run build    # Build for production
npm start        # Run production build
npm run check    # TypeScript type checking
```

## 🏗️ Architecture

### Frontend (Port 3000)
- **React 18** with TypeScript
- **TanStack Query** for API state management
- **Tailwind CSS** + **shadcn UI** for styling
- **Vite** for fast development

### Backend (Port 3000)
- **Express.js** API server
- **Playwright** for web scraping and screenshots
- **OpenAI GPT** for test case generation
- **File-based storage** for scraped XPath data

### Communication
- Frontend makes API calls to `/api/*` endpoints
- Backend responds with JSON
- Shared TypeScript types ensure type safety

## 🔑 Environment Variables

```env
PORT=3000
OPENAI_API_KEY=sk-...
NODE_ENV=development
```

## 🧪 Testing

```bash
npm test           # Run tests
npm run test:ui    # Open Vitest UI
```

## 📦 Build for Production

```bash
# Build frontend and backend
npm run build

# Output:
# - dist/public/    (frontend static files)
# - dist/index.js   (backend bundle)

# Run production server
npm start
```

## 🎯 Features

✅ Smart XPath scraping with Playwright  
✅ AI-powered test case generation  
✅ Live website preview  
✅ Playwright code generation  
✅ Export test cases  
✅ Form and button detection  

## 🔧 Tech Stack

**Frontend:**
- React 18, TypeScript
- TanStack Query
- Tailwind CSS
- shadcn UI
- React Hook Form + Zod

**Backend:**
- Node.js, Express
- Playwright
- OpenAI API
- TypeScript

**Shared:**
- Zod schemas
- TypeScript types

## 📝 License

MIT

## 🤝 Contributing

1. Frontend changes → `client/src/`
2. Backend changes → `server/`
3. Shared types → `shared/schema.ts`
4. Run `npm run check` before committing
5. Keep components small and focused
