import React from 'react';
import CompactProfessionalAI from './CompactProfessionalAI';

interface TradingAssistantChatProps {
  userAddress?: string;
  isConnected?: boolean;
  accountBalance?: number;
  className?: string;
  selectedTradingPair?: string;
  currentPrice?: number;
  onPlanExecute?: (plan: any) => Promise<void>;
  onPlanBookmark?: (planId: string) => void;
  onPlanShare?: (plan: any) => void;
}

const TradingAssistantChat: React.FC<TradingAssistantChatProps> = (props) => {
  // Use the compact AI chat designed specifically for the right trading panel
  return (
    <CompactProfessionalAI 
      {...props}
      className={`compact-ai-trading-panel ${props.className || ''}`}
    />
  );
};

export default TradingAssistantChat;