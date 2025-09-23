interface ProcessingProgress {
  progress: number;
  message?: string;
  status?: 'processing' | 'complete' | 'error';
  stage?: string;
  aiTime?: number;
  aiEnhancementApplied?: boolean;
  result?: {
    outputPath: string;
    filename: string;
    fileSize: number;
    dimensions: { width: number; height: number };
    format: string;
    processingTime: number;
    aiEnhanced?: boolean;
  };
}

interface ProcessingResult {
  sessionId: string;
  status: 'complete' | 'error';
  message: string;
  aiEnhanced?: boolean;
  result?: {
    outputPath: string;
    filename: string;
    fileSize: number;
    dimensions: { width: number; height: number };
    format: string;
    processingTime: number;
    aiEnhanced?: boolean;
  };
}

interface ServiceCapabilities {
  expectedPerformance?: {
    category: string;
    estimatedTimeFor600MP: number;
  };
}

export class ProEngineService {
  private webEngineUrl = 'http://localhost:3002';
  private desktopServiceUrl = 'http://localhost:3006';
  private isAvailable = false;
  private desktopServiceAvailable = false;
  private capabilities: ServiceCapabilities | null = null;

  constructor() {
    this.checkAvailability();
  }

  async checkAvailability(): Promise<boolean> {
    // Check desktop service first (priority)
    try {
      const response = await fetch(`${this.desktopServiceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      
      if (response.ok) {
        this.desktopServiceAvailable = true;
        const healthData = await response.json();
        this.capabilities = healthData.capabilities;
        console.log('✅ Desktop service available:', healthData.service);
        this.isAvailable = true;
        return this.isAvailable;
      }
    } catch (error) {
      this.desktopServiceAvailable = false;
      console.log('ℹ️ Desktop service not available, checking web service...');
    }
    
    // Fall back to original web service check
    try {
      const response = await fetch(`${this.webEngineUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      
      this.isAvailable = response.ok;
      
      if (this.isAvailable) {
        console.log('✅ Pro Processing Engine detected (web service)');
      }
    } catch (error) {
      this.isAvailable = false;
      console.log('ℹ️ No Pro Processing services available');
    }
    
    return this.isAvailable;
  }

  async processWithAIEnhancement(
    imageData: string,
    scaleFactor: number,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    if (!this.desktopServiceAvailable) {
      throw new Error('Desktop service not available for AI enhancement');
    }
    
    const sessionId = Date.now().toString() + '_ai';
    
    try {
      console.log(`🤖 Starting AI-enhanced processing: ${scaleFactor}x`);
      
      const requestData = {
        sessionId: sessionId,
        imageData: imageData,
        scaleFactor: scaleFactor,
        format: 'png',
        quality: 95,
        aiPreferences: {
          fidelity: 0.05  // Optimized parameter
        }
      };
      
      const response = await fetch(`${this.desktopServiceUrl}/api/process-with-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`AI processing request failed: ${response.statusText}`);
      }
      
      return this.monitorProcessing(sessionId, onProgress);
      
    } catch (error) {
      console.error('❌ AI enhancement request failed:', error);
      throw error;
    }
  }

  async processStandard(
    imageData: string,
    scaleFactor: number,
    format: string = 'png',
    quality: number = 95,
    customFilename?: string,
    customLocation?: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    if (!this.isAvailable) {
      throw new Error('Pro Processing Engine not available');
    }

    const sessionId = Date.now().toString();

    if (this.desktopServiceAvailable) {
      // Use desktop service
      const response = await fetch(`${this.desktopServiceUrl}/api/process-large`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          imageData: imageData,
          scaleFactor: scaleFactor,
          format: format,
          quality: quality,
          customFilename: customFilename,
          customLocation: customLocation
        })
      });
      
      if (!response.ok) {
        throw new Error(`Desktop service request failed: ${response.statusText}`);
      }
      
      const { sessionId: processingSessionId } = await response.json();
      return this.monitorProcessing(processingSessionId, onProgress);
    } else {
      // Fallback to web service (if available)
      throw new Error('Web service processing not implemented in React version');
    }
  }

  private async monitorProcessing(
    sessionId: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${this.desktopServiceUrl}/api/progress/${sessionId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const progress = JSON.parse(event.data) as ProcessingProgress;
          
          // Handle AI-specific progress updates
          if (progress.stage === 'ai-complete') {
            console.log(`🤖 AI face enhancement completed in ${progress.aiTime}ms`);
          } else if (progress.stage === 'scaling-complete') {
            console.log(`⚡ Sharp scaling completed`);
          }
          
          // Call progress callback
          if (onProgress) {
            onProgress(progress);
          }
          
          if (progress.status === 'complete') {
            eventSource.close();
            resolve({
              sessionId,
              status: 'complete',
              aiEnhanced: progress.aiEnhancementApplied || false,
              message: 'Processing completed successfully',
              result: progress.result
            });
          } else if (progress.status === 'error') {
            eventSource.close();
            reject(new Error(progress.message || 'Processing failed'));
          }
        } catch (parseError) {
          console.error('❌ Progress parsing error:', parseError);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        reject(new Error('Connection to processing service lost'));
      };
      
      // Timeout after 10 minutes
      setTimeout(() => {
        eventSource.close();
        reject(new Error('Processing timeout'));
      }, 10 * 60 * 1000);
    });
  }

  getServiceInfo() {
    return {
      isAvailable: this.isAvailable,
      desktopServiceAvailable: this.desktopServiceAvailable,
      capabilities: this.capabilities,
      activeService: this.desktopServiceAvailable ? 'desktop' : 'web',
      aiEnhancementAvailable: this.desktopServiceAvailable
    };
  }
} 