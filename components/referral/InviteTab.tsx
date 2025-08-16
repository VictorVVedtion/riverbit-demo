import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { Share2, Copy, CheckCircle, Info } from 'lucide-react';
import type { UserTypeData } from '../../constants/referralConstants';

interface InviteTabProps {
  userData: UserTypeData;
  referralLink: string;
  copied: boolean;
  onCopyLink: () => void;
}

export const InviteTab: React.FC<InviteTabProps> = ({ 
  userData, 
  referralLink, 
  copied, 
  onCopyLink 
}) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="w-4 h-4" />
            <span>邀請推廣</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">我的邀請連結</label>
              <div className="flex items-center space-x-2">
                <Input value={referralLink} readOnly className="flex-1" />
                <Button onClick={onCopyLink} variant="outline">
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                分享您的邀請連結，被邀請用戶註冊並完成交易後，您將獲得 {userData.rebateRate}% 的返佣獎勵。
                {userData.tierLevels > 1 && ` 支援 ${userData.tierLevels} 級分銷體系。`}
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-[#0A0A0A]">{userData.rebateRate}%</div>
                  <div className="text-sm text-gray-300">返佣比例</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-[#0A0A0A]">{userData.tierLevels}</div>
                  <div className="text-sm text-gray-300">分銷層級</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-[#0A0A0A]">{userData.totalInvited}</div>
                  <div className="text-sm text-gray-300">已邀請人數</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};