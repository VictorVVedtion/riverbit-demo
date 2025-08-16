import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Users } from 'lucide-react';

interface TeamMember {
  id: number;
  username: string;
  level: string;
  volume: number;
  commission: number;
  status: string;
}

interface TeamTabProps {
  teamData: TeamMember[];
}

export const TeamTab: React.FC<TeamTabProps> = ({ teamData }) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>團隊成員管理</span>
            </div>
            <Badge variant="outline">
              總成員: {teamData.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 text-sm text-gray-300 font-medium p-3 bg-slate-800/50 rounded-lg">
              <span>用戶名</span>
              <span>等級</span>
              <span className="text-right">30天交易量</span>
              <span className="text-right">返佣收入</span>
              <span>狀態</span>
            </div>
            
            {teamData.map((member) => (
              <div key={member.id} className="grid grid-cols-5 gap-4 text-sm p-3 hover:bg-slate-800/50 rounded-lg transition-colors">
                <span className="font-medium">{member.username}</span>
                <Badge variant="outline" className="w-fit">
                  {member.level}
                </Badge>
                <span className="text-right text-2xl font-bold text-[16px]">
                  ${member.volume.toLocaleString()}
                </span>
                <span className="text-right text-2xl font-bold text-green-600 text-[16px]">
                  ${member.commission.toLocaleString()}
                </span>
                <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="w-fit">
                  {member.status === 'active' ? '活躍' : '非活躍'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};