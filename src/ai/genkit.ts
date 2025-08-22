import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({projectId: '490765999510'})],
  model: 'googleai/gemini-2.0-flash',
});
