
import { useEffect, useState } from 'react';

type Prompt = {
  id: number;
  question: string;
};

type PromptsProps = {
  onPromptClick: (id: number) => void;
};

export function Prompts({ onPromptClick }: PromptsProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrompts() {
      try {
        const response = await fetch('http://localhost:3001/prompts');
        if (!response.ok) {
          throw new Error('Failed to fetch prompts');
        }
        const data = await response.json();
        // Assuming the backend now returns 'question' instead of 'text'
        // If it still returns 'text', we would map it here:
        // const mappedData = data.map((item: any) => ({ id: item.id, question: item.text }));
        setPrompts(data);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPrompts();
  }, []);

  if (loading) {
    return <div>Loading prompts...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="prompts-container">
      <h2>Expert Prompts</h2>
      <div className="prompts-grid">
        {prompts.length > 0 ? (
          prompts.map((prompt) => (
            <div key={prompt.id} className="prompt-card" onClick={() => onPromptClick(prompt.id)}>
              {prompt.question.length > 60 ? prompt.question.substring(0, 60) + '...' : prompt.question}
            </div>
          ))
        ) : (
          <p>No prompts available.</p>
        )}
      </div>
    </div>
  );
}
