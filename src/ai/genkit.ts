// Import the 'genkit' core library for AI workflows and plugin management
import {genkit} from 'genkit';

// Import the Google AI plugin for integration with Google AI services
import {googleAI} from '@genkit-ai/googleai';

// Initialize the 'ai' object by configuring genkit with plugins and model details
export const ai = genkit({
  // Register the Google AI plugin to enable Google AI capabilities
  plugins: [googleAI()],
  // Specify the model to be used for AI operations
  model: 'googleai/gemini-2.0-flash',
});