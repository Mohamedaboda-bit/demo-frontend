type QuestionData = {
  message: string,
  threadId: string,
}

export const sendQuestion = async (
  params: QuestionData,
  onChunk?: (chunk: string) => void
) => {
  try {
    const response = await fetch('/agent/stream', {
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
