import { POST as generateDesignPost } from "../generate-design/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return generateDesignPost(request);
}
