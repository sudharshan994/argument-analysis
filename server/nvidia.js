/**
 * NVIDIA AI integration.
 * Uses the OpenAI-compatible NVIDIA NIM endpoint for classification and grouping.
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const MODEL = 'meta/llama-3.3-70b-instruct';
const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
  timeout: 30000,
});

async function callNvidia(prompt, maxRetries = 3) {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error('Missing NVIDIA_API_KEY. Add it to your .env file.');
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`   Using NVIDIA ${MODEL} (attempt ${attempt + 1})...`);
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.15,
        max_tokens: 4000,
      });

      return response.choices[0].message.content.trim();
    } catch (err) {
      if (err.status === 429) {
        const waitTime = Math.pow(2, attempt + 1) * 3;
        console.log(`   Rate limited, waiting ${waitTime}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      } else {
        throw err;
      }
    }
  }

  throw new Error('NVIDIA API rate limit exceeded. Please wait a moment and try again.');
}

function parseJSON(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstArray = cleaned.indexOf('[');
  const lastArray = cleaned.lastIndexOf(']');
  const firstObject = cleaned.indexOf('{');
  const lastObject = cleaned.lastIndexOf('}');

  if (firstArray !== -1 && lastArray > firstArray) {
    return JSON.parse(cleaned.slice(firstArray, lastArray + 1));
  }

  if (firstObject !== -1 && lastObject > firstObject) {
    return JSON.parse(cleaned.slice(firstObject, lastObject + 1));
  }

  return JSON.parse(cleaned);
}

export async function extractPropositions(comments) {
  const input = comments
    .map(comment => `[${comment.id}] ${comment.author}: ${comment.text}`)
    .join('\n');

  const prompt = `You are analyzing an online debate thread.

For each comment below, return a JSON array where each item has:
- "id": the comment id number from brackets
- "intent": one of: "claim", "counter-claim", "agreement", "question", "tangent", "insult"
- "proposition": one clean sentence summarizing the logical point being made, or null for pure insult/tangent
- "targets": array of prior comment ids this comment clearly responds to

Rules:
- Preserve each numeric id exactly.
- Never target a future comment.
- Only add targets when the reply relationship is clear from wording or sequence.
- "claim" states a position or argument.
- "counter-claim" directly disputes another comment.
- "agreement" supports or echoes another position.
- "question" asks for clarification or challenges with a question.
- "tangent" is off-topic.
- "insult" is a personal attack with no logical content.

Comments:
${input}

Return only valid JSON.`;

  const text = await callNvidia(prompt);

  try {
    return normalizeAnnotated(parseJSON(text), comments.length);
  } catch (err) {
    console.error('Failed to parse NVIDIA response:', text);
    throw new Error('NVIDIA returned invalid JSON for intent classification', { cause: err });
  }
}

export async function deduplicatePropositions(annotated) {
  const props = annotated
    .filter(comment => comment.proposition)
    .map(comment => `[${comment.id}] ${comment.proposition}`)
    .join('\n');

  if (!props.trim()) return [];

  const prompt = `Below is a list of propositions from a debate, each tagged with a comment id.
Group propositions that make the same logical claim, even when worded differently.
Keep different claims in separate groups.

Return a JSON array of groups. Each group must have:
- "canonical": one clean, neutral sentence summarizing this claim
- "comment_ids": array of comment ids that make this claim

Propositions:
${props}

Return only valid JSON.`;

  const text = await callNvidia(prompt);

  try {
    return normalizeDeduplicated(parseJSON(text));
  } catch (err) {
    console.error('Failed to parse NVIDIA dedup response:', text);
    throw new Error('NVIDIA returned invalid JSON for deduplication', { cause: err });
  }
}

function normalizeAnnotated(items, commentCount) {
  if (!Array.isArray(items)) {
    throw new Error('NVIDIA returned a non-array classification result');
  }

  const allowedIntents = new Set(['claim', 'counter-claim', 'agreement', 'question', 'tangent', 'insult']);

  return items
    .filter(item => Number.isInteger(Number(item.id)) && Number(item.id) >= 0 && Number(item.id) < commentCount)
    .map(item => {
      const id = Number(item.id);
      return {
        id,
        intent: allowedIntents.has(item.intent) ? item.intent : 'claim',
        proposition: typeof item.proposition === 'string' && item.proposition.trim()
          ? item.proposition.trim()
          : null,
        targets: Array.isArray(item.targets)
          ? [...new Set(item.targets.map(Number))]
            .filter(target => Number.isInteger(target) && target >= 0 && target < id)
          : [],
      };
    });
}

function normalizeDeduplicated(groups) {
  if (!Array.isArray(groups)) {
    throw new Error('NVIDIA returned a non-array deduplication result');
  }

  return groups
    .filter(group => typeof group.canonical === 'string' && Array.isArray(group.comment_ids))
    .map(group => ({
      canonical: group.canonical.trim(),
      comment_ids: [...new Set(group.comment_ids.map(Number))]
        .filter(id => Number.isInteger(id) && id >= 0),
    }))
    .filter(group => group.canonical && group.comment_ids.length);
}
