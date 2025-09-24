import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Image, Settings, FileText, Folder } from 'lucide-react';

interface SidebarProps {
  className?: string;
  imageDetails?: {
    dimensions?: string;
    size?: string;
    format?: string;
  };
  settings?: {
    scaleFactor?: string;
    outputFormat?: string;
    processingMode?: string;
    aiEnhancement?: boolean;
    customFilename?: string;
    downloadLocation?: string;
  };
  onSettingsChange?: (key: string, value: any) => void;
  outputPreview?: {
    dimensions?: string;
    estimatedSize?: string;
    estimatedTime?: string;
    filename?: string;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  className,
  imageDetails,
  settings = {},
  onSettingsChange,
  outputPreview = {}
}) => {
  const handleSettingChange = (key: string, value: any) => {
    onSettingsChange?.(key, value);
  };

  return (
    <div className={cn(
      "fixed top-20 right-4 bottom-20 w-80 z-40",
      "rounded-l-2xl rounded-r-none", // Rounded left corners only
      "bg-card/80 backdrop-blur-md border border-r-0 border-border/50",
      "shadow-lg shadow-background/20",
      "overflow-y-auto",
      className
    )}>
      <div className="p-4 space-y-4">
        {/* Image Details Card */}
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Image className="h-4 w-4 mr-2" />
              Image Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {imageDetails ? (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground">Size</div>
                  <div className="font-medium">{imageDetails.dimensions || '-'}</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground">File</div>
                  <div className="font-medium">{imageDetails.size || '-'}</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground">Format</div>
                  <div className="font-medium">{imageDetails.format || '-'}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground">Upload an image to see details</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Scale Factor */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Scale Factor</label>
              <Select 
                value={settings.scaleFactor || "10"} 
                onValueChange={(value) => handleSettingChange('scaleFactor', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scale factor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2× (Double Size)</SelectItem>
                  <SelectItem value="4">4× (Quadruple Size)</SelectItem>
                  <SelectItem value="6">6× (6 Times Larger)</SelectItem>
                  <SelectItem value="8">8× (8 Times Larger)</SelectItem>
                  <SelectItem value="10">10× (10 Times Larger)</SelectItem>
                  <SelectItem value="12">12× (12 Times Larger)</SelectItem>
                  <SelectItem value="15">15× (15 Times Larger)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Output Format */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Output Format</label>
              <Select 
                value={settings.outputFormat || "png"} 
                onValueChange={(value) => handleSettingChange('outputFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG (Best Quality)</SelectItem>
                  <SelectItem value="jpeg">JPEG (Balanced)</SelectItem>
                  <SelectItem value="webp">WebP (Modern)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Processing Mode */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Processing Mode</label>
              <Select 
                value={settings.processingMode || "speed"} 
                onValueChange={(value) => handleSettingChange('processingMode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="speed">Speed (Ultra-Fast)</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="quality">Quality (Best)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI Enhancement Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">AI Face Enhancement</label>
                <p className="text-xs text-muted-foreground">
                  🤖 Enhances faces in portrait images using CodeFormer AI
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={settings.aiEnhancement ?? true}
                  onCheckedChange={(checked) => handleSettingChange('aiEnhancement', checked)}
                />
                <span className="text-xs text-muted-foreground">+4-8s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Settings Card */}
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              File Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Custom Filename */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Custom Filename</label>
              <Input
                placeholder="Leave blank for auto-generated"
                value={settings.customFilename || ""}
                onChange={(e) => handleSettingChange('customFilename', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Extension added automatically
              </p>
            </div>

            {/* Download Location */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Download Location</label>
              <div className="flex space-x-2">
                <Input
                  value={settings.downloadLocation || "Downloads/ProUpscaler"}
                  onChange={(e) => handleSettingChange('downloadLocation', e.target.value)}
                  readOnly
                  className="flex-1"
                />
                <Button variant="outline" size="sm" className="px-2">
                  <Folder className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output Preview Card */}
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Image className="h-4 w-4 mr-2" />
              Output Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{outputPreview.dimensions || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. File:</span>
                <span className="font-medium">{outputPreview.estimatedSize || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">{outputPreview.estimatedTime || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filename:</span>
                <span className="font-medium text-xs break-all">
                  {outputPreview.filename || 'Auto-generated'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 