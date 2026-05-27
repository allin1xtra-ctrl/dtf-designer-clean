import { POST as generateDesignPost } from "../generate-design/route";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return generateDesignPost(request);
}
