type QuestionData = {
  message: string,
  threadId: string,
}

/**
 * Generates a UUID v4. Uses crypto.randomUUID() if available (modern browsers),
 * otherwise falls back to a manual UUID v4 generation using crypto.getRandomValues().
 */
export function generateUUID(): string {
  // Use crypto.randomUUID() if available (Chrome 92+, Firefox 95+, Safari 15.4+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: Generate UUID v4 manually using crypto.getRandomValues()
  // This is supported in all modern browsers (IE11+, Chrome, Firefox, Safari, Edge)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Last resort fallback (should never happen in modern browsers)
  // Using Math.random() which is not cryptographically secure but will work
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const sendQuestion = async (
  params: QuestionData,
  onChunk?: (chunk: string) => void
) => {
  try {
    const response = await fetch('http://localhost:3000/agent/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if the response has a body (for streams)
    if (!response.body) {
      throw new Error('ReadableStream not supported or empty response body.');
    }

    // Create a reader to read streamed chunks
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });

        // Split into lines and handle lines starting with "data: "
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const jsonString = line.replace('data: ', '').trim();

          if (!jsonString || jsonString === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonString);
            if (data.content && onChunk) {
              onChunk(data.content);
            }
          } catch {
            // Sometimes the chunk might be incomplete JSON, skip safely
          }
        }
      }
    }

    return true; // Indicate stream finished
  } catch (error) {
    console.error('Streaming error:', error);
    throw error;
  }
};
