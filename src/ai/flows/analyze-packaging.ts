'use server';
/**
 * @fileOverview Analyzes product packaging for authenticity.
 *
 * - analyzePackaging - A function that handles the packaging analysis process.
 * - AnalyzePackagingInput - The input type for the analyzePackaging function.
 * - AnalyzePackagingOutput - The return type for the analyzePackaging function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePackagingInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the product packaging, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzePackagingInput = z.infer<typeof AnalyzePackagingInputSchema>;

const AnalyzePackagingOutputSchema = z.object({
  authenticity: z.object({
    isAuthentic: z.boolean().describe('Whether or not the packaging is authentic.'),
    confidence: z
      .number()
      .describe('The confidence level of the authenticity determination (0-1).'),
    reason: z.string().describe('The reason for the authenticity determination.'),
  }),
});
export type AnalyzePackagingOutput = z.infer<typeof AnalyzePackagingOutputSchema>;

export async function analyzePackaging(input: AnalyzePackagingInput): Promise<AnalyzePackagingOutput> {
  return analyzePackagingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePackagingPrompt',
  input: {schema: AnalyzePackagingInputSchema},
  output: {schema: AnalyzePackagingOutputSchema},
  prompt: `You are an expert in identifying counterfeit product packaging.

You will analyze the provided image of the product packaging and determine if it is authentic or not. Provide a confidence level (0-1) for your determination and a detailed reason for your decision.

Analyze the following product packaging:

{{media url=photoDataUri}}`,
});

const analyzePackagingFlow = ai.defineFlow(
  {
    name: 'analyzePackagingFlow',
    inputSchema: AnalyzePackagingInputSchema,
    outputSchema: AnalyzePackagingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
