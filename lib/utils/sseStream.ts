import type { RecipeSSEEvent } from '../types/sse';

/**
 * Helper to format data into the SSE wire format (event: ..., data: ...).
 */
function formatSSE(event: RecipeSSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Creates a ReadableStream for Server-Sent Events.
 * Provides an 'enqueue' function to send typed events
 * and handles closing the stream.
 */
export function createSSEStream() {
  let controller: ReadableStreamDefaultController | undefined;

  const stream = new ReadableStream({
    start(ctr) {
      controller = ctr;
    },
    cancel() {
      controller = undefined;
    },
  });

  const encoder = new TextEncoder();

  /**
   * Encodes and enqueues a typed SSE event into the stream.
   */
  const enqueue = (event: RecipeSSEEvent) => {
    if (controller) {
      controller.enqueue(encoder.encode(formatSSE(event)));
    }
  };

  /**
   * Closes the SSE stream.
   */
  const close = () => {
    if (controller) {
      controller.close();
      controller = undefined;
    }
  };

  return { stream, enqueue, close };
}
