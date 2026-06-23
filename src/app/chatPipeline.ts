import { classifyQuery } from "./classifier.js";
import { formatResponse } from "./formatter.js";
import { runRag } from "./rag.js";
import { buildRefusal } from "./refusal.js";
import { assertNoPii } from "./piiGuard.js";
import type { ChatResponse } from "./schemas.js";
import { validateResponse } from "./validator.js";

export async function handleChat(message: string): Promise<ChatResponse> {
  assertNoPii(message);

  const label = classifyQuery(message);
  if (label !== "factual") {
    const refusal = await buildRefusal(label, message);
    return formatResponse(refusal);
  }

  const draft = await runRag(message);
  const validated = validateResponse({
    answer: draft.answer,
    citation_url: draft.citation_url,
    is_refusal: draft.is_refusal,
    chunks: draft.is_refusal ? undefined : draft._chunks,
  });

  const response: ChatResponse = {
    answer: validated.answer,
    citation_url: validated.citation_url,
    last_updated: draft.last_updated,
    is_refusal: draft.is_refusal,
    disclaimer: draft.disclaimer,
  };

  if (validated.issues.length > 0) {
    console.log(
      JSON.stringify({
        event: "validation_adjustment",
        issues: validated.issues,
      }),
    );
  }

  return formatResponse(response);
}
