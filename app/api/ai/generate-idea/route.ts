import { aiUnavailable } from "../_availability";
import { POST as generateDesignPost } from "../generate-design/route";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (process.env.CUSTOMIZER_AI_ENABLED !== "true") return aiUnavailable();
  return generateDesignPost(request);
}
