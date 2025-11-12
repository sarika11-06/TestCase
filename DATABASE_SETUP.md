# Database Setup Instructions

## Running on Replit
Your application is already configured to use Replit's built-in PostgreSQL database. The database connection is automatic when running on Replit.

## Running Locally (After Downloading)

If you download the code and want to run it locally, you'll need to set up a PostgreSQL database:

### Option 1: Using Local PostgreSQL

1. **Install PostgreSQL** on your machine
   - macOS: `brew install postgresql`
   - Ubuntu/Debian: `sudo apt-get install postgresql`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Create a database**
   ```bash
   psql -U postgres
   CREATE DATABASE test_generator_db;
   \q
   ```

3. **Set environment variable**
   Create a `.env` file in the project root:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/test_generator_db
   ```

### Option 2: Using Cloud PostgreSQL

You can use a cloud PostgreSQL service like:
- **Neon** (https://neon.tech) - Free tier available
- **Supabase** (https://supabase.com) - Free tier available
- **Railway** (https://railway.app) - Free tier available

After creating a database, copy the connection string and add it to your `.env` file:
```
DATABASE_URL=your_connection_string_here
```

### Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the application:
   ```bash
   npm run dev
   ```

The database tables will be created automatically when the application starts.

## Database Structure

Your application creates the following tables automatically:
- **websites** - Stores unique URLs tested
- **scrape_results** - Stores scraped website analysis data
- **test_cases** - Stores generated test cases
- **execution_results** - Stores test execution results

The URL structure you requested (like `https://umit.ac.in/exam`) is parsed into:
- Domain: `umit.ac.in`
- Path: `/exam`

All data is organized by website URL with proper relationships between tables.
