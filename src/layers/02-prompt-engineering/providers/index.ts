import { OpenAIPromptProvider } from './openai';
import { PromptOutput, IdeaOutput } from '../../../core/types';

export interface IPromptProvider {
  generatePrompts(idea: IdeaOutput): Promise<PromptOutput>;
  estimateCost(): number;
}

export function createPromptProvider(
  provider: 'anthropic' | 'openai',
  model: string,
  temperature: number
): IPromptProvider {
  const apiKey = provider === 'openai'
    ? process.env.OPENAI_API_KEY
    : process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()}_API_KEY not found in environment`);
  }

  if (provider === 'openai') {
    return new OpenAIPromptProvider(apiKey, model, temperature);
  }

  // TODO: Add Anthropic provider if needed
  throw new Error(`Provider ${provider} not yet implemented`);
}
