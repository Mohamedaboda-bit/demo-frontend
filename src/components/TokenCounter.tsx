import React from 'react';

interface TokenCounterProps {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

const TokenCounter: React.FC<TokenCounterProps> = ({
  inputTokens,
  outputTokens,
  totalTokens,
  inputCost,
  outputCost,
  totalCost,
}) => {
  return (
    <div className="token-counter-details">
      <div className="token-section">
        <span className="token-label">Input:</span>
        <span className="token-value">{inputTokens}</span>
        <span className="cost-value">(${inputCost.toFixed(6)})</span>
      </div>
      <div className="token-section">
        <span className="token-label">Output:</span>
        <span className="token-value">{outputTokens}</span>
        <span className="cost-value">(${outputCost.toFixed(6)})</span>
      </div>
      <div className="token-section total">
        <span className="token-label">Total:</span>
        <span className="token-value">{totalTokens}</span>
        <span className="cost-value">(${totalCost.toFixed(6)})</span>
      </div>
    </div>
  );
};

export default TokenCounter;