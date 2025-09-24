import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Zap, Loader2 } from 'lucide-react';

interface FooterPillProps {
  className?: string;
  isProcessing?: boolean;
  progress?: number;
  progressText?: string;
  onStartUpscaling?: () => void;
  disabled?: boolean;
}

export const FooterPill: React.FC<FooterPillProps> = ({ 
  className,
  isProcessing = false,
  progress = 0,
  progressText = "Ready to upscale",
  onStartUpscaling,
  disabled = false
}) => {
  return (
    <Card className={cn(
      "fixed bottom-4 left-4 right-80 z-50", // Right margin for sidebar
      "rounded-full px-6 py-4",
      "bg-card/80 backdrop-blur-md border-border/50",
      "shadow-lg shadow-background/20",
      className
    )}>
      <div className="flex items-center space-x-4">
        {/* Progress Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {isProcessing ? 'Processing Image' : 'Pro Upscaler'}
            </span>
            {isProcessing && (
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </span>
            )}
          </div>
          
          {isProcessing ? (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground truncate">
                {progressText}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {progressText}
            </p>
          )}
        </div>

        {/* CTA Button */}
        <Button 
          onClick={onStartUpscaling}
          disabled={disabled || isProcessing}
          size="lg"
          className="rounded-full px-6"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Start Upscaling
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}; 