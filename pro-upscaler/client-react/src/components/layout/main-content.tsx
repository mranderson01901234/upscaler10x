import React, { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, Image as ImageIcon, Plus } from 'lucide-react';

interface MainContentProps {
  className?: string;
  onFileSelect?: (file: File) => void;
  previewImage?: string;
  isProcessing?: boolean;
}

export const MainContent: React.FC<MainContentProps> = ({
  className,
  onFileSelect,
  previewImage,
  isProcessing = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect?.(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect?.(files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn(
      "fixed top-20 left-4 right-80 bottom-20 z-30", // Margins for header, footer, and sidebar
      className
    )}>
      <Card className="h-full bg-card/50 backdrop-blur-md border-border/50 shadow-lg">
        <div className="h-full p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {!previewImage ? (
            // Upload Area
            <div
              className={cn(
                "h-full flex items-center justify-center",
                "border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer",
                "bg-gradient-to-br from-muted/10 to-muted/5",
                isDragOver 
                  ? "border-primary bg-primary/5 shadow-lg" 
                  : "border-border hover:border-primary/50 hover:bg-primary/5",
                isProcessing && "pointer-events-none opacity-50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleUploadClick}
            >
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Drop your image here</h2>
                  <p className="text-muted-foreground">or click to browse files</p>
                  
                  <Button size="lg" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Supports PNG, JPEG, WebP, TIFF up to 1.5GB
                </p>
              </div>
            </div>
          ) : (
            // Image Preview
            <div className="h-full flex items-center justify-center">
              <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-lg border-2 border-dashed border-border">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                  style={{
                    maxWidth: 'min(90%, 900px)',
                    maxHeight: 'min(90%, 700px)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 