/**
 * Content Type Selector
 *
 * Selects a content type from an account's content types array
 * based on the configured selection mode.
 */

import { Account, ContentType, ContentStrategy, ContentTypeSelectionMode } from '../core/types';
import { logger } from '../core/logger';

export interface SelectedContentType {
  contentType: ContentType;
  index: number;
}

/**
 * Select a content type from the account's content types
 * Falls back to contentStrategy if no contentTypes defined
 */
export function selectContentType(account: Account): SelectedContentType | null {
  // If account has contentTypes array, use it
  if (account.contentTypes && account.contentTypes.length > 0) {
    const mode = account.contentTypeSelectionMode || 'random';
    return selectByMode(account.contentTypes, mode, account.lastContentTypeIndex);
  }

  // Fall back to legacy contentStrategy
  if (account.contentStrategy) {
    const legacyType = convertStrategyToContentType(account.contentStrategy);
    return {
      contentType: legacyType,
      index: 0,
    };
  }

  logger.warn('No content types or strategy defined for account', {
    accountId: account.id,
    accountName: account.name,
  });

  return null;
}

/**
 * Select content type based on selection mode
 */
function selectByMode(
  contentTypes: ContentType[],
  mode: ContentTypeSelectionMode,
  lastIndex?: number
): SelectedContentType {
  switch (mode) {
    case 'rotation':
      return selectRotation(contentTypes, lastIndex);

    case 'weighted':
      return selectWeighted(contentTypes);

    case 'random':
    default:
      return selectRandom(contentTypes);
  }
}

/**
 * Random selection (equal probability)
 */
function selectRandom(contentTypes: ContentType[]): SelectedContentType {
  const index = Math.floor(Math.random() * contentTypes.length);
  logger.debug('Selected content type randomly', {
    index,
    name: contentTypes[index].name,
  });
  return {
    contentType: contentTypes[index],
    index,
  };
}

/**
 * Rotation selection (cycle through in order)
 */
function selectRotation(
  contentTypes: ContentType[],
  lastIndex?: number
): SelectedContentType {
  const nextIndex = lastIndex !== undefined
    ? (lastIndex + 1) % contentTypes.length
    : 0;

  logger.debug('Selected content type by rotation', {
    lastIndex,
    nextIndex,
    name: contentTypes[nextIndex].name,
  });

  return {
    contentType: contentTypes[nextIndex],
    index: nextIndex,
  };
}

/**
 * Weighted selection (higher weight = more likely)
 */
function selectWeighted(contentTypes: ContentType[]): SelectedContentType {
  // Calculate total weight
  const totalWeight = contentTypes.reduce(
    (sum, ct) => sum + (ct.weight || 1),
    0
  );

  // Generate random number between 0 and totalWeight
  let random = Math.random() * totalWeight;

  // Find the selected content type
  for (let i = 0; i < contentTypes.length; i++) {
    const weight = contentTypes[i].weight || 1;
    random -= weight;

    if (random <= 0) {
      logger.debug('Selected content type by weight', {
        index: i,
        name: contentTypes[i].name,
        weight,
        totalWeight,
      });
      return {
        contentType: contentTypes[i],
        index: i,
      };
    }
  }

  // Fallback to last item (should not happen)
  const lastIndex = contentTypes.length - 1;
  return {
    contentType: contentTypes[lastIndex],
    index: lastIndex,
  };
}

/**
 * Convert legacy ContentStrategy to ContentType
 */
export function convertStrategyToContentType(strategy: ContentStrategy): ContentType {
  return {
    name: 'default',
    weight: 1,
    niche: strategy.niche,
    nicheDescription: strategy.nicheDescription,
    segmentCount: strategy.segmentCount || 3,
    segmentDuration: strategy.segmentDuration || 5,
    hookStyle: strategy.hookStyle,
    audioType: strategy.audioType,
    hashtagStrategy: strategy.hashtagStrategy,
    customHashtags: strategy.customHashtags,
  };
}

/**
 * Convert ContentType to ContentStrategy (for backward compatibility)
 */
export function convertContentTypeToStrategy(contentType: ContentType): ContentStrategy {
  return {
    niche: contentType.niche,
    nicheDescription: contentType.nicheDescription,
    contentType: 'reels_only',
    videoLength: (contentType.segmentCount * contentType.segmentDuration) as 7 | 10 | 15 | 30,
    segmentCount: contentType.segmentCount,
    segmentDuration: contentType.segmentDuration,
    hookStyle: contentType.hookStyle,
    audioType: contentType.audioType,
    hashtagStrategy: contentType.hashtagStrategy,
    customHashtags: contentType.customHashtags,
  };
}

/**
 * Get effective content strategy from account (handles both old and new format)
 */
export function getEffectiveContentStrategy(account: Account): ContentStrategy | null {
  const selected = selectContentType(account);

  if (!selected) {
    return null;
  }

  // If it's from legacy contentStrategy, return as-is
  if (account.contentStrategy && (!account.contentTypes || account.contentTypes.length === 0)) {
    return account.contentStrategy;
  }

  // Convert ContentType to ContentStrategy
  return convertContentTypeToStrategy(selected.contentType);
}
