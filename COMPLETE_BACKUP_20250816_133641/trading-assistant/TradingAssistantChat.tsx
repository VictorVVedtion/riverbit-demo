import React from 'react';
import ProfessionalAIChat from './ProfessionalAIChat';

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
  // Pass all props to the professional AI chat component for context-aware responses
  return (
    <ProfessionalAIChat 
      {...props}
      className={`professional-ai-chat-enhanced ${props.className || ''}`}
    />
  );
};

export default TradingAssistantChat;