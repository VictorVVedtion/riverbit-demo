import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import TradingExecutionButton from './TradingExecutionButton';
import ExecutionStatusMonitor from './ExecutionStatusMonitor';
import { 
  TradingPlan,
  executionEngine,
  useTradingExecution 
} from '../utils/tradingAssistant';
import { formatNumber } from '../utils/web3Utils';
import { 
  MOCK_DATA_GENERATOR,
  RISK_LEVEL_CALCULATOR,
  AI_TRADING_CONFIG,
  AITradingAction
} from '../constants/aiTradingConstants';
import { 
  Bot, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  Clock,
  Target,
  DollarSign,
  Zap,
  Send,
  Sparkles
} from 'lucide-react';

interface TradingAssistantWithExecutionProps {
  userAddress: string;
  isConnected: boolean;
  className?: string;
}

// Mock AI-generated trading plans for demonstration
const generateMockTradingPlan = (query: string): TradingPlan => {
  const randomSymbol = MOCK_DATA_GENERATOR.generateRandomSymbol();
  const randomAction = MOCK_DATA_GENERATOR.generateRandomAction();
  const randomLeverage = MOCK_DATA_GENERATOR.generateRandomLeverage();
  const randomTimeframe = MOCK_DATA_GENERATOR.generateRandomTimeframe();
  
  const baseSize = MOCK_DATA_GENERATOR.generateRandomTradeSize();
  const confidence = MOCK_DATA_GENERATOR.generateRandomConfidence();
  const entryPrice = MOCK_DATA_GENERATOR.generateRandomPrice();
  const stopLoss = MOCK_DATA_GENERATOR.generateRandomStopLoss();
  const takeProfit = MOCK_DATA_GENERATOR.generateRandomTakeProfit();
  
  return {
    id: executionEngine.generatePlanId(),
    symbol: randomSymbol,
    action: randomAction,
    size: baseSize,
    leverage: randomLeverage,
    entryPrice,
    stopLoss,
    takeProfit,
    reasoning: MOCK_DATA_GENERATOR.generateRandomReasoning(randomAction, randomTimeframe),
    confidence,
    timeframe: randomTimeframe,
    metadata: {
      query,
      generatedAt: new Date().toISOString(),
      riskLevel: RISK_LEVEL_CALCULATOR.getRiskLevel(confidence)
    }
  };
};

