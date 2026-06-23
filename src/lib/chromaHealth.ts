import { env } from "../config/env.js";

export async function isChromaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${env.chromaHost}/api/v2/heartbeat`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
