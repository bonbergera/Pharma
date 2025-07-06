// Import the 'config' function from the 'dotenv' package to load environment variables
import { config } from 'dotenv';
// Execute the 'config' function to load variables from a .env file into process.env
config();

// Import the AI flow for analyzing packaging, ensuring it's registered for use
import '@/ai/flows/analyze-packaging.ts';