const defaultChunkSizeTokens = 600;
const defaultChunkOverlapTokens = 100;

export interface ChunkingConfiguration {
  chunkSizeTokens: number;
  chunkOverlapTokens: number;
}

export function getChunkingConfiguration(): ChunkingConfiguration {
  const chunkSizeTokens = positiveInteger(process.env.CHUNK_SIZE_TOKENS, defaultChunkSizeTokens);
  const requestedOverlap = positiveInteger(process.env.CHUNK_OVERLAP_TOKENS, defaultChunkOverlapTokens, true);

  return {
    chunkSizeTokens,
    chunkOverlapTokens: Math.min(requestedOverlap, chunkSizeTokens - 1),
  };
}

function positiveInteger(value: string | undefined, fallback: number, allowZero = false): number {
  const parsed = Number(value);
  const minimum = allowZero ? 0 : 1;

  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : fallback;
}
