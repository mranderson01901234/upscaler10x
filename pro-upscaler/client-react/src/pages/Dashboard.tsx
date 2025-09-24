import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { 
  TrendingUp, 
  Image, 
  Clock, 
  Zap, 
  CreditCard, 
  Settings,
  Upload,
  BarChart3,
  Users
} from 'lucide-react';

interface UsageStats {
  currentTier: string;
  monthlyUploads: number;
  monthlyLimit: number;
  aiEnhancements: number;
  aiLimit: number;
  processingTime: number;
  filesProcessed: number;
}

interface RecentActivity {
  id: string;
  filename: string;
  scaleFactor: string;
  processingTime: number;
  timestamp: Date;
  status: 'completed' | 'processing' | 'failed';
}

export function Dashboard() {
  const [stats, setStats] = useState<UsageStats>({
    currentTier: 'Free',
    monthlyUploads: 7,
    monthlyLimit: 10,
    aiEnhancements: 2,
    aiLimit: 5,
    processingTime: 234,
    filesProcessed: 15
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      filename: 'landscape_4k.jpg',
      scaleFactor: '4x',
      processingTime: 18.3,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'completed'
    },
    {
      id: '2', 
      filename: 'portrait_hd.png',
      scaleFactor: '2x',
      processingTime: 8.7,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      status: 'completed'
    },
    {
      id: '3',
      filename: 'artwork_large.jpg',
      scaleFactor: '8x',
      processingTime: 45.2,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      status: 'completed'
    }
  ]);

  const uploadPercentage = (stats.monthlyUploads / stats.monthlyLimit) * 100;
  const aiPercentage = stats.aiLimit > 0 ? (stats.aiEnhancements / stats.aiLimit) * 100 : 0;

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your Pro Upscaler activity overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        </div>
      </div>

      {/* Usage Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Tier */}
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-sm text-muted-foreground">Current Plan</h3>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{stats.currentTier}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.currentTier === 'Free' ? 'Limited features' : 'Full access'}
            </p>
          </div>
        </Card>

        {/* Monthly Usage */}
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <Image className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-sm text-muted-foreground">Monthly Usage</h3>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">
              {stats.monthlyUploads}/{stats.monthlyLimit}
            </div>
            <Progress value={uploadPercentage} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(uploadPercentage)}% used
            </p>
          </div>
        </Card>

        {/* AI Enhancements */}
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-sm text-muted-foreground">AI Enhancements</h3>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">
              {stats.aiEnhancements}/{stats.aiLimit > 0 ? stats.aiLimit : '∞'}
            </div>
            {stats.aiLimit > 0 && (
              <>
                <Progress value={aiPercentage} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(aiPercentage)}% used
                </p>
              </>
            )}
            {stats.aiLimit === -1 && (
              <p className="text-xs text-muted-foreground mt-1">Unlimited</p>
            )}
          </div>
        </Card>

        {/* Processing Stats */}
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-sm text-muted-foreground">Total Processing</h3>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{stats.processingTime}s</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.filesProcessed} files processed
            </p>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Button variant="ghost" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={activity.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Image className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{activity.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.scaleFactor} upscaling • {activity.processingTime}s
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        activity.status === 'completed' ? 'bg-green-500' :
                        activity.status === 'processing' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
                {index < recentActivity.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button className="w-full justify-start" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload New Image
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing & Usage
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </Button>
          </div>

          <Separator className="my-4" />

          {/* System Status */}
          <div>
            <h3 className="font-medium text-sm mb-3">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Pro Engine</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">GPU Acceleration</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>GTX 1050</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Processing Queue</span>
                <span className="text-muted-foreground">Empty</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 