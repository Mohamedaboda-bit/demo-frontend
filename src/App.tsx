import { type FormEvent, useState } from "react";
import './index.css'
import { sendQuestion, generateUUID } from "./utils.ts";
import Markdown from "markdown-to-jsx";
// import "github-markdown-css";

function App() {

  const [question, setQuestion] = useState("")
  type QAItem = { id: string; question: string; answer: string; loading: boolean };
  const [history, setHistory] = useState<QAItem[]>([]);
  // Keep a persistent threadId for the current chat session
  const [threadId, setThreadId] = useState<string>(() => generateUUID());

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
      },
      (chunk) => {
        // Append streamed chunks to the matching QA item
        setHistory(prev => prev.map(item =>
          item.id === id ? {...item, answer: item.answer + chunk} : item
        ));
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
        </form>
        <button type="button" className="new-chat-btn" onClick={startNewChat} title="Start a new chat">
          New Chat
        </button>
      </div>

      <div className="answer-box">
        {history.length === 0 ? (
          <></>
        ) : (
          history.map(item => (
            <div key={item.id} className="qa-item">
              <p className='user-question-box'><strong>You:</strong> {item.question}</p>
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
                item.loading && <p className="italic text-gray-400">Generating answer...</p>
              )}
            </div>
          ))
        )}
      </div>

    </>
  )
}

export default App
