import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Calls OpenAI with minimal retry logic (only for rate limits)
 * Errors from OpenAI API are not retried to avoid token waste
 */
export async function callOpenAIWithRetry(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    maxTokens?: number;
    temperature?: number;
    maxRetries?: number;
  } = {}
): Promise<string> {
  // Default to 1 retry (only for rate limits) - can be overridden via env var
  const defaultMaxRetries = parseInt(process.env.OPENAI_MAX_RETRIES || '1', 10);
  const maxRetries = options.maxRetries ?? defaultMaxRetries;
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

  // Calculate approximate input tokens (rough estimate: 4 chars per token)
  const inputText = messages
    .map((m) =>
      typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    )
    .join(' ');
  const estimatedInputTokens = Math.ceil(inputText.length / 4);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const completion = await openai.chat.completions.create({
        model,
        messages,
        response_format: { type: 'json_object' },
        max_completion_tokens: options.maxTokens ?? 8000,
      });

      const duration = Date.now() - startTime;
      const finishReason = completion.choices[0]?.finish_reason;
      const content = completion.choices[0]?.message?.content;

      // Track token usage
      const usage = completion.usage;
      if (usage) {
        console.log(
          `[OpenAI] Token usage - Input: ${usage.prompt_tokens}, Output: ${usage.completion_tokens}, Total: ${usage.total_tokens} (${duration}ms)`
        );
      } else {
        console.log(
          `[OpenAI] Estimated input tokens: ~${estimatedInputTokens} (usage not available)`
        );
      }

      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Warn if response was truncated
      if (finishReason === 'length') {
        console.warn(
          `⚠️  Response was truncated (length finish reason). Content length: ${content.length}`
        );
        // Still return the content - our repair logic will try to fix it
      }

      return content;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      // Log the error with token context
      if (error instanceof Error) {
        console.error(
          `[OpenAI] API Error (attempt ${attempt + 1}/${maxRetries}):`,
          {
            error: error.message,
            estimatedInputTokens,
            isLastAttempt,
          }
        );
      }

      // Only retry on rate limit errors (not API errors, authentication errors, etc.)
      if (error instanceof Error) {
        const httpStatus =
          'status' in error &&
          typeof (error as { status?: unknown }).status === 'number'
            ? (error as { status: number }).status
            : undefined;
        const isRateLimit =
          error.message.toLowerCase().includes('rate limit') ||
          error.message.toLowerCase().includes('rate_limit') ||
          httpStatus === 429; // HTTP 429 Too Many Requests

        if (isRateLimit && !isLastAttempt) {
          const delay = 2 ** attempt * 1000; // Exponential backoff: 1s, 2s, 4s...
          console.warn(
            `[OpenAI] Rate limit hit. Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // For all other errors (API errors, invalid requests, etc.), fail immediately
      // Don't retry to avoid wasting tokens
      throw error;
    }
  }

  throw new Error('Failed to get response from OpenAI after retries');
}
