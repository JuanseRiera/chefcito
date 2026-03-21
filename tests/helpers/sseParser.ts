export interface ParsedSSEEvent {
  event: string;
  data: unknown;
}

export async function consumeSSEStream(
  stream: ReadableStream<Uint8Array>,
): Promise<ParsedSSEEvent[]> {
  const events: ParsedSSEEvent[] = [];
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const lines = part.trim().split('\n');
        let eventType = 'message';
        let dataLine = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataLine = line.slice(6).trim();
          }
        }

        if (dataLine) {
          try {
            events.push({ event: eventType, data: JSON.parse(dataLine) });
          } catch {
            events.push({ event: eventType, data: dataLine });
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return events;
}
