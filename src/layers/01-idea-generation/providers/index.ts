import { AnthropicIdeaProvider } from './anthropic';
import { OpenAIIdeaProvider } from './openai';
import { IdeaOutput } from '../../../core/types';

export interface IIdeaProvider {
  generateIdea(): Promise<IdeaOutput>;
  estimateCost(): number;
}

export function createIdeaProvider(
  provider: 'anthropic' | 'openai',
  model: string,
  temperature: number
): IIdeaProvider {
  const apiKey = provider === 'anthropic'
    ? process.env.ANTHROPIC_API_KEY
    : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()}_API_KEY not found in environment`);
  }

  if (provider === 'anthropic') {
    return new AnthropicIdeaProvider(apiKey, model, temperature);
  }

  if (provider === 'openai') {
    return new OpenAIIdeaProvider(apiKey, model, temperature);
  }

  throw new Error(`Provider ${provider} not yet implemented`);
}
