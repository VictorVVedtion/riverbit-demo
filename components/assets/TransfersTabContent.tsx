import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ExternalLink, Copy } from 'lucide-react';

interface TransfersTabContentProps {
  transferHistory: any[];
}

export const TransfersTabContent: React.FC<TransfersTabContentProps> = ({ transferHistory }) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ExternalLink className="w-4 h-4 text-[#92318D]" />
            <span>轉賬記錄</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transferHistory.map((transfer) => (
              <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-200 font-medium font-sans font-medium">{transfer.time}</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      transfer.type === 'deposit' ? 'default' : 
                      transfer.type === 'withdraw' ? 'destructive' : 'secondary'
                    }>
                      {transfer.type === 'deposit' ? '存入' : 
                       transfer.type === 'withdraw' ? '提取' : '內轉'}
                    </Badge>
                    {transfer.type === 'internal' && (
                      <span className="text-xs text-gray-200 font-medium">
                        {transfer.from} → {transfer.to}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-sans font-medium">{transfer.amount} {transfer.asset}</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {transfer.status === 'completed' ? '已完成' : '處理中'}
                    </Badge>
                    {transfer.hash && (
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};