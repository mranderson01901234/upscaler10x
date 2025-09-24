import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { 
  Shield, 
  Users, 
  DollarSign, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Server,
  Database,
  Zap
} from 'lucide-react';

interface SystemHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  error?: string;
}

interface BusinessMetrics {
  date: string;
  daily_active_users: number;
  total_processing_jobs: number;
  ai_enhancement_jobs: number;
  avg_processing_time: number;
  total_pixels_processed: number;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  estimatedMRR: number;
  systemHealth: SystemHealth[];
  recentMetrics: BusinessMetrics[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    estimatedMRR: 0,
    systemHealth: [],
    recentMetrics: []
  });
  
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadAdminStats();
    const interval = setInterval(loadAdminStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAdminStats = async () => {
    try {
      // In a real implementation, these would be API calls to the admin endpoints
      // For now, using mock data
      const mockStats: AdminStats = {
        totalUsers: 1247,
        activeUsers: 892,
        estimatedMRR: 12450.50,
        systemHealth: [
          {
            service: 'web_app',
            status: 'healthy',
            responseTime: 45
          },
          {
            service: 'pro_engine',
            status: 'down',
            responseTime: 0,
            error: 'Connection refused'
          }
        ],
        recentMetrics: [
          {
            date: '2025-09-24',
            daily_active_users: 234,
            total_processing_jobs: 1456,
            ai_enhancement_jobs: 287,
            avg_processing_time: 3200,
            total_pixels_processed: 45000000
          }
        ]
      };

      setStats(mockStats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              System overview and management console
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
            <Button 
              onClick={loadAdminStats} 
              variant="outline" 
              size="sm"
              className="mt-2"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <div className="mt-2">
            <Progress value={(stats.activeUsers / stats.totalUsers) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeUsers} active users ({((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%)
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</p>
              <p className="text-2xl font-bold text-foreground">${stats.estimatedMRR.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Estimated based on subscriptions
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Jobs</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.recentMetrics[0]?.total_processing_jobs || 0}
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              {stats.recentMetrics[0]?.ai_enhancement_jobs || 0} AI enhanced
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Processing Time</p>
              <p className="text-2xl font-bold text-foreground">
                {((stats.recentMetrics[0]?.avg_processing_time || 0) / 1000).toFixed(1)}s
              </p>
            </div>
            <Zap className="w-8 h-8 text-orange-600" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              Per image processing
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Health */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-foreground">System Health</h2>
          </div>
          
          <div className="space-y-4">
            {stats.systemHealth.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium text-foreground capitalize">
                      {service.service.replace('_', ' ')}
                    </p>
                    {service.error && (
                      <p className="text-xs text-red-600">{service.error}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                  {service.responseTime > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.responseTime}ms
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Overall Status</p>
            <div className="flex items-center gap-2">
              {stats.systemHealth.every(s => s.status === 'healthy') ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">All Systems Operational</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-600">Issues Detected</span>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
              <Users className="w-6 h-6" />
              <span className="text-sm">Manage Users</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
              <DollarSign className="w-6 h-6" />
              <span className="text-sm">Billing</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
              <Activity className="w-6 h-6" />
              <span className="text-sm">Analytics</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
              <Server className="w-6 h-6" />
              <span className="text-sm">System Logs</span>
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Recent Activity</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-muted-foreground">System health check completed</p>
                <span className="text-xs text-muted-foreground ml-auto">2 min ago</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm text-muted-foreground">New user registration</p>
                <span className="text-xs text-muted-foreground ml-auto">5 min ago</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <p className="text-sm text-muted-foreground">Subscription upgrade processed</p>
                <span className="text-xs text-muted-foreground ml-auto">12 min ago</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 