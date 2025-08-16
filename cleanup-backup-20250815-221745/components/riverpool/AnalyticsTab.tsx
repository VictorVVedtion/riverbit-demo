import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export const AnalyticsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>數據分析</CardTitle>
        </CardHeader>
        <CardContent>
          <p>數據統計和分析圖表</p>
        </CardContent>
      </Card>
    </div>
  );
};