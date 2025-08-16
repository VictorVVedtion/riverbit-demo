import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { poolData, userData } from '../../data/riverPoolData';

interface DepositTabProps {
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  isDepositing: boolean;
  onDeposit: () => void;
  riskStatus: { drawdown: string };
  marketStatus: { weekend: boolean };
}

export const DepositTab: React.FC<DepositTabProps> = ({
  depositAmount,
  setDepositAmount,
  isDepositing,
  onDeposit,
  riskStatus,
  marketStatus
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-4 h-4 mr-2 text-[#92318D]" />
            存入 USDC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>存入金額</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-gray-300 font-medium">USDC</span>
            </div>
            <div className="flex justify-between text-xs text-gray-300 font-medium mt-1">
              <span>可用餘額: ${userData.balance.toLocaleString()}</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setDepositAmount(userData.balance.toString())}
              >
                最大
              </Button>
            </div>
          </div>

          {depositAmount && parseFloat(depositAmount) > 0 && (
            <div className="p-4 bg-green-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>預計獲得 rLP</span>
                <span className="font-bold text-green-600">
                  {(parseFloat(depositAmount) / poolData.rLPPrice).toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>保險金扣除 (1%)</span>
                <span className="text-orange-600">
                  -{(parseFloat(depositAmount) * 0.01).toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>預估年化收益</span>
                <span className="font-bold text-purple-600">{poolData.apr30d.toFixed(1)}%</span>
              </div>
            </div>
          )}

          <Button 
            onClick={onDeposit}
            disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0 || riskStatus.drawdown === 'danger'}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isDepositing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                確認存入
              </>
            )}
          </Button>

          {riskStatus.drawdown === 'danger' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                紅燈狀態：已暫停新存入功能
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};