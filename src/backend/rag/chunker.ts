/**
 * Text Chunker for Knowledge Base Ingestion
 * 
 * Implements sentence-aware chunking with overlap for semantic coherence.
 * Preserves sentence boundaries to maintain context in embeddings.
 * 
 * @module backend/rag/chunker
 */

export interface ChunkOptions {
  maxTokens?: number;        // Max tokens per chunk (default: 500)
  overlap?: number;          // Overlap tokens between chunks (default: 70)
  preserveSentences?: boolean; // Don't split mid-sentence (default: true)
}

/**
 * Approximate token count (1 token ≈ 4 characters for English, varies for Indic)
 */
function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 chars for English
  // For Indic languages, closer to 1 token ≈ 2-3 chars
  const avgCharsPerToken = 4;
  return Math.ceil(text.length / avgCharsPerToken);
}

/**
 * Split text into sentences (language-agnostic)
 */
function splitIntoSentences(text: string): string[] {
  // Handle multiple sentence delimiters
  const sentences: string[] = [];
  
  // Split on common punctuation followed by whitespace
  const regex = /([.!?।॥।।]+\s+)/g;
  const parts = text.split(regex);
  
  let currentSentence = '';
  
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].match(regex)) {
      // This is a delimiter
      currentSentence += parts[i];
      sentences.push(currentSentence.trim());
      currentSentence = '';
    } else {
      currentSentence += parts[i];
    }
  }
  
  // Add any remaining text
  if (currentSentence.trim()) {
    sentences.push(currentSentence.trim());
  }
  
  return sentences.filter(s => s.length > 0);
}

/**
 * Chunk text with sentence awareness and overlap
 * 
 * @param input - Text to chunk
 * @param options - Chunking configuration
 * @returns Array of text chunks
 * 
 * @example
 * const chunks = chunkText(longDocument, { maxTokens: 500, overlap: 70 });
 * // Returns: ['chunk 1...', 'chunk 2...', 'chunk 3...']
 */
export function chunkText(
  input: string,
  options: ChunkOptions = {}
): string[] {
  const {
    maxTokens = 500,
    overlap = 70,
    preserveSentences = true
  } = options;
  
  if (!input || input.trim().length === 0) {
    return [];
  }
  
  // If input is small enough, return as single chunk
  if (estimateTokens(input) <= maxTokens) {
    return [input.trim()];
  }
  
  const chunks: string[] = [];
  
  if (preserveSentences) {
    // Sentence-aware chunking
    const sentences = splitIntoSentences(input);
    let currentChunk: string[] = [];
    let currentTokens = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = estimateTokens(sentence);
      
      // If adding this sentence exceeds limit, save current chunk
      if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        
        // Calculate overlap: keep last few sentences
        const overlapSentences: string[] = [];
        let overlapTokens = 0;
        
        for (let i = currentChunk.length - 1; i >= 0; i--) {
          const tokens = estimateTokens(currentChunk[i]);
          if (overlapTokens + tokens <= overlap) {
            overlapSentences.unshift(currentChunk[i]);
            overlapTokens += tokens;
          } else {
            break;
          }
        }
        
        currentChunk = overlapSentences;
        currentTokens = overlapTokens;
      }
      
      currentChunk.push(sentence);
      currentTokens += sentenceTokens;
    }
    
    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
  } else {
    // Simple token-based chunking (fallback)
    const words = input.split(/\s+/);
    const tokensPerWord = 1.3; // Rough estimate
    const wordsPerChunk = Math.floor(maxTokens / tokensPerWord);
    const overlapWords = Math.floor(overlap / tokensPerWord);
    
    for (let i = 0; i < words.length; i += (wordsPerChunk - overlapWords)) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }
  }
  
  return chunks;
}

/**
 * Validate chunk quality
 */
export function validateChunk(chunk: string): boolean {
  const tokens = estimateTokens(chunk);
  
  // Chunk should be substantial but not too large
  if (tokens < 10 || tokens > 1000) {
    return false;
  }
  
  // Should contain meaningful content (not just punctuation/whitespace)
  const meaningfulChars = chunk.replace(/[\s\p{P}]/gu, '').length;
  if (meaningfulChars < 20) {
    return false;
  }
  
  return true;
}

/**
 * Get chunk statistics for debugging
 */
export function getChunkStats(chunks: string[]) {
  const tokenCounts = chunks.map(estimateTokens);
  
  return {
    totalChunks: chunks.length,
    avgTokens: tokenCounts.reduce((a, b) => a + b, 0) / chunks.length,
    minTokens: Math.min(...tokenCounts),
    maxTokens: Math.max(...tokenCounts),
    totalTokens: tokenCounts.reduce((a, b) => a + b, 0)
  };
}

