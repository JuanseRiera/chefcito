import { describe, it, expect } from 'vitest';
import { createSSEStream } from '@/lib/utils/sseStream';
import type { RecipeSSEEvent } from '@/lib/types/sse';

async function drainStream(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  return result;
}

describe('createSSEStream', () => {
  it('formats a progress event into SSE wire format', async () => {
    const { stream, enqueue, close } = createSSEStream();
    enqueue({
      event: 'progress',
      data: { stage: 'fetching', message: 'Loading...' },
    });
    close();

    const output = await drainStream(stream);
    expect(output).toBe(
      'event: progress\ndata: {"stage":"fetching","message":"Loading..."}\n\n',
    );
  });

  it('formats an error event into SSE wire format', async () => {
    const { stream, enqueue, close } = createSSEStream();
    enqueue({
      event: 'error',
      data: { code: 'INTERNAL_ERROR', message: 'Something failed' },
    });
    close();

    const output = await drainStream(stream);
    expect(output).toBe(
      'event: error\ndata: {"code":"INTERNAL_ERROR","message":"Something failed"}\n\n',
    );
  });

  it('formats a result event with nested data correctly', async () => {
    const { stream, enqueue, close } = createSSEStream();
    const recipe = { id: 'cuid1', title: 'Cake' };
    enqueue({
      event: 'result',
      data: { recipe } as RecipeSSEEvent['data'],
    } as RecipeSSEEvent);
    close();

    const output = await drainStream(stream);
    expect(output).toContain('event: result\n');
    expect(output).toContain(JSON.stringify({ recipe }));
  });

  it('enqueues multiple events separated by double newlines', async () => {
    const { stream, enqueue, close } = createSSEStream();
    enqueue({
      event: 'progress',
      data: { stage: 'fetching', message: 'A' },
    });
    enqueue({
      event: 'progress',
      data: { stage: 'extracting', message: 'B' },
    });
    close();

    const output = await drainStream(stream);
    const events = output.split('\n\n').filter(Boolean);
    expect(events).toHaveLength(2);
  });

  it('does not throw when enqueue is called after close', () => {
    const { enqueue, close } = createSSEStream();
    close();
    expect(() =>
      enqueue({
        event: 'error',
        data: { code: 'INTERNAL_ERROR', message: 'late' },
      }),
    ).not.toThrow();
  });
});
