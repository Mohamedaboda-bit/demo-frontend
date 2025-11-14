import { type FormEvent, useState } from "react";
import './index.css'
import { sendQuestion, generateUUID, type ChunkData } from "./utils.ts";
import Markdown from "markdown-to-jsx";
import { Prompts } from "./Prompts.tsx";

function App() {

  const [question, setQuestion] = useState("")
  type QAItem = { id: string; question: string; answer: string; loading: boolean; expertPromptId?: number };
  const [history, setHistory] = useState<QAItem[]>([]);
  // Keep a persistent threadId for the current chat session
  const [threadId, setThreadId] = useState<string>(() => generateUUID());
  const [showPrompts, setShowPrompts] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim()) return;

    const id = generateUUID();

    // Add a new QA item for this question
    setHistory(prev => [
      ...prev,
      {id, question, answer: "", loading: true}
    ]);

    // Clear input for next question
    setQuestion("");

    await sendQuestion(
      {
        message: question,
        // Use the same threadId for all questions in the current chat
        threadId: `user-${threadId}`,
        swap: isEnhanced,
      },
      (chunk: ChunkData) => {
        if (chunk.node === 'enhancer') {
          setStatusMessage('enhancing prompt...');
        } else if (chunk.node === 'ai' && chunk.content === 'generating') {
          setStatusMessage('generating...');
        } else if (chunk.node === 'model_request') {
          setStatusMessage('');
          setHistory(prev => prev.map(item =>
            item.id === id ? {...item, answer: item.answer + chunk.content} : item
          ));
        } else {
          setHistory(prev => prev.map(item =>
            item.id === id ? {...item, answer: item.answer + chunk.content} : item
          ));
        }
      }
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

  const handlePromptSubmit = async (expertPromptId: number) => {
    const id = generateUUID();

    // Add a new QA item for this question
    setHistory(prev => [
      ...prev,
      {id, question: `Expert Prompt #${expertPromptId}`, answer: "", loading: true, expertPromptId}
    ]);

    await sendQuestion(
      {
        expertPromptId,
        // Use the same threadId for all questions in the current chat
        threadId: `user-${threadId}`,
      },
      (chunk: ChunkData) => {
        if (chunk.node === 'ai' && chunk.content === 'generating') {
          setStatusMessage('generating...');
        } else if (chunk.node === 'model_request') {
          setStatusMessage('');
          setHistory(prev => prev.map(item =>
            item.id === id ? {...item, answer: item.answer + chunk.content} : item
          ));
        } else {
          setHistory(prev => prev.map(item =>
            item.id === id ? {...item, answer: item.answer + chunk.content} : item
          ));
        }
      }
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
  };

  const handlePromptClick = (id: number) => {
    handlePromptSubmit(id);
    setShowPrompts(false);
  };

  return (
    <>
      <h1>What’s on your mind today?</h1>
      <div className="header">
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
              <p className='user-question-box'><strong>You:</strong> {item.question}</p>
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
