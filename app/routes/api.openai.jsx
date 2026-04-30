import { json } from "@remix-run/node";
import OpenAI from "openai";

export async function action({ request }) {
  const { prompt } = await request.json();

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });

  return json({ result: completion.choices[0].message.content });
}
