import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Target, CheckCircle, ArrowRight, ExternalLink, Info } from 'lucide-react';
import type { UserTypeData } from '../../constants/referralConstants';

interface UpgradeTabProps {
  userData: UserTypeData;
}

export const UpgradeTab: React.FC<UpgradeTabProps> = ({ userData }) => {
  if (!userData.nextLevelRequirement) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-800">
              <Target className="w-5 h-5" />
              <span>升級到 {userData.nextLevelRequirement.targetLevel}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-4 border border-yellow-200">
                <h4 className="text-yellow-800 mb-4">升級條件進度</h4>
                <div className="space-y-4">
                  {userData.nextLevelRequirement.requirements.map((req, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">{req.label}</span>
                        <span className="text-sm font-mono">
                          {req.current.toLocaleString()} / {req.required.toLocaleString()} {req.unit}
                        </span>
                      </div>
                      <Progress 
                        value={(req.current / req.required) * 100} 
                        className="h-3" 
                      />
                      {req.current >= req.required ? (
                        <div className="flex items-center text-green-600 text-sm mt-1">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          已達標
                        </div>
                      ) : (
                        <div className="text-orange-600 text-sm mt-1">
                          還需 {(req.required - req.current).toLocaleString()} {req.unit}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-yellow-800">升級後權益</h4>
                  <div className="space-y-2">
                    {userData.nextLevelRequirement.targetLevel === 'Foundation 社區長' ? [
                      '固定10萬RBT代幣獎勵',
                      '最高40%返佣比例',
                      '3級分銷體系',
                      '專屬VIP客服',
                      '平台治理投票權'
                    ] : [
                      '4%代幣池按比例分配',
                      '最高35%返佣比例', 
                      '2級分銷體系',
                      '優先客服支持',
                      '邀請獎勵提升'
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <ArrowRight className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-yellow-800">升級建議</h4>
                  <div className="space-y-3">
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription className="text-sm">
                        專注提升團隊活躍度和交易量是最快的升級途徑。
                      </AlertDescription>
                    </Alert>
                    
                    <div className="bg-white p-3 rounded border border-yellow-200">
                      <div className="text-sm space-y-2">
                        <div className="text-yellow-800">升級策略:</div>
                        <div>• 增加邀請推廣活動</div>
                        <div>• 協助下級用戶提升交易量</div>
                        <div>• 保持團隊活躍度</div>
                        <div>• 參與平台推廣活動</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Button variant="outline" disabled className="opacity-50">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  申請升級 (即將推出)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};