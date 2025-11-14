# AI Test Case Generator

An AI-powered application that automatically generates comprehensive test cases for any website using advanced AI analysis.

## Overview

This application allows users to:
- Enter any website URL
- Provide custom testing instructions
- Get AI-generated comprehensive test cases including:
  - UI/UX tests
  - Form validation tests
  - Navigation tests
  - End-to-end user flows
  - Automated Playwright test code

## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- TanStack Query for data fetching
- Wouter for routing
- React Hook Form with Zod validation

### Backend
- Express.js server
- OpenAI GPT-5 for AI-powered test case generation
- Cheerio for web scraping and HTML parsing
- Axios for HTTP requests

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # Shadcn UI components
│   │   │   ├── TestCaseGenerator.tsx  # Main generator component
│   │   │   ├── stat-card.tsx          # Dashboard stat cards
│   │   │   ├── status-badge.tsx       # Test status badges
│   │   │   ├── progress-indicator.tsx # Flakiness progress bars
│   │   │   ├── root-cause-panel.tsx   # Root cause display
│   │   │   ├── execution-history.tsx  # Test execution timeline
│   │   │   ├── flaky-test-table.tsx   # Flaky tests data table
│   │   │   └── app-sidebar.tsx        # Navigation sidebar
│   │   ├── pages/
│   │   │   ├── Home.tsx               # Test generator page
│   │   │   ├── Dashboard.tsx          # Overview dashboard
│   │   │   ├── FlakyTests.tsx         # Flaky tests listing
│   │   │   ├── TestDetail.tsx         # Individual test analysis
│   │   │   └── Heatmap.tsx            # Test distribution heatmap
│   │   └── App.tsx                    # App routing & sidebar
├── server/
│   ├── routes.ts                      # API endpoints (including flaky test APIs)
│   ├── scraper.ts                     # Web scraping logic
│   ├── testCaseGenerator.ts          # AI test generation
│   ├── flaky-analyzer.ts             # Flaky test detection logic
│   └── openai.ts                      # OpenAI client
├── shared/
│   └── schema.ts                      # Shared TypeScript schemas
└── design_guidelines.md               # UI/UX design guidelines
```

## Features

1. **Website Analysis**: Automatically scrapes and analyzes website structure including:
   - Page title and description
   - Navigation links
   - Forms and input fields
   - Buttons and interactive elements
   - Internal links

2. **AI-Powered Test Generation**: Uses OpenAI GPT-5 to generate:
   - Comprehensive test cases
   - Test steps and expected results
   - Playwright automation code
   - Test categorization (UI, API, E2E, etc.)
   - Priority levels (High, Medium, Low)

3. **Flaky Test Detection System**:
   - **Dashboard**: Real-time overview showing total tests executed, flaky test count, success rate, and average execution time
   - **Flaky Tests Listing**: Searchable and filterable table of all flaky tests with detailed metrics
   - **Test Detail View**: In-depth analysis of individual tests including:
     - Flakiness score and metrics (timing variance, failure rate)
     - Root cause analysis and recommendations
     - Execution history with timeline visualization
     - Performance charts (success rate over time, execution duration trends)
   - **Test Heatmap**: Visual representation of test case distribution across websites

4. **Beautiful UI**: 
   - Clean, professional design following Linear/Material Design principles
   - Responsive layout for all screen sizes with sidebar navigation
   - Interactive test case cards with expand/collapse
   - Syntax-highlighted code blocks
   - Data visualization with charts and progress indicators
   - Copy and download functionality

5. **Export Options**:
   - Copy individual test cases to clipboard
   - Download all test cases as Markdown file
   - Includes Playwright code for automation

## API Endpoints

### POST /api/generate-test-cases
Generates test cases for a given website URL and user prompt.

**Request Body:**
```json
{
  "url": "https://example.com",
  "prompt": "Test all form validations and user login flow"
}
```

**Response:**
```json
{
  "analysis": { ... },
  "testCases": [ ... ],
  "summary": {
    "totalTests": 10,
    "byType": { "UI": 5, "E2E": 3, "API": 2 },
    "coverageAreas": ["Forms", "Navigation", "Authentication"]
  }
}
```

## Environment Variables

- `OPENAI_API_KEY`: Required for AI test case generation
- `SESSION_SECRET`: Used for session management

## Running the Application

The application runs on a single port with both frontend and backend:
- Frontend: Vite development server
- Backend: Express.js API server
- Command: `npm run dev`

## Design Philosophy

- **Developer-focused**: Clean, efficient interface for technical users
- **Information hierarchy**: Clear separation between input, processing, and results
- **Accessibility**: Proper ARIA labels, keyboard navigation, focus indicators
- **Professional polish**: Subtle animations, consistent spacing, proper typography
