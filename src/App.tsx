import { type FormEvent, useState, useEffect } from "react";
import './index.css'
import { sendQuestion, generateUUID, type ChunkData, getProviders, type Provider } from "./utils.ts";
import Markdown from "markdown-to-jsx";
import { Prompts } from "./Prompts.tsx";
import TokenCounter from "./components/TokenCounter.tsx"; // Import the TokenCounter component

type Prompt = {
  id: number;
  question: string;
};

type QAItem = { id: string; question: string; answer: string; loading: boolean; expertPromptId?: number; elapsedTime: number };

function App() {

  const [question, setQuestion] = useState("")
  const [history, setHistory] = useState<QAItem[]>([]);
  // Keep a persistent threadId for the current chat session
  const [threadId, setThreadId] = useState<string>(() => generateUUID());
  const [showPrompts, setShowPrompts] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [inputCost, setInputCost] = useState(0);
  const [outputCost, setOutputCost] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  // State for the active timer
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);

  useEffect(() => {
    let interval: number | undefined;
    if (activeTimerId) {
      interval = setInterval(() => {
        setHistory(prev =>
          prev.map(item =>
            item.id === activeTimerId ? { ...item, elapsedTime: item.elapsedTime + 1 } : item
          )
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimerId]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const providersData = await getProviders();
        setProviders(providersData);
        if (providersData.length > 0) {
          setSelectedProvider(providersData[0].provider);
          setSelectedModel(providersData[0].models[0]);
        }
      } catch (error) {
        console.error("Failed to fetch providers:", error);
      }
    };

    fetchProviders();
  }, []);

  const handleChunk = (id: string, chunk: ChunkData) => {
    // Start timer on first chunk
    if (activeTimerId !== id) {
      setActiveTimerId(id);
    }

    if (chunk.node === 'enhancer') {
      setStatusMessage('enhancing prompt...');
    } else if (chunk.node === 'ai' && chunk.content === 'generating') {
      setStatusMessage('generating...');
    } else if (chunk.node === 'model_request') {
      setStatusMessage('');
      setHistory(prev => prev.map(item =>
        item.id === id ? {...item, answer: item.answer + chunk.content} : item
      ));
    } else if (chunk.type === 'done' && chunk.node === 'system') { // Check for the 'done' system message
      // Stop timer
      setActiveTimerId(null);
      try {
        const content = JSON.parse(chunk.content);
        if (content.tokenUsage && content.cost) {
          setInputTokens(prev => prev + content.tokenUsage.inputTokens);
          setOutputTokens(prev => prev + content.tokenUsage.outputTokens);
          setTotalTokens(prev => prev + content.tokenUsage.totalTokens);
          setInputCost(prev => prev + content.cost.inputCost);
          setOutputCost(prev => prev + content.cost.outputCost);
          setTotalCost(prev => prev + content.cost.totalCost);
        }
      } catch (e) {
        console.error("Failed to parse token usage JSON:", e);
      }
    } else {
      // Default handling for other content chunks
      setHistory(prev => prev.map(item =>
        item.id === id ? {...item, answer: item.answer + chunk.content} : item
      ));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim()) return;

    const id = generateUUID();

    // Add a new QA item for this question
    setHistory(prev => [
      ...prev,
      {id, question, answer: "", loading: true, elapsedTime: 0}
    ]);

    // Clear input for next question
    setQuestion("");

    await sendQuestion(
      {
        message: question,
        threadId: `user-${threadId}`,
        swap: isEnhanced,
        provider: selectedProvider,
        model: selectedModel,
      },
      (chunk: ChunkData) => handleChunk(id, chunk)
    );

    // Mark this QA item as completed
    setHistory(prev => prev.map(item =>
      item.id === id ? {...item, loading: false} : item
    ));

    // Reset enhance toggle after first question
    if (isEnhanced) {
      setIsEnhanced(false);
    }
  };

  const handlePromptSubmit = async (prompt: Prompt) => {
    const id = generateUUID();

    // Add a new QA item for this question
    setHistory(prev => [
      ...prev,
      {id, question: prompt.question, answer: "", loading: true, expertPromptId: prompt.id, elapsedTime: 0}
    ]);

    await sendQuestion(
      {
        expertPromptId: prompt.id,
        threadId: `user-${threadId}`,
        provider: selectedProvider,
        model: selectedModel,
      },
      (chunk: ChunkData) => handleChunk(id, chunk)
    );

    // Mark this QA item as completed
    setHistory(prev => prev.map(item =>
      item.id === id ? {...item, loading: false} : item
    ));
  };

  const startNewChat = () => {
    // Reset history and generate a new threadId
    setHistory([]);
    setThreadId(generateUUID());
    setIsEnhanced(false); // Reset enhance toggle
    // Reset token counts
    setInputTokens(0);
    setOutputTokens(0);
    setTotalTokens(0);
    setInputCost(0);
    setOutputCost(0);
    setTotalCost(0);
    // Stop any active timer
    setActiveTimerId(null);
  };

  const handlePromptClick = (prompt: Prompt) => {
    handlePromptSubmit(prompt);
    setShowPrompts(false);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    setSelectedProvider(provider);
    const providerData = providers.find(p => p.provider === provider);
    if (providerData) {
      setSelectedModel(providerData.models[0]);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <h1>What’s on your mind today?</h1>
      <div className="header">
        <div className="left-controls">
          {/* Token Counter positioned to the left */}
          <TokenCounter
            inputTokens={inputTokens}
            outputTokens={outputTokens}
            totalTokens={totalTokens}
            inputCost={inputCost}
            outputCost={outputCost}
            totalCost={totalCost}
          />

          {/* Dropdowns moved to the left, styled with Tailwind */}
          <div className="dropdown-container">
            <select value={selectedProvider} onChange={handleProviderChange} className="dropdown-select">
              {providers.map(p => (
                <option key={p.provider} value={p.provider}>{p.provider}</option>
              ))}
            </select>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="dropdown-select">
              {providers.find(p => p.provider === selectedProvider)?.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e)} className='form'>
          <input
            type="text"
            name="message"
            placeholder="Ask anything..."
            className="chat-input"
            onChange={(e) => setQuestion(e.target.value)}
            value={question}
          />
          <button
            type="button"
            className={`enhance-btn ${isEnhanced ? 'active' : ''}`}
            onClick={() => setIsEnhanced(!isEnhanced)}
            disabled={history.length > 0}
            title="Enhance your prompt with AI"
          >
            Enhance
          </button>
        </form>
        <button type="button" className="new-chat-btn" onClick={startNewChat} title="Start a new chat">
          New Chat
        </button>
        <button type="button" className="new-chat-btn" onClick={() => setShowPrompts(!showPrompts)} title="Show prompts">
          {showPrompts ? 'Hide expert Prompts' : 'Show expert Prompts'}
        </button>
      </div>

      {showPrompts && <Prompts onPromptClick={handlePromptClick} />}

      <div className="answer-box">
        {history.length === 0 ? (
          <></>
        ) : (
          history.map(item => (
            <div key={item.id} className="qa-item">
              <div className="user-question-container">
                <p className='user-question-box'><strong>You:</strong> {item.question}</p>
                {(item.elapsedTime > 0 || item.loading) && (
                  <div className="timer-box">
                    {formatTime(item.elapsedTime)}
                  </div>
                )}
              </div>
              {statusMessage && <p className="italic text-gray-400">{statusMessage}</p>}
              {item.answer ? (
                <div className="assistant-row">
                  <div className="assistant-avatar" aria-hidden>
                    {/* Simple inline bot logo */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="8" width="18" height="10" rx="3" fill="#3B82F6"/>
                      <circle cx="9" cy="13" r="1.5" fill="white"/>
                      <circle cx="15" cy="13" r="1.5" fill="white"/>
                      <rect x="10" y="3" width="4" height="4" rx="2" fill="#60A5FA"/>
                    </svg>
                  </div>
                  <div className="assistant-answer markdown-body">
                    <Markdown
                      options={{forceBlock: true, wrapper: "article"}}
                      className="markdown-body"
                    >
                      {item.answer}
                    </Markdown>
                  </div>
                </div>
              ) : (
                item.loading && !statusMessage && <p className="italic text-gray-400">Generating answer...</p>
              )}
            </div>
          ))
        )}
      </div>

    </>
  )
}

export default App