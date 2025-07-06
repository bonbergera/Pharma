'use server';  

// Import necessary modules from the AI library and schema validation library  
import {ai} from '@/ai/genkit';  
import {z} from 'genkit';  

// Define the schema for the input data, expecting a data URI string for the product image  
const AnalyzePackagingInputSchema = z.object({  
  photoDataUri: z  
    .string()  
    // Description of the expected image format and quality for analysis  
    .describe(  
      "A clear photo of the product packaging, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. The image should be well-lit and show relevant details of the packaging."  
    ),  
});  
// Create a TypeScript type based on the input schema  
export type AnalyzePackagingInput = z.infer<typeof AnalyzePackagingInputSchema>;  

// Define the schema for AI analysis output, including authenticity, confidence, reason, and potential issues  
const AnalyzePackagingOutputSchema = z.object({  
  authenticity: z.object({  
    // Boolean indicating if the packaging seems authentic  
    isAuthentic: z.boolean().describe('A boolean indicating whether the packaging is likely authentic (true) or potentially counterfeit/suspect (false).'),  
    // Confidence score of the AI's authenticity assessment  
    confidence: z  
      .number()  
      .min(0)  
      .max(1)  
      .describe('The AI model\'s confidence level in the authenticity determination, ranging from 0 (no confidence) to 1 (full confidence).'),  
    // Detailed explanation for the AI's decision  
    reason: z.string().describe('A detailed explanation for the authenticity determination. Highlight specific visual features or anomalies observed, such as print quality, logo consistency, text legibility, color accuracy, or any detected security feature discrepancies. If suspect, point out what aspects raise concern.'),  
    // Optional list of potential issues or anomalies detected  
    potentialIssues: z.array(z.string()).optional().describe('An optional list of specific potential issues or anomalies detected (e.g., "Blurry text on batch number", "Logo slightly distorted", "Color saturation differs from typical examples").'),  
  }),  
});  
// Create a TypeScript type based on the output schema  
export type AnalyzePackagingOutput = z.infer<typeof AnalyzePackagingOutputSchema>;  

// Function to analyze packaging by invoking the AI flow  
export async function analyzePackaging(input: AnalyzePackagingInput): Promise<AnalyzePackagingOutput> {  
  return analyzePackagingFlow(input);  
}  

// Define the prompt that instructs the AI on how to perform packaging analysis  
const prompt = ai.definePrompt({  
  name: 'analyzePackagingPrompt',  
  input: {schema: AnalyzePackagingInputSchema},  
  output: {schema: AnalyzePackagingOutputSchema},  
  prompt: `You are an AI expert system specialized in identifying counterfeit pharmaceutical product packaging. Your primary goal is to assist in verifying the authenticity of medication packaging based on visual analysis.  

You will be provided with an image of product packaging. Analyze it meticulously for any signs of counterfeiting. Consider the following aspects, but do not limit your analysis to them:  
- Print Quality: Look for sharpness, clarity, smudging, pixelation, or misalignments.  
- Logo and Branding: Check for consistency with known authentic branding (shape, color, font, placement).  
- Text and Typography: Examine fonts, text size, spacing, spelling errors, and legibility of important information like drug name, dosage, manufacturer, batch number, expiry date.  
- Color Accuracy: Compare colors to known authentic packaging if possible, or note any unusual deviations.  
- Holograms and Security Features: If visible, assess their quality and apparent authenticity.  
- Overall Packaging Integrity: Look for signs of tampering, poor quality materials, or unusual seals.  

Based on your analysis, determine if the packaging is likely authentic or potentially counterfeit. Provide a confidence score (0.0 to 1.0) for your determination.  
Your reason should be detailed, explaining which specific visual features or anomalies led to your conclusion.  
If you identify specific potential issues, list them clearly.  

Analyze the following product packaging image:  
{{media url=photoDataUri}}`,  
  // Configure safety settings for the AI model, balancing safety and performance  
  config: {  
    safetySettings: [  
      {  
        category: 'HARM_CATEGORY_HATE_SPEECH',  
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',  
      },  
      {  
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',  
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',  
      },  
      {  
        category: 'HARM_CATEGORY_HARASSMENT',  
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',  
      },  
      {  
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',  
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',  
      },  
    ],  
  },  
});

// Define the AI flow for packaging analysis, specifying input and output schemas
const analyzePackagingFlow = ai.defineFlow(
  {
    // Name of the flow
    name: 'analyzePackagingFlow',
    // Schema for the input data
    inputSchema: AnalyzePackagingInputSchema,
    // Schema for the expected output data
    outputSchema: AnalyzePackagingOutputSchema,
  },
  async input => {
    // In an actual deployment, additional pre-processing could be added here,
    // such as validating or resizing the image, or post-processing like logging.
    
    // Invoke the prompt to run the AI model with the provided input
    const {output} = await prompt(input);
    
    // Check if the output was returned successfully
    if (!output) {
      // If no output is received, this indicates an error or failure in the AI model
      console.error('AI packaging analysis returned no output.');
      throw new Error('AI analysis failed to produce a valid output.');
    }
    
    // Return the analysis result
    return output;
  }
);