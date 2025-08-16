import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Minus, RefreshCw, AlertTriangle } from 'lucide-react';
import { poolData, userData } from '../../data/riverPoolData';

interface WithdrawTabProps {
  withdrawAmount: string;
  setWithdrawAmount: (value: string) => void;
  isWithdrawing: boolean;
  onWithdraw: () => void;
  riskStatus: { drawdown: string };
}

export const WithdrawTab: React.FC<WithdrawTabProps> = ({
  withdrawAmount,
  setWithdrawAmount,
  isWithdrawing,
  onWithdraw,
  riskStatus
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Minus className="w-4 h-4 mr-2 text-[#92318D]" />
            提取 USDC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>提取金額</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-gray-300 font-medium">USDC</span>
            </div>
            <div className="flex justify-between text-xs text-gray-300 font-medium mt-1">
              <span>rLP 持有: {userData.rLPHolding.toLocaleString()}</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setWithdrawAmount((userData.rLPHolding * poolData.rLPPrice).toString())}
              >
                全部
              </Button>
            </div>
          </div>

          {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
            <div className="p-4 bg-red-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>銷毀 rLP 數量</span>
                <span className="font-bold text-red-600">
                  {(parseFloat(withdrawAmount) / poolData.rLPPrice).toFixed(6)}
                </span>
              </div>
              {riskStatus.drawdown === 'danger' && (
                <div className="flex justify-between text-sm">
                  <span>退出費 (1%)</span>
                  <span className="text-red-600">
                    -{(parseFloat(withdrawAmount) * 0.01).toFixed(2)} USDC
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>實際到賬</span>
                <span className="font-bold text-green-600">
                  {(parseFloat(withdrawAmount) * (riskStatus.drawdown === 'danger' ? 0.99 : 1)).toFixed(2)} USDC
                </span>
              </div>
            </div>
          )}

          <Button 
            onClick={onWithdraw}
            disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isWithdrawing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 mr-2" />
                確認提取
              </>
            )}
          </Button>

          {riskStatus.drawdown === 'danger' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                紅燈狀態：提取將收取 1% 手續費
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};