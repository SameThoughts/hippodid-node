/**
 * Example: Vercel AI SDK + HippoDid character memory
 *
 * This shows how to use @hippodid/sdk with the Vercel AI SDK to build
 * an AI chat endpoint where the assistant has persistent memory.
 *
 * Install:
 *   npm install @hippodid/sdk ai @ai-sdk/anthropic
 */

import { HippoDid } from "@hippodid/sdk";
// import { anthropic } from "@ai-sdk/anthropic";
// import { streamText } from "ai";

// Initialize the HippoDid client
const hd = new HippoDid({
  apiKey: process.env.HIPPODID_API_KEY!,
  baseUrl: process.env.HIPPODID_BASE_URL ?? "https://api.hippodid.com",
});

// The character ID for this agent's memory namespace
const CHARACTER_ID = process.env.HIPPODID_CHARACTER_ID!;

/**
 * Example: Vercel Edge API route handler
 *
 * export async function POST(req: Request) {
 *   const { messages } = await req.json();
 *   const lastMessage = messages[messages.length - 1].content;
 *
 *   // Assemble context from character memory
 *   const ctx = await hd.assembleContext(CHARACTER_ID, lastMessage, {
 *     strategy: "conversational",
 *     topK: 15,
 *   });
 *
 *   // Stream response with Vercel AI SDK
 *   const result = streamText({
 *     model: anthropic("claude-sonnet-4-20250514"),
 *     system: ctx.formattedPrompt,
 *     messages,
 *   });
 *
 *   // Store the conversation as a new memory (fire-and-forget)
 *   hd.addMemory(CHARACTER_ID, {
 *     content: `User asked: ${lastMessage}`,
 *   }).catch(console.error);
 *
 *   return result.toDataStreamResponse();
 * }
 */

// Demo: standalone usage
async function main() {
  console.log("=== HippoDid + Vercel AI SDK Demo ===\n");

  // 1. Create or resolve a character
  let character;
  try {
    character = await hd.getCharacterByExternalId("vercel-demo-agent");
    console.log(`Found existing character: ${character.name} (${character.id})`);
  } catch {
    character = await hd.createCharacter({
      name: "Vercel Demo Agent",
      description: "A demo agent with persistent memory",
    });
    console.log(`Created character: ${character.name} (${character.id})`);
  }

  // 2. Add some memories
  await hd.addMemory(character.id, {
    content: "The user is building a Next.js app with the Vercel AI SDK. They prefer TypeScript and use Tailwind CSS for styling.",
  });
  console.log("Added memory about user's tech stack");

  // 3. Search memories
  const results = await hd.searchMemories(character.id, {
    query: "What tech stack does the user prefer?",
    topK: 5,
  });
  console.log(`\nSearch results (${results.length} found):`);
  for (const r of results) {
    console.log(`  [${r.category}] ${r.content} (score=${r.score.toFixed(2)})`);
  }

  // 4. Assemble context for an LLM call
  const ctx = await hd.assembleContext(character.id, "Help me set up a new API route", {
    strategy: "conversational",
    topK: 10,
  });

  console.log(`\n=== Assembled Context (${ctx.strategy}) ===`);
  console.log(`Token estimate: ~${ctx.tokenEstimate}`);
  console.log(`Memories included: ${ctx.memories.length}`);
  console.log(`\nFormatted prompt preview (first 500 chars):`);
  console.log(ctx.formattedPrompt.slice(0, 500));
}

main().catch(console.error);
