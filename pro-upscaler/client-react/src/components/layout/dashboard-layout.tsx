import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  User, 
  LogOut,
  Menu,
  Bell,
  Search,
  ArrowLeft,
  Crown
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: 'overview' | 'history' | 'account';
  onViewChange: (view: 'overview' | 'history' | 'account') => void;
}

export function DashboardLayout({ children, currentView, onViewChange }: DashboardLayoutProps) {
  const navigate = useNavigate();
  
  const navigationItems = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Dashboard overview'
    },
    {
      id: 'history' as const,
      label: 'Processing History',
      icon: History,
      description: 'View processing history'
    },
    {
      id: 'account' as const,
      label: 'Account Settings',
      icon: User,
      description: 'Manage your account'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="font-semibold text-lg">Pro Upscaler</span>
            </div>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            {/* Back to Editor Premium Button */}
            <Button 
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              size="sm"
            >
              <Crown className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
            
            <Button variant="ghost" size="sm">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">Free Plan</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-6">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start ${
                      isActive ? 'bg-secondary text-secondary-foreground' : ''
                    }`}
                    onClick={() => onViewChange(item.id)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground hidden lg:block">
                        {item.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </nav>

            <Separator className="my-6" />

            {/* Quick Stats */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Quick Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">This Month</span>
                    <span>7/10 uploads</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">AI Enhanced</span>
                    <span>2/5 used</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Processing</span>
                    <span>234s total</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20">
          {children}
        </main>
        
        {/* Floating Footer for Upgrade Prompt */}
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Unlock More Power</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to Pro for unlimited AI enhancements, higher upscaling factors, and priority processing.
                </p>
              </div>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shrink-0 ml-4">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 