const TradingAssistantWithExecution: React.FC<TradingAssistantWithExecutionProps> = ({
  userAddress,
  isConnected,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tradingPlans, setTradingPlans] = useState<TradingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TradingPlan | null>(null);
  
  const { executionHistory } = useTradingExecution();

  // Mock AI analysis function
  const analyzeQuery = async (userQuery: string): Promise<void> => {
    setIsAnalyzing(true);
    
    try {
      // Simulate AI processing time using configured range
      const processingDelay = MOCK_DATA_GENERATOR.generateProcessingDelay();
      await new Promise(resolve => setTimeout(resolve, processingDelay));
      
      // Generate random number of trading plans
      const numPlans = MOCK_DATA_GENERATOR.generatePlanCount();
      const newPlans: TradingPlan[] = [];
      
      for (let i = 0; i < numPlans; i++) {
        newPlans.push(generateMockTradingPlan(userQuery));
      }
      
      setTradingPlans(prev => [...newPlans, ...prev.slice(0, 5)]); // Keep last 5 sets
      setQuery('');
    } catch (error) {
      console.error('Error analyzing query:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isAnalyzing) {
      analyzeQuery(query.trim());
    }
  };

  const getActionIcon = (action: AITradingAction): JSX.Element => {
    const iconClass = AI_TRADING_CONFIG.UI.ICON_SIZES.SMALL;
    
    switch (action) {
      case 'long':
      case 'buy':
        return <TrendingUp className={`${iconClass} text-green-500`} />;
      case 'short':
      case 'sell':
        return <TrendingDown className={`${iconClass} text-red-500`} />;
      default:
        return <Target className={iconClass} />;
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    return RISK_LEVEL_CALCULATOR.getConfidenceColor(confidence);
  };

  const sampleQueries = AI_TRADING_CONFIG.SUGGESTION_QUERIES;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Chat Interface */}
      <Card className={AI_TRADING_CONFIG.UI.CARD_STYLES.MAIN}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className={`${AI_TRADING_CONFIG.UI.ICON_SIZES.MEDIUM} text-blue-400`} />
            AI Trading Assistant
          </CardTitle>
          <CardDescription>
            Ask me about trading opportunities and I'll generate executable plans
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me about trading opportunities..."
              disabled={isAnalyzing}
              className={AI_TRADING_CONFIG.UI.CARD_STYLES.INPUT}
            />
            <Button 
              type="submit" 
              disabled={!query.trim() || isAnalyzing}
              className={AI_TRADING_CONFIG.UI.BUTTON_STYLES.PRIMARY}
            >
              {isAnalyzing ? (
                <>
                  <Bot className={`${AI_TRADING_CONFIG.UI.ICON_SIZES.SMALL} animate-pulse mr-2`} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className={`${AI_TRADING_CONFIG.UI.ICON_SIZES.SMALL} mr-2`} />
                  Ask
                </>
              )}
            </Button>
          </form>

          {/* Sample queries */}
          {tradingPlans.length === 0 && !isAnalyzing && (
            <div className="space-y-2">
              <p className="text-sm text-gray-300 font-medium">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {sampleQueries.map((sample, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    onClick={() => setQuery(sample)}
                    className={AI_TRADING_CONFIG.UI.BUTTON_STYLES.SUGGESTION}
                  >
                    {sample}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Loading */}
          {isAnalyzing && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Bot className="h-8 w-8 animate-pulse mx-auto mb-2 text-blue-400" />
                <p className="text-sm text-gray-300">AI is analyzing market conditions...</p>
                <p className="text-xs text-gray-300 font-medium mt-1">This may take a few seconds</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Trading Plans */}
      {tradingPlans.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-400" />
              AI-Generated Trading Plans
            </CardTitle>
            <CardDescription>
              Review and execute the AI's trading recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tradingPlans.slice(0, 3).map((plan, index) => (
              <div key={plan.id} className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getActionIcon(plan.action)}
                    <span className="font-semibold">
                      {plan.symbol} {plan.action.toUpperCase()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {plan.leverage}x
                    </Badge>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getConfidenceColor(plan.confidence)}`}
                  >
                    {plan.confidence}% confidence
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                  <div>
                    <span className="text-gray-300 font-medium">Size:</span>
                    <span className="ml-1 font-medium">${formatNumber(plan.size)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300 font-medium">Entry:</span>
                    <span className="ml-1 font-medium">${formatNumber(plan.entryPrice || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300 font-medium">Take Profit:</span>
                    <span className="ml-1 font-medium text-green-400">${formatNumber(plan.takeProfit || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300 font-medium">Stop Loss:</span>
                    <span className="ml-1 font-medium text-red-400">${formatNumber(plan.stopLoss || 0)}</span>
                  </div>
                </div>

                {plan.reasoning && (
                  <div className="bg-blue-900/20 rounded p-3 mb-3 border border-blue-800/30">
                    <p className="text-sm text-blue-200 leading-relaxed">
                      {plan.reasoning}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                    <Clock className="h-3 w-3" />
                    <span>Timeframe: {plan.timeframe}</span>
                    <Sparkles className="h-3 w-3 ml-2" />
                    <span>Generated by AI</span>
                  </div>
                  
                  <TradingExecutionButton
                    tradingPlan={plan}
                    userAddress={userAddress}
                    isConnected={isConnected}
                    size="sm"
                    onExecutionStart={(planId) => console.log('Execution started:', planId)}
                    onExecutionComplete={(status) => console.log('Execution completed:', status)}
                    onExecutionError={(error) => console.error('Execution error:', error)}
                  />
                </div>
              </div>
            ))}

            {tradingPlans.length > 3 && (
              <div className="text-center">
                <Button variant="outline" size="sm" className="text-xs">
                  Show {tradingPlans.length - 3} more plans...
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Execution Monitor */}
      <ExecutionStatusMonitor 
        showCompleted={true}
        maxItems={5}
      />

      {/* Stats Summary */}
      {executionHistory.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              Execution Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-400">
                  {executionHistory.filter(e => e.status === 'completed').length}
                </div>
                <div className="text-xs text-gray-300 font-medium">Executed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-400">
                  {executionHistory.filter(e => e.status === 'failed').length}
                </div>
                <div className="text-xs text-gray-300 font-medium">Failed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-400">
                  {executionHistory.length > 0 ? 
                    ((executionHistory.filter(e => e.status === 'completed').length / executionHistory.length) * 100).toFixed(0) + '%' :
                    '0%'
                  }
                </div>
                <div className="text-xs text-gray-300 font-medium">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Warning */}
      {!isConnected && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Connect your wallet to execute AI-generated trading plans seamlessly
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default TradingAssistantWithExecution;