export interface ISummaryRequest {
  text: string;
  maxLength?: number;
  tone?: 'professional' | 'casual' | 'technical';
}

export interface ISummaryResponse {
  summary: string;
  originalLength: number;
  summaryLength: number;
  processingTimeMs: number;
}

export interface IEmbeddingRequest {
  text: string;
}

export interface IEmbeddingResponse {
  embedding: number[];
  dimensions: number;
  processingTimeMs: number;
}