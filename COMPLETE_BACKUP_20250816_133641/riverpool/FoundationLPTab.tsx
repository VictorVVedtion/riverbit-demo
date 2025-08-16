import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Crown, Shield, Award, Lock, Calendar, Target, 
  TrendingUp, Users, Zap, AlertTriangle, CheckCircle,
  Clock, DollarSign, Gift, Star, Info
} from 'lucide-react';

export const FoundationLPTab = () => {
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);

  // Mock Foundation LP 数据
  const foundationLPData = {
    totalPool: 500000000, // 5億RBT
    participantLimit: 100, // 限額100人
    currentParticipants: 67, // 當前67人參與
    minStake: 5000000, // 最低500萬RBT
    lockPeriod: 180, // 180天鎖倉
    apy: 125, // 預計年化收益率
    bonusMultiplier: 2.5, // 獎勵倍數
    distributionStart: '2024-02-01',
    distributionEnd: '2024-08-01',
    remainingSlots: 33 // 剩餘名額
  };

  // 用户数据
  const userData = {
    isEligible: true, // 是否符合條件
    currentStake: 8500000, // 當前質押8.5M RBT
    pendingRewards: 125680, // 待領取獎勵
    totalEarned: 890250, // 累計獲得
    stakingDays: 45, // 質押天數
    remainingDays: 135, // 剩餘鎖倉天數
    nextRewardDate: '2024-01-21',
    estimatedDailyReward: 2890 // 預估日獎勵
  };

  // 獎勵分配機制
  const rewardMechanism = [
    { tier: 'Foundation LP Pool', allocation: '5億 RBT', share: '5%', description: '基礎流動性池獎勵' },
    { tier: '鎖倉獎勵', allocation: '固定APY 125%', share: '年化', description: '鎖倉期間持續獎勵' },
    { tier: '早期參與獎勵', allocation: '前50名額外20%', share: '獎勵', description: '早鳥優惠獎勵' },
    { tier: '忠誠度獎勵', allocation: '滿180天額外50%', share: '獎勵', description: '完整鎖倉期獎勵' }
  ];

  const handleStake = () => {
    if (!stakeAmount || parseFloat(stakeAmount) < foundationLPData.minStake) {
      return;
    }
    setIsStaking(true);
    // 模擬質押操作
    setTimeout(() => {
      setIsStaking(false);
      setStakeAmount('');
    }, 2000);
  };

  const calculateProjectedEarnings = () => {
    const amount = parseFloat(stakeAmount) || 0;
    const dailyRate = foundationLPData.apy / 365 / 100;
    const dailyEarning = amount * dailyRate;
    const totalEarning = dailyEarning * foundationLPData.lockPeriod;
    return { dailyEarning, totalEarning };
  };

  const projectedEarnings = calculateProjectedEarnings();

  return (
    <div className="space-y-6">
      {/* Foundation LP 介紹 */}
      <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-[#92318D]" />
            <span className="text-yellow-800">Foundation LP 頂級流動性池</span>
            <Badge className="bg-yellow-200 text-yellow-800">
              限額 {foundationLPData.participantLimit} 人
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-mono text-yellow-600">{foundationLPData.apy}%</div>
              <div className="text-sm text-yellow-700">預計年化收益</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-yellow-600">{foundationLPData.lockPeriod}天</div>
              <div className="text-sm text-yellow-700">鎖倉期間</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-yellow-600">{foundationLPData.bonusMultiplier}x</div>
              <div className="text-sm text-yellow-700">獎勵倍數</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg border border-yellow-200">
            <h4 className="text-yellow-800 mb-2">Foundation LP 特權</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#92318D]" />
                <span>獨家高收益池</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-[#92318D]" />
                <span>180天鎖倉保障</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-[#92318D]" />
                <span>額外獎勵倍數</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#92318D]" />
                <span>限量版LP身份</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 參與狀態 */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#92318D]" />
              <span>參與狀態</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>參與進度</span>
                  <span>{foundationLPData.currentParticipants} / {foundationLPData.participantLimit}</span>
                </div>
                <Progress value={(foundationLPData.currentParticipants / foundationLPData.participantLimit) * 100} className="h-3" />
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-mono text-green-600">{foundationLPData.remainingSlots}</div>
                <div className="text-sm text-gray-300">剩餘名額</div>
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  名額有限，先到先得！錯過將無法參與Foundation LP池。
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-[#92318D]" />
              <span>我的質押</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userData.currentStake > 0 ? (
                <>
                  <div className="text-center bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-mono text-blue-600">
                      {userData.currentStake.toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-700">當前質押 (RBT)</div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>質押天數:</span>
                      <span>{userData.stakingDays} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span>剩餘鎖倉:</span>
                      <span className="text-orange-600">{userData.remainingDays} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span>日預估獎勵:</span>
                      <span className="text-green-600">{userData.estimatedDailyReward} RBT</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Progress value={(userData.stakingDays / foundationLPData.lockPeriod) * 100} className="h-2" />
                    <div className="text-xs text-center mt-1 text-gray-300 font-medium">
                      鎖倉進度: {((userData.stakingDays / foundationLPData.lockPeriod) * 100).toFixed(1)}%
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-300 font-medium">
                  <Lock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>尚未參與質押</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="w-4 h-4 text-[#92318D]" />
              <span>獎勵統計</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-mono text-green-600">
                  {userData.pendingRewards.toLocaleString()}
                </div>
                <div className="text-sm text-green-700">待領取獎勵 (RBT)</div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>累計已獲得:</span>
                  <span className="text-blue-600">{userData.totalEarned.toLocaleString()} RBT</span>
                </div>
                <div className="flex justify-between">
                  <span>下次發放:</span>
                  <span>{userData.nextRewardDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>當前APY:</span>
                  <span className="text-purple-600">{foundationLPData.apy}%</span>
                </div>
              </div>

              <Button className="w-full mt-4" disabled={userData.pendingRewards === 0}>
                <Zap className="w-4 h-4 mr-2" />
                領取獎勵 {userData.pendingRewards > 0 ? `(${userData.pendingRewards.toLocaleString()} RBT)` : ''}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 質押操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-[#92318D]" />
            <span>Foundation LP 質押</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">質押數量</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder={`最低 ${foundationLPData.minStake.toLocaleString()} RBT`}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-300 font-medium">
                    RBT
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-300 font-medium mt-1">
                  <span>最低質押: {foundationLPData.minStake.toLocaleString()} RBT</span>
                  <span>可用餘額: 12,450,000 RBT</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percent) => (
                  <Button
                    key={percent}
                    variant="outline"
                    size="sm"
                    onClick={() => setStakeAmount((12450000 * percent / 100).toString())}
                    className="text-xs"
                  >
                    {percent}%
                  </Button>
                ))}
              </div>

              {parseFloat(stakeAmount) < foundationLPData.minStake && stakeAmount && (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    質押數量不能少於 {foundationLPData.minStake.toLocaleString()} RBT
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                className="w-full bg-yellow-600 hover:bg-yellow-700" 
                size="lg"
                onClick={handleStake}
                disabled={!stakeAmount || parseFloat(stakeAmount) < foundationLPData.minStake || isStaking || foundationLPData.remainingSlots === 0}
              >
                {isStaking ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    質押中...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    加入 Foundation LP
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#92318D]" />
                <span>收益預估</span>
              </h4>
              
              {stakeAmount && parseFloat(stakeAmount) >= foundationLPData.minStake && (
                <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span>質押數量:</span>
                    <span className="font-mono">{parseFloat(stakeAmount).toLocaleString()} RBT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>日預估收益:</span>
                    <span className="text-green-600 font-mono">{projectedEarnings.dailyEarning.toFixed(0)} RBT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>180天總收益:</span>
                    <span className="text-green-600 font-mono">{projectedEarnings.totalEarning.toFixed(0)} RBT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>實際APY:</span>
                    <span className="text-purple-600">{foundationLPData.apy}%</span>
                  </div>
                </div>
              )}

              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  <strong>重要提醒:</strong> Foundation LP 為180天鎖倉池，質押後無法提前取出。
                  請確保您有足夠的流動性資金用於日常交易。
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 獎勵機制詳情 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-[#92318D]" />
            <span>Foundation LP 獎勵機制</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {rewardMechanism.map((reward, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-[#92318D]" />
                      <span>{reward.tier}</span>
                    </h5>
                    <Badge variant="outline">{reward.share}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="text-blue-600 font-mono">{reward.allocation}</div>
                    <div className="text-gray-300">{reward.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h5>分配時間軸</h5>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="text-sm">
                    <div>質押開始</div>
                    <div className="text-gray-300 font-medium">{foundationLPData.distributionStart}</div>
                  </div>
                </div>
                <div className="border-l-2 border-gray-200 ml-1.5 h-4"></div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="text-sm">
                    <div>每日獎勵發放</div>
                    <div className="text-gray-300 font-medium">持續180天</div>
                  </div>
                </div>
                <div className="border-l-2 border-gray-200 ml-1.5 h-4"></div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="text-sm">
                    <div>鎖倉期滿 + 忠誠獎勵</div>
                    <div className="text-gray-300 font-medium">{foundationLPData.distributionEnd}</div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                <div className="text-yellow-800 text-sm">
                  <strong>Foundation LP 專屬福利:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>前50名參與者額外20%獎勵</li>
                    <li>完成180天鎖倉額外50%獎勵</li>
                    <li>平台治理投票權</li>
                    <li>VIP客服專屬通道</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};