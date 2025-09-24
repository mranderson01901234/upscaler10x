import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HeaderPill } from './components/layout/header-pill';
import { FooterPill } from './components/layout/footer-pill';
import { Sidebar } from './components/layout/sidebar';
import { MainContent } from './components/layout/main-content';
import { DashboardLayout } from './components/layout/dashboard-layout';
import { Dashboard } from './pages/Dashboard';
import { ProcessingHistory } from './pages/ProcessingHistory';
import { Account } from './pages/Account';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserManagement } from './pages/UserManagement';
import './globals.css';

interface AppState {
  currentImage: File | null;
  previewUrl: string | null;
  isProcessing: boolean;
  progress: number;
  progressText: string;
  settings: {
    scaleFactor: string;
    outputFormat: string;
    processingMode: string;
    aiEnhancement: boolean;
    customFilename: string;
    downloadLocation: string;
  };
  imageDetails: {
    dimensions: string;
    size: string;
    format: string;
  } | null;
  outputPreview: {
    dimensions: string;
    estimatedSize: string;
    estimatedTime: string;
    filename: string;
  };
}

// Main Upscaler Component (existing functionality)
function MainUpscaler() {
  const [state, setState] = useState<AppState>({
    currentImage: null,
    previewUrl: null,
    isProcessing: false,
    progress: 0,
    progressText: "Ready to upscale",
    settings: {
      scaleFactor: "10",
      outputFormat: "png",
      processingMode: "speed",
      aiEnhancement: true,
      customFilename: "",
      downloadLocation: "Downloads/ProUpscaler"
    },
    imageDetails: null,
    outputPreview: {
      dimensions: "-",
      estimatedSize: "-",
      estimatedTime: "-",
      filename: "Auto-generated"
    }
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const estimateFileSize = (width: number, height: number, format: string): number => {
    const pixels = width * height;
    let bytesPerPixel: number;
    
    switch (format) {
      case 'png': bytesPerPixel = 4; break;
      case 'jpeg': bytesPerPixel = 2; break;
      case 'webp': bytesPerPixel = 1.5; break;
      default: bytesPerPixel = 3;
    }
    
    return pixels * bytesPerPixel;
  };

  const estimateProcessingTime = (width: number, height: number): number => {
    const pixels = width * height;
    const mode = state.settings.processingMode;
    
    let baseTime: number;
    switch (mode) {
      case 'speed':
        baseTime = pixels / 50000000; // Ultra-fast mode
        break;
      case 'balanced':
        baseTime = pixels / 30000000; // Balanced mode
        break;
      case 'quality':
        baseTime = pixels / 15000000; // Quality mode
        break;
      default:
        baseTime = pixels / 50000000;
    }
    
    return Math.max(1, Math.round(baseTime));
  };

  const updateEstimates = useCallback((imageWidth: number, imageHeight: number) => {
    const scaleFactor = parseInt(state.settings.scaleFactor);
    const outputWidth = imageWidth * scaleFactor;
    const outputHeight = imageHeight * scaleFactor;
    const estimatedSize = estimateFileSize(outputWidth, outputHeight, state.settings.outputFormat);
    const estimatedTime = estimateProcessingTime(outputWidth, outputHeight);

    setState(prev => ({
      ...prev,
      outputPreview: {
        dimensions: `${outputWidth} × ${outputHeight}`,
        estimatedSize: `~${formatFileSize(estimatedSize)}`,
        estimatedTime: `~${estimatedTime}s`,
        filename: state.settings.customFilename || 'Auto-generated'
      }
    }));
  }, [state.settings]);

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const imageDetails = {
          dimensions: `${img.width} × ${img.height}`,
          size: formatFileSize(file.size),
          format: file.type.split('/')[1].toUpperCase()
        };

        setState(prev => ({
          ...prev,
          currentImage: file,
          previewUrl: e.target?.result as string,
          imageDetails
        }));

        // Update estimates
        updateEstimates(img.width, img.height);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [updateEstimates]);

  const handleSettingsChange = useCallback((key: string, value: any) => {
    setState(prev => {
      const newState = {
        ...prev,
        settings: {
          ...prev.settings,
          [key]: value
        }
      };
      return newState;
    });

    // Update estimates if we have an image
    if (state.imageDetails && state.currentImage) {
      // Re-extract dimensions from current image
      const img = new Image();
      img.onload = () => {
        updateEstimates(img.width, img.height);
      };
      img.src = state.previewUrl!;
    }
  }, [state.imageDetails, state.currentImage, state.previewUrl, updateEstimates]);

  const handleStartUpscaling = useCallback(async () => {
    if (!state.currentImage) return;

    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      progressText: "Initializing..."
    }));

    // Simulate processing with progress updates
    const progressSteps = [
      { progress: 10, text: "Connecting to Pro Engine..." },
      { progress: 25, text: "Preparing image data..." },
      { progress: 50, text: state.settings.aiEnhancement ? "Applying AI enhancement..." : "Upscaling image..." },
      { progress: 75, text: "Finalizing output..." },
      { progress: 90, text: "Saving file..." },
      { progress: 100, text: "Complete!" }
    ];

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setState(prev => ({
        ...prev,
        progress: step.progress,
        progressText: step.text
      }));
    }

    // Reset processing state
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 0,
        progressText: "Processing complete!"
      }));
    }, 1000);
  }, [state.currentImage, state.settings.aiEnhancement]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Pill */}
      <HeaderPill />
      
      {/* Main Content Area */}
      <MainContent 
        onFileSelect={handleFileSelect}
        previewImage={state.previewUrl || undefined}
        isProcessing={state.isProcessing}
      />
      
      {/* Sidebar */}
      <Sidebar 
        imageDetails={state.imageDetails || undefined}
        settings={state.settings}
        onSettingsChange={handleSettingsChange}
        outputPreview={state.outputPreview}
      />
      
      {/* Footer Pill */}
      <FooterPill 
        isProcessing={state.isProcessing}
        progress={state.progress}
        progressText={state.progressText}
        onStartUpscaling={handleStartUpscaling}
        disabled={!state.currentImage}
      />
    </div>
  );
}

// Dashboard Router Component
function DashboardRouter() {
  const [currentView, setCurrentView] = useState<'overview' | 'history' | 'account'>('overview');

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return <Dashboard />;
      case 'history':
        return <ProcessingHistory />;
      case 'account':
        return <Account />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DashboardLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderContent()}
    </DashboardLayout>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Main upscaler interface */}
        <Route path="/" element={<MainUpscaler />} />
        
        {/* Dashboard routes */}
        <Route path="/dashboard/*" element={<DashboardRouter />} />
        
        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        
        {/* Redirect unknown routes to main */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App; 