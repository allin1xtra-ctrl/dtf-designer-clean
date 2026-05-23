# Campaign Concept Studio (Next.js + OpenAI Responses API)

A full-stack campaign concept studio for marketing teams. Users enter a short campaign brief and receive:
- a concise campaign concept
- 3 headline/body copy variants
- a launch checklist
- image prompts and generated images

## Stack
- Next.js App Router
- Server Route Handler (`app/api/campaign-studio/route.ts`)
- OpenAI Node SDK via the **Responses API** (text + image generation)

## Client/Server Boundary
- **Client UI**: `app/campaign-studio/page.tsx` collects form inputs and renders results.
- **Server API**: `app/api/campaign-studio/route.ts` performs all OpenAI calls.
- `OPENAI_API_KEY` is never exposed to the browser.

## Environment Variables
Create `.env.local`:

```bash
OPENAI_API_KEY=your_api_key_here
# Optional overrides
OPENAI_TEXT_MODEL=gpt-5.4-mini
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_SIZE=1024x1024
```

Model guidance reference: https://developers.openai.com/api/docs/models

## Install & Run
```bash
npm install
npm run dev
```
Open `http://localhost:3000/campaign-studio`.

## Production Build
```bash
npm run build
npm run start
```

## Deployment Notes
- Add the same environment variables to your hosting provider (e.g. Vercel Project Settings → Environment Variables).
- Keep OpenAI requests server-side only (`app/api/campaign-studio/route.ts`).
- If you need lower latency/cost, start by adjusting `OPENAI_TEXT_MODEL` and image size.

## Validation Plan (small)
1. **Happy path**: Submit all 5 fields and verify concept, 3 variants, checklist, 3 prompts, and 3 images render.
2. **Validation path**: Leave a field blank; confirm server returns 400 and UI shows an error state.
3. **Key missing path**: Remove `OPENAI_API_KEY`; confirm clear setup error message.
4. **Loading/empty states**: Confirm pre-submit empty state and in-flight loading copy are visible.

## Where to Adjust Later
- **Model choice**: `DEFAULT_TEXT_MODEL` / `DEFAULT_IMAGE_MODEL` in `app/api/campaign-studio/route.ts` or env vars.
- **Prompting**: system prompt + `sharedContext` in `app/api/campaign-studio/route.ts`.
- **Image settings**: `OPENAI_IMAGE_SIZE` and the generated `imagePrompts` handling in `app/api/campaign-studio/route.ts`.


## Workflow Example

```ts
import { sleep } from "workflow";

export async function handleUserSignup(email: string) {
  "use workflow";

  const user = await createUser(email);
  await sendWelcomeEmail(user);

  await sleep("5s");

  await sendOnboardingEmail(user);
  return { userId: user.id, status: "onboarded" };
}
```
