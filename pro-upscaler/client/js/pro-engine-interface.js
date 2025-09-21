class ProEngineInterface {
    constructor() {
        this.webEngineUrl = 'http://localhost:3002';
        this.desktopServiceUrl = 'http://localhost:3006';
        this.isAvailable = false;
        this.desktopServiceAvailable = false;
        this.capabilities = null;
        this.checkAvailability();
    }
    
    async checkAvailability() {
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
                this.notifyEngineReady();
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
                this.notifyEngineReady();
            }
        } catch (error) {
            this.isAvailable = false;
            console.log('ℹ️ No Pro Processing services available');
        }
        
        return this.isAvailable;
    }
    
    async downloadLargeFile(result, sessionId) {
        if (!this.isAvailable) {
            throw new Error('Pro Processing Engine not available');
        }
        
        // Use desktop service if available
        if (this.desktopServiceAvailable) {
            return this.processWithDesktopService(result, sessionId);
        }
        
        // Fall back to web service
        return this.downloadWithWebService(result);
    }
    
    async processWithDesktopService(result, sessionId) {
        try {
            // Send processing request to desktop service
            const response = await fetch(`${this.desktopServiceUrl}/api/process-large`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId || Date.now().toString(),
                    imageData: result.dataUrl,
                    scaleFactor: result.scaleFactor || 2,
                    format: result.format || 'png',
                    quality: result.quality || 95
                })
            });
            
            if (!response.ok) {
                throw new Error(`Desktop service request failed: ${response.statusText}`);
            }
            
            const { sessionId: processingSessionId } = await response.json();
            
            // Monitor progress via Server-Sent Events
            return this.monitorDesktopProcessing(processingSessionId);
            
        } catch (error) {
            console.error('Desktop service processing error:', error);
            throw error;
        }
    }
    
    async monitorDesktopProcessing(sessionId) {
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(`${this.desktopServiceUrl}/api/progress/${sessionId}`);
            
            eventSource.onmessage = (event) => {
                try {
                    const progress = JSON.parse(event.data);
                    
                    // Update progress in UI if callback available
                    if (window.app && window.app.updateProgress) {
                        window.app.updateProgress(progress.progress, progress.message);
                    }
                    
                    if (progress.status === 'complete') {
                        eventSource.close();
                        this.showDesktopProcessingComplete(sessionId);
                        resolve({
                            sessionId,
                            status: 'complete',
                            message: 'Processing completed successfully'
                        });
                    } else if (progress.status === 'error') {
                        eventSource.close();
                        reject(new Error(progress.message || 'Desktop processing failed'));
                    }
                } catch (error) {
                    console.error('Progress parsing error:', error);
                }
            };
            
            eventSource.onerror = (error) => {
                console.error('EventSource error:', error);
                eventSource.close();
                reject(new Error('Connection to desktop service lost'));
            };
            
            // Timeout after 10 minutes
            setTimeout(() => {
                eventSource.close();
                reject(new Error('Desktop processing timeout'));
            }, 10 * 60 * 1000);
        });
    }
    
    showDesktopProcessingComplete(sessionId) {
        // Update UI to show completion
        if (window.app && window.app.updateProgress) {
            window.app.updateProgress(100, 'File saved to Downloads/ProUpscaler folder');
        }
        
        // Show comprehensive completion notification with file location guidance
        if (window.app && window.app.showNotification) {
            window.app.showNotification(
                '✅ Processing complete! Your upscaled image has been saved to Downloads/ProUpscaler folder. The file is too large to display in the browser - please check your Downloads folder to view it.',
                'success'
            );
        }
        
        // Update UI state to complete
        if (window.app && window.app.updateUIState) {
            window.app.updateUIState('complete');
        }
    }
    
    async downloadWithWebService(result) {
        try {
            const response = await fetch(`${this.webEngineUrl}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: result.dataUrl,
                    filename: `upscaled-${Date.now()}.${result.format}`,
                    format: result.format,
                    size: result.size
                })
            });
            
            if (!response.ok) {
                throw new Error(`Pro Engine download failed: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Pro Engine download error:', error);
            throw error;
        }
    }
    
    notifyEngineReady() {
        if (this.desktopServiceAvailable) {
            const category = this.capabilities?.expectedPerformance?.category || 'standard-performance';
            const estimatedTime = this.capabilities?.expectedPerformance?.estimatedTimeFor600MP || 5000;
            
            console.log(`Desktop service ready - ${category} (${estimatedTime}ms estimated for 600MP)`);
            
            if (window.app && window.app.showNotification) {
                window.app.showNotification(
                    `⚡ Pro Engine ready! Estimated processing time: ${Math.round(estimatedTime/1000)}s for large files.`,
                    'success'
                );
            }
        } else if (window.app) {
            window.app.showNotification('⚡ Pro Engine ready!', 'success');
        }
        
        // Update Pro status in header
        if (window.app && window.app.updateProStatus) {
            window.app.updateProStatus();
        }
    }
    
    getServiceInfo() {
        return {
            isAvailable: this.isAvailable,
            desktopServiceAvailable: this.desktopServiceAvailable,
            capabilities: this.capabilities,
            activeService: this.desktopServiceAvailable ? 'desktop' : 'web'
        };
    }
}
