class ProEngineInterface {
    constructor() {
        this.webEngineUrl = 'http://localhost:3002';
        
        // Detect current port and set appropriate desktop service URL
        const currentPort = window.location.port;
        if (currentPort === '3002') {
            // Running on Pro Upscaler Server - use forwarding endpoints
            this.desktopServiceUrl = 'http://localhost:3002';
            console.log('🔧 Using Pro Upscaler Server AI forwarding (port 3002)');
        } else {
            // Running on client server - use direct desktop service
            this.desktopServiceUrl = 'http://localhost:3006';
            console.log('🔧 Using direct Desktop Service connection (port 3006)');
        }
        
        this.isAvailable = false;
        this.desktopServiceAvailable = false;
        this.capabilities = null;
        this.checkAvailability();
    }
    
    async checkAvailability() {
        // Set checking state in UI
        if (window.app && window.app.setProStatusChecking) {
            window.app.setProStatusChecking();
        }
        
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
        
        // Update UI with final status
        if (window.app && window.app.updateProStatus) {
            window.app.updateProStatus();
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
            // Get custom filename and location from UI
            const customFilename = window.app ? window.app.getCustomFilenameForAPI() : null;
            const customLocation = window.app ? window.app.getCustomLocationForAPI() : null;
            
            // Send processing request to desktop service
            const response = await fetch(`${this.desktopServiceUrl}/api/process-large`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId || Date.now().toString(),
                    imageData: result.dataUrl,
                    scaleFactor: result.scaleFactor || 2,
                    format: result.format || 'png',
                    quality: result.quality || 95,
                    customFilename: customFilename,
                    customLocation: customLocation
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
                        
                        // CRITICAL FIX: Trigger canvas display with AI enhanced results
                        const wasAiEnhanced = progress.aiEnhanced || false;
                        console.log(`🎯 Processing complete, triggering canvas display (AI Enhanced: ${wasAiEnhanced})`);
                        this.displayEnhancedInCanvas(sessionId, wasAiEnhanced);
                        
                        resolve({
                            sessionId,
                            status: 'complete',
                            message: 'Processing completed successfully',
                            aiEnhanced: wasAiEnhanced
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
        console.log('🎯 Desktop processing complete for session:', sessionId);
        
        // Update UI to show completion
        if (window.app && window.app.updateProgress) {
            window.app.updateProgress(100, 'File saved to Downloads/ProUpscaler folder');
        }
        
        // Note: Manual download button in modal - no automatic download to avoid session cleanup issues
        
        // Show completion modal instead of using the main app's modal system
        this.showCompletionModal(sessionId);
        
        // Update UI state to complete
        if (window.app && window.app.updateUIState) {
            window.app.updateUIState('complete');
        }
    }
    
    showCompletionModal(sessionId) {
        console.log('🎯 Showing completion in canvas area for session:', sessionId);
        
        // Instead of full-screen modal, show completion in canvas area
        if (window.app) {
            window.app.showNotification('Processing complete! File saved to Downloads/ProUpscaler/', 'success');
            // Use the existing results overlay instead of creating a new modal
            return;
        }
        
        // Fallback: Create a proper modal for desktop service completion (disabled for better UX)
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 hidden';
        modal.innerHTML = `
            <div class="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4">
                <div class="text-center">
                    <h2 class="text-xl font-semibold mb-2">Processing Complete!</h2>
                    <p class="text-muted-foreground">Your image has been processed and is downloading to your browser.</p>
                </div>
                
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <strong>✅ Complete:</strong> File saved to Downloads/ProUpscaler/<br>
                    <strong>📥 Download:</strong> Also downloading to browser<br>
                    <strong>💡 Note:</strong> Large images may take a moment to download
                </div>
                
                <div class="flex space-x-3">
                    <button class="btn-primary flex-1" onclick="
                        const link = document.createElement('a');
                        link.href = 'http://localhost:3007/api/download/${sessionId}';
                        link.download = '';
                        link.click();
                        setTimeout(() => this.parentElement.parentElement.parentElement.remove(), 1000);
                    ">
                        Download to Browser
                    </button>
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove(); if(window.app) window.app.openDownloadsFolder()">
                        Open Local Folder
                    </button>
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove(); if(window.app) window.app.resetToUpload()">
                        Process Another
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log('✅ Completion modal added to DOM');
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 10000);
    }
    
    async triggerBrowserDownload(sessionId) {
        try {
            console.log(`🌐 Triggering browser download for session: ${sessionId}`);
            
            // Create download URL
            const downloadUrl = `${this.desktopServiceUrl}/api/download/${sessionId}`;
            
            // Method 1: Try using fetch with blob download (shows in browser downloads)
            try {
                const response = await fetch(downloadUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    const filename = this.extractFilenameFromResponse(response) || `upscaled-${sessionId}.jpg`;
                    
                    // Create download link with blob URL
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = filename;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Clean up blob URL
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                    
                    console.log(`✅ Browser download triggered successfully: ${filename}`);
                    return;
                }
            } catch (fetchError) {
                console.warn('Fetch download method failed, trying direct link method:', fetchError);
            }
            
            // Method 2: Fallback to direct link (simpler but may not show progress)
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ Browser download triggered successfully (direct link method)');
            
        } catch (error) {
            console.error('❌ Failed to trigger browser download:', error);
            // Fallback notification
            if (window.app && window.app.showNotification) {
                window.app.showNotification(
                    'File saved locally. Check Downloads/ProUpscaler folder.',
                    'info'
                );
            }
        }
    }
    
    extractFilenameFromResponse(response) {
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                return filenameMatch[1];
            }
        }
        return null;
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
            // Popup notification removed for better UX and sidebar space utilization
        } else {
            console.log('Web service ready');
            // Popup notification removed for better UX and sidebar space utilization
        }
        
        // Update Pro status in header
        if (window.app && window.app.updateProStatus) {
            window.app.updateProStatus();
        }
    }
    
    // AI-enhanced processing method
    async processWithAIEnhancement(imageData, scaleFactor, aiPreferences = {}) {
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
                aiPreferences: aiPreferences
            };
            
            // Get user token for authorization
            const token = await this.getUserToken();
            console.log('🔐 Token for AI request:', token ? 'Present (length: ' + token.length + ')' : 'Missing');
            
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('✅ Authorization header added');
            } else {
                console.warn('⚠️ No token available - request will likely fail');
            }
            
            const response = await fetch(`${this.desktopServiceUrl}/api/process-with-ai`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`AI processing request failed: ${response.statusText}`);
            }
            
            return this.monitorAIProcessing(sessionId);
            
        } catch (error) {
            console.error('❌ AI enhancement request failed:', error);
            throw error;
        }
    }

    async displayEnhancedInCanvas(sessionId, wasAiEnhanced = false) {
        try {
            const previewImageUrl = `${this.desktopServiceUrl}/api/enhanced-preview/${sessionId}`;
            console.log(`🖼️ Loading ${wasAiEnhanced ? 'AI-enhanced' : 'upscaled'} image for canvas display: ${previewImageUrl}`);
            
            const processedImg = new Image();
            processedImg.onload = async () => {
                console.log(`✅ ${wasAiEnhanced ? 'AI-enhanced' : 'Upscaled'} image loaded: ${processedImg.width}×${processedImg.height}`);
                await this.createSideBySideComparison(processedImg, wasAiEnhanced);
            };
            
            processedImg.onerror = (error) => {
                console.error(`❌ Failed to load ${wasAiEnhanced ? 'AI-enhanced' : 'upscaled'} image:`, error);
                console.error('Error details:', error);
                
                // Try alternative approach - check if session data is available
                this.handlePreviewLoadFailure(sessionId, wasAiEnhanced);
            };
            
            processedImg.src = previewImageUrl;
            
        } catch (error) {
            console.error('❌ Error displaying processed image in canvas:', error);
        }
    }

    handlePreviewLoadFailure(sessionId, wasAiEnhanced) {
        console.log(`⚠️ Preview load failed for session ${sessionId}, showing completion message`);
        
        // Show completion message in canvas area
        const resultContainer = document.querySelector('.main-content-area') || document.body;
        if (resultContainer) {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                padding: 20px;
                text-align: center;
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                border-radius: 10px;
                margin: 10px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            `;
            messageDiv.innerHTML = `
                <h3>✅ ${wasAiEnhanced ? 'AI-Enhanced' : 'High-Quality'} Processing Complete!</h3>
                <p>Your ${wasAiEnhanced ? 'AI-enhanced' : 'upscaled'} image has been saved to Downloads/ProUpscaler/</p>
                <p>Preview loading failed, but the file was processed successfully.</p>
            `;
            
            // Clear container and add message
            resultContainer.innerHTML = '';
            resultContainer.appendChild(messageDiv);
        }
    }

    async createSideBySideComparison(processedImg, wasAiEnhanced = false) {
        try {
            // Dynamically import ImagePresentationManager
            const { ImagePresentationManager } = await import('./image-presentation-manager.js');
            console.log('✅ ImagePresentationManager imported successfully');
            
            // Get original image from app state
            const originalImg = new Image();
            originalImg.onload = () => {
                console.log(`📊 Creating side-by-side comparison: Original ${originalImg.width}×${originalImg.height}, Processed ${processedImg.width}×${processedImg.height}`);
                
                const presentationManager = new ImagePresentationManager();
                const resultContainer = document.querySelector('.main-content-area') || document.body;
                
                if (!resultContainer) {
                    console.error('❌ Main content area not found');
                    return;
                }
                
                console.log(`✅ Using main content area for ${wasAiEnhanced ? 'AI-enhanced' : 'upscaled'} comparison display`);
                
                presentationManager.presentSideBySideComparison({
                    originalImage: originalImg,
                    enhancedImage: processedImg,
                    originalDimensions: { 
                        width: originalImg.width, 
                        height: originalImg.height 
                    },
                    enhancedDimensions: { 
                        width: processedImg.width, 
                        height: processedImg.height 
                    },
                    aiEnhanced: wasAiEnhanced
                }, resultContainer);
            };
            
            originalImg.onerror = (error) => {
                console.error('❌ Failed to load original image for comparison:', error);
            };
            
            // Use stored original image from app
            if (window.app && window.app.currentImage && window.app.currentImage.dataUrl) {
                originalImg.src = window.app.currentImage.dataUrl;
            } else {
                console.warn('⚠️ Original image not available in app state');
            }
            
        } catch (error) {
            console.error('❌ Error creating side-by-side comparison:', error);
            console.error('❌ Failed to import ImagePresentationManager:', error);
        }
    }

    async monitorAIProcessing(sessionId) {
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(`${this.desktopServiceUrl}/api/progress/${sessionId}`);
            
            eventSource.onmessage = (event) => {
                try {
                    const progress = JSON.parse(event.data);
                    
                    // Handle AI-specific progress updates
                    if (progress.stage === 'ai-complete') {
                        console.log(`🤖 AI face enhancement completed in ${progress.aiTime}ms`);
                        // Note: Canvas display will happen when entire process is complete
                    } else if (progress.stage === 'scaling-complete') {
                        console.log(`⚡ Sharp scaling completed`);
                    }
                    
                    // Update UI with AI-specific progress and detailed information
                    if (window.app && window.app.updateProgress) {
                        window.app.updateProgress(progress.progress, progress.message, {
                            step: progress.step,
                            totalSteps: progress.totalSteps,
                            currentScale: progress.currentScale,
                            processingRate: progress.processingRate,
                            memoryMB: progress.memoryMB,
                            stage: progress.stage
                        });
                    }
                    
                    if (progress.status === 'complete') {
                        eventSource.close();
                        
                        // Check if AI enhancement was actually applied
                        const wasAiEnhanced = progress.aiEnhanced || false;
                        
                        // Display processed image in canvas after entire process is complete
                        console.log(`🎨 Processing complete - displaying ${wasAiEnhanced ? 'AI-enhanced' : 'upscaled'} image in canvas`);
                        this.displayEnhancedInCanvas(sessionId, wasAiEnhanced);
                        
                        this.showDesktopProcessingComplete(sessionId);
                        resolve({
                            sessionId,
                            status: 'complete',
                            aiEnhanced: wasAiEnhanced,
                            message: wasAiEnhanced ? 'AI-enhanced processing completed successfully' : 'High-quality upscaling completed successfully'
                        });
                    } else if (progress.status === 'error') {
                        eventSource.close();
                        reject(new Error(progress.message || 'AI processing failed'));
                    }
                } catch (parseError) {
                    console.error('❌ Progress parsing error:', parseError);
                }
            };
            
            eventSource.onerror = (error) => {
                console.error('EventSource error:', error);
                eventSource.close();
                reject(new Error('Connection to AI processing service lost'));
            };
            
            // Timeout after 5 minutes for AI processing
            setTimeout(() => {
                eventSource.close();
                reject(new Error('AI processing timeout'));
            }, 5 * 60 * 1000);
        });
    }

    // Update existing processWithDesktopService method to support AI
    async processWithDesktopServiceAI(result, sessionId, options = {}) {
        if (options.aiEnhancement) {
            return this.processWithAIEnhancement(result.dataUrl, result.scaleFactor || 2, options.aiPreferences);
        } else {
            // Use existing standard processing
            return this.processWithDesktopService(result, sessionId);
        }
    }

    async getUserToken() {
        try {
            console.log('🔍 Getting user token...');
            console.log('window.authService exists:', !!window.authService);
            console.log('window.authService.supabase exists:', !!(window.authService && window.authService.supabase));
            
            if (window.authService && window.authService.supabase) {
                const { data: { session } } = await window.authService.supabase.auth.getSession();
                console.log('Session exists:', !!session);
                console.log('Session user:', session?.user?.email);
                console.log('Access token exists:', !!session?.access_token);
                
                if (session?.access_token) {
                    console.log('✅ Token retrieved successfully');
                    return session.access_token;
                } else {
                    console.warn('⚠️ No access token in session');
                    return null;
                }
            }
            console.warn('⚠️ Auth service or Supabase not available');
            return null;
        } catch (error) {
            console.error('Failed to get user token:', error);
            return null;
        }
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
