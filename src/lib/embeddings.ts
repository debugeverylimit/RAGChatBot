import { pipeline } from "@xenova/transformers";
import type { EmbeddingFunction, EmbeddingFunctionSpace } from "chromadb";
import { env } from "../config/env.js";

const QUERY_PREFIX =
  "Represent this sentence for searching relevant passages: ";

let extractor: any = null;

async function getExtractor(): Promise<any> {
  if (!extractor) {
    console.log(`Loading embedding model: ${env.embeddingModel}...`);
    extractor = await pipeline(
      "feature-extraction",
      env.embeddingModel,
      {
        quantized: true,
      }
    );
  }
  return extractor;
}

async function embedBatch(
  texts: string[],
  isQuery: boolean,
): Promise<number[][]> {
  const model = await getExtractor();
  const embeddings: number[][] = [];

  for (const text of texts) {
    const input = isQuery ? `${QUERY_PREFIX}${text}` : text;

    const output = await model(input, {
      pooling: "mean",
      normalize: true,
    });

    embeddings.push(Array.from(output.data as Float32Array));
  }

  return embeddings;
}

export async function embedDocuments(
  texts: string[],
): Promise<number[][]> {
  return embedBatch(texts, false);
}

export async function embedQuery(
  text: string,
): Promise<number[]> {
  const [embedding] = await embedBatch([text], true);
  return embedding;
}

export class BgeEmbeddingFunction implements EmbeddingFunction {
  name = "bge-small-en-v1.5";

  async generate(texts: string[]): Promise<number[][]> {
    return embedDocuments(texts);
  }

  async generateForQueries(
    texts: string[],
  ): Promise<number[][]> {
    return embedBatch(texts, true);
  }

  defaultSpace(): EmbeddingFunctionSpace {
    return "cosine";
  }

  supportedSpaces(): EmbeddingFunctionSpace[] {
    return ["cosine"];
  }

  getConfig(): Record<string, string> {
    return {
      model: env.embeddingModel,
    };
  }
}

let sharedEmbeddingFunction: BgeEmbeddingFunction | null = null;

export function getEmbeddingFunction(): BgeEmbeddingFunction {
  if (!sharedEmbeddingFunction) {
    sharedEmbeddingFunction = new BgeEmbeddingFunction();
  }
  return sharedEmbeddingFunction;
}

