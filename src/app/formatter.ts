import { DISCLAIMER, type ChatResponse } from "./schemas.js";
import { stripFooter } from "./validator.js";

export function formatResponse(response: ChatResponse): ChatResponse {
  const body = stripFooter(response.answer);
  return {
    ...response,
    answer: `${body}\n\nLast updated from sources: ${response.last_updated}`,
    disclaimer: DISCLAIMER,
  };
}
