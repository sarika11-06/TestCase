# AI Test Case Generator

An intelligent test automation system that uses Gemini AI to generate, execute, and manage test cases for web applications.

## Features

- 🤖 **AI-Powered Parsing**: Uses Google Gemini to understand natural language test instructions
- 🕷️ **Web Scraping**: Automatically scrapes interactive elements from any website
- 📝 **Test Case Generation**: Generates test cases in XML and Playwright TypeScript formats
- ▶️ **Live Execution**: Execute tests directly on live preview iframe
- 🎯 **Smart Element Detection**: Intelligently matches UI elements from user prompts
- 📊 **Site Analysis**: Provides comprehensive analysis of web pages

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **AI**: Google Gemini Pro
- **Automation**: Playwright, Puppeteer
- **State Management**: TanStack Query

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/ai-test-case-generator.git
    cd ai-test-case-generator
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create `.env` file:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    PORT=3000
    ```

4. Start the development server:
    ```bash
    npm run dev
    ```

## Usage

1. **Enter URL**: Input the website you want to test
2. **Scrape**: Click "1. Scrape" to analyze the page
3. **Write Instructions**: Describe what you want to test (e.g., "click all navbar buttons")
4. **Generate**: Click "2. Generate" to create test cases
5. **Execute**: Run tests on the live preview
6. **Download**: Get XML or Playwright TypeScript code

## Example Prompts

- "Fill username with admin, click login"
- "Check all links on the site"
- "Test all forms"
- "Click all navbar buttons"

## API Endpoints

- `POST /api/scrape-website` - Scrape website elements
- `POST /api/parse-instructions` - Parse natural language with Gemini
- `POST /api/generate-test-cases` - Generate test cases
- `POST /api/execute-test-flow` - Execute tests

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

## License

MIT

## Author

Your Name
