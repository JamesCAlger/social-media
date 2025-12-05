import { PipelineConfig } from '../core/types';
import { defaultConfig } from './default';

export function getConfig(): PipelineConfig {
  // In the future, you can add environment-specific overrides here
  return defaultConfig;
}

export { defaultConfig };
