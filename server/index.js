import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import scrapeRouter from './routes/scrape.js';
import generateRouter from './routes/generate.js';
import parseInstructionsRouter from './routes/parse-instructions.js';

const app = express();

// Increase body parser limit to 50mb (adjust as needed)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware
app.use(cors());
app.use(json());

// Routes
app.use('/api', scrapeRouter);
app.use('/api', generateRouter);
app.use('/api', parseInstructionsRouter);

// Global error handler
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send('Something broke!');
});

export default app;