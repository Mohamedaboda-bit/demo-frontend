import React, { useState, useEffect } from 'react';

interface TokenCounterProps {
  totalTokens: number;
}

const TokenCounter: React.FC<TokenCounterProps> = ({ totalTokens }) => {
  const [displayTotal, setDisplayTotal] = useState(totalTokens);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Only animate if the value has actually changed
    if (totalTokens !== displayTotal) {
      setIsAnimating(true);
      
      // Update displayed value with a slight delay to allow animation to start
      const updateTimer = setTimeout(() => {
        setDisplayTotal(totalTokens);
      }, 50); // Small delay for smooth transition

      // Reset animation state after it plays
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500); // Animation duration should match CSS transition

      return () => {
        clearTimeout(timer);
        clearTimeout(updateTimer);
      };
    }
  }, [totalTokens, displayTotal]);

  return (
    <div className={`token-counter ${isAnimating ? 'animate' : ''}`}>
      <div className="token-label-multiline">
        <span>Token</span>
        <span>Usage</span>
      </div>
      <div className="token-value-large animate-number">
        {displayTotal}
      </div>
    </div>
  );
};

export default TokenCounter;