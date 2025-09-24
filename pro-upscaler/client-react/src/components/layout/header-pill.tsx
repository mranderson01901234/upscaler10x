import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HeaderPillProps {
  className?: string;
}

export const HeaderPill: React.FC<HeaderPillProps> = ({ className }) => {
  return (
    <Card className={cn(
      "fixed top-4 left-4 right-4 z-50",
      "rounded-full px-6 py-3",
      "bg-card/80 backdrop-blur-md border-border/50",
      "shadow-lg shadow-background/20",
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-foreground">Pro Upscaler</span>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-4">
          {/* AI Status */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-muted-foreground">AI Ready</span>
          </div>
          
          {/* Pro Engine Status */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-xs text-muted-foreground">Pro Engine</span>
          </div>
        </div>
      </div>
    </Card>
  );
}; 