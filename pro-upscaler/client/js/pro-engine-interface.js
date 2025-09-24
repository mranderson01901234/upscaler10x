class ProEngineInterface {
    constructor() {
        this.webEngineUrl = 'http://localhost:3002';
        
        // Always use direct desktop service connection for processing
        // The Pro Upscaler Server on port 3002 is only for web serving and auth
        // All image processing should go directly to Desktop Service on port 3007
        this.desktopServiceUrl = 'http://localhost:3007';
        console.log('🔧 Using direct Desktop Service connection (port 3007)');
        
        this.isAvailable = false;
        this.desktopServiceAvailable = false;
        this.capabilities = null;
        this.checkAvailability();
    }
    
    async checkAvailability() {
        // Avoid redundant checks if already verified recently
        const now = Date.now();
        if (this.lastAvailabilityCheck && (now - this.lastAvailabilityCheck) < 10000) {
            console.log('🔄 Skipping redundant availability check (recent check)');
            return this.isAvailable;
        }
        
        // Set checking state in UI
        if (window.app && window.app.setProStatusChecking) {
            window.app.setProStatusChecking();
        }
        
        // Update premium header status
        if (window.app) {
            window.app.setProEngineStatus('checking', 'Checking Pro Engine...');
        }
        
        this.lastAvailabilityCheck = now;
        
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
                
                // Update premium header status
                if (window.app) {
                    window.app.setProEngineStatus('online', 'Pro Engine Ready');
                }
                
                return this.isAvailable;
            }
        } catch (error) {
            this.desktopServiceAvailable = false;
            console.log('ℹ️ Desktop service not available, checking web service...');
            
            // Update premium header status
            if (window.app) {
                window.app.setProEngineStatus('offline', 'Pro Engine Offline');
            }
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
    
    async downloadLargeFile(result, sessionId, aiEnhancement = false) {
        if (!this.isAvailable) {
            throw new Error('Pro Processing Engine not available');
        }
        
        // Use desktop service if available
        if (this.desktopServiceAvailable) {
            return this.processWithDesktopService(result, sessionId, aiEnhancement);
        }
        
        // Fall back to web service
        return this.downloadWithWebService(result);
    }
    
    async processWithDesktopService(result, sessionId, aiEnhancement = false) {
        try {
            // Get custom filename and location from UI
            const customFilename = window.app ? window.app.getCustomFilenameForAPI() : null;
            const customLocation = window.app ? window.app.getCustomLocationForAPI() : null;
            
            // Choose the correct endpoint based on AI enhancement
            const endpoint = aiEnhancement ? '/api/process-with-ai' : '/api/process-large';
            
            console.log(`🔧 Using desktop service endpoint: ${endpoint} (AI: ${aiEnhancement})`);
            
            // Prepare headers
            const headers = { 'Content-Type': 'application/json' };
            
            // Add authorization header if AI enhancement is requested
            if (aiEnhancement) {
                const token = localStorage.getItem('auth_token');
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                    console.log('✅ Authorization header added for AI processing');
                } else {
                    console.warn('⚠️ No token available for AI processing - using development fallback');
                }
            }
            
            // Prepare request body
            const requestBody = {
                sessionId: sessionId || Date.now().toString(),
                imageData: result.dataUrl,
                scaleFactor: result.scaleFactor || 2,
                format: result.format || 'png',
                quality: result.quality || 95,
                customFilename: customFilename,
                customLocation: customLocation
            };
            
            // Add AI-specific parameters if needed
            if (aiEnhancement) {
                requestBody.aiPreferences = {
                    fidelity: 0.05  // Optimized parameter from testing
                };
                requestBody.outputPreferences = {
                    outputFormat: result.format || 'png',
                    quality: result.quality || 95
                };
            }
            
            // Send processing request to desktop service
            const response = await fetch(`${this.desktopServiceUrl}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
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
    
    async getSessionResult(sessionId) {
        try {
            const response = await fetch(`${this.desktopServiceUrl}/api/session-result/${sessionId}`);
            if (!response.ok) {
                throw new Error(`Failed to get session result: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Error getting session result:', error);
            return null;
        }
    }
    
    async monitorDesktopProcessing(sessionId) {
        return new Promise((resolve, reject) => {
            // Firefox compatibility: Add more robust EventSource handling
            let eventSource;
            
            try {
                eventSource = new EventSource(`${this.desktopServiceUrl}/api/progress/${sessionId}`);
                console.log('✅ EventSource created for session:', sessionId);
            } catch (error) {
                console.error('❌ EventSource creation failed:', error);
                // Fallback to polling for Firefox compatibility
                return this.fallbackPollingMonitor(sessionId, resolve, reject);
            }
            
            let progressUpdateCount = 0;
            let lastProgressTime = Date.now();
            
            eventSource.onmessage = (event) => {
                try {
                    progressUpdateCount++;
                    lastProgressTime = Date.now();
                    
                    const progress = JSON.parse(event.data);
                    console.log(`📊 Progress update #${progressUpdateCount}:`, progress);
                    
                    // Update progress in UI if callback available
                    if (window.app && window.app.updateProgress) {
                        window.app.updateProgress(progress.progress, progress.message);
                    }
                    
                    if (progress.status === 'complete') {
                        eventSource.close();
                        this.showDesktopProcessingComplete(sessionId);
                        
                        // CRITICAL FIX: Get the actual result data from the server
                        const wasAiEnhanced = progress.aiEnhanced || false;
                        console.log(`🎯 Processing complete, getting session result data (AI Enhanced: ${wasAiEnhanced})`);
                        
                                                 // Get the session result data
                         this.getSessionResult(sessionId).then(sessionResult => {
                             console.log(`📊 Session result data:`, sessionResult);
                             
                             // Display immediately without artificial delay
                             this.displayEnhancedInCanvas(sessionId, wasAiEnhanced);
                             
                             resolve({
                                 sessionId,
                                 status: 'complete',
                                 message: 'Processing completed successfully',
                                 aiEnhanced: wasAiEnhanced,
                                 width: sessionResult?.dimensions?.width,
                                 height: sessionResult?.dimensions?.height,
                                 dataUrl: `${this.desktopServiceUrl}/api/enhanced-preview/${sessionId}`,
                                 filename: sessionResult?.filename,
                                 fileSize: sessionResult?.fileSize,
                                 processingTime: sessionResult?.processingTime
                             });
                         }).catch(error => {
                             console.error('❌ Failed to get session result:', error);
                             resolve({
                                 sessionId,
                                 status: 'complete',
                                 message: 'Processing completed successfully',
                                 aiEnhanced: wasAiEnhanced,
                                 dataUrl: `${this.desktopServiceUrl}/api/enhanced-preview/${sessionId}`
                             });
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
                
                // Firefox fallback: Try polling if EventSource fails
                if (progressUpdateCount === 0) {
                    console.log('🔄 EventSource failed, switching to polling fallback for Firefox compatibility');
                    this.fallbackPollingMonitor(sessionId, resolve, reject);
                } else {
                    reject(new Error('Connection to desktop service lost'));
                }
            };
            
            // Enhanced timeout with activity check
            setTimeout(() => {
                const timeSinceLastProgress = Date.now() - lastProgressTime;
                if (timeSinceLastProgress > 60000) { // 1 minute without progress
                    console.warn('⚠️ No progress updates for 1 minute, assuming completion');
                    eventSource.close();
                    // Assume completion and try to display result
                    this.displayEnhancedInCanvas(sessionId, true); // Assume AI enhanced
                    resolve({
                        sessionId,
                        status: 'complete',
                        message: 'Processing completed (timeout fallback)',
                        aiEnhanced: true
                    });
                } else {
                    eventSource.close();
                    reject(new Error('Desktop processing timeout'));
                }
            }, 10 * 60 * 1000);
        });
    }
    
    /**
     * Fallback polling monitor for browsers with EventSource issues
     */
    async fallbackPollingMonitor(sessionId, resolve, reject) {
        console.log('🔄 Using polling fallback for session:', sessionId);
        
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes with 5-second intervals
        
        const pollProgress = async () => {
            try {
                attempts++;
                const response = await fetch(`${this.desktopServiceUrl}/api/progress-status/${sessionId}`, {
                    method: 'GET',
                    cache: 'no-cache'
                });
                
                if (response.ok) {
                    const progress = await response.json();
                    console.log(`📊 Polling progress (${attempts}/${maxAttempts}):`, progress);
                    
                    // Update progress in UI
                    if (window.app && window.app.updateProgress) {
                        window.app.updateProgress(progress.progress, progress.message);
                    }
                    
                    if (progress.status === 'complete') {
                        const wasAiEnhanced = progress.aiEnhanced || false;
                        this.showDesktopProcessingComplete(sessionId);
                        this.displayEnhancedInCanvas(sessionId, wasAiEnhanced);
                        
                        resolve({
                            sessionId,
                            status: 'complete',
                            message: 'Processing completed successfully (polling)',
                            aiEnhanced: wasAiEnhanced
                        });
                        return;
                    } else if (progress.status === 'error') {
                        reject(new Error(progress.message || 'Desktop processing failed'));
                        return;
                    }
                }
                
                // Continue polling if not complete
                if (attempts < maxAttempts) {
                    setTimeout(pollProgress, 5000); // Poll every 5 seconds
                } else {
                    // Timeout - assume completion
                    console.warn('⚠️ Polling timeout, assuming completion');
                    this.displayEnhancedInCanvas(sessionId, true);
                    resolve({
                        sessionId,
                        status: 'complete',
                        message: 'Processing completed (polling timeout)',
                        aiEnhanced: true
                    });
                }
                
            } catch (error) {
                console.error('Polling error:', error);
                if (attempts < maxAttempts) {
                    setTimeout(pollProgress, 5000); // Retry
                } else {
                    reject(new Error('Polling monitor failed'));
                }
            }
        };
        
        // Start polling
        pollProgress();
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
        if (window.app && window.app.updateProEngineStatus) {
            window.app.updateProEngineStatus();
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
            
            // Try multiple approaches for better browser compatibility
            const success = await this.tryMultipleImageLoadMethods(previewImageUrl, sessionId, wasAiEnhanced);
            
            if (!success) {
                console.log('⚠️ All image loading methods failed, showing completion message');
                this.handlePreviewLoadFailure(sessionId, wasAiEnhanced);
            }
            
        } catch (error) {
            console.error('❌ Error displaying processed image in canvas:', error);
            this.handlePreviewLoadFailure(sessionId, wasAiEnhanced);
        }
    }
    
    async tryMultipleImageLoadMethods(previewImageUrl, sessionId, wasAiEnhanced) {
        // Method 1: Standard Image loading with enhanced Firefox compatibility
        try {
            console.log('🔄 Trying Method 1: Standard image loading with Firefox compatibility...');
            const processedImg = new Image();
            
            // Firefox compatibility: Set CORS before src
            processedImg.crossOrigin = 'anonymous';
            
            const loadPromise = new Promise((resolve, reject) => {
                processedImg.onload = () => {
                    console.log('✅ Image loaded successfully');
                    resolve(processedImg);
                };
                
                processedImg.onerror = (error) => {
                    console.log('❌ Image load failed:', error);
                    reject(error);
                };
                
                // Firefox: Longer timeout for slower loading
                setTimeout(() => {
                    console.log('❌ Image load timeout');
                    reject(new Error('Image load timeout'));
                }, 15000); // Increased from 10s to 15s for Firefox
            });
            
            // Add cache-busting parameter for Firefox
            const cacheBustUrl = `${previewImageUrl}?t=${Date.now()}&browser=firefox`;
            processedImg.src = cacheBustUrl;
            
            const img = await loadPromise;
            
            console.log(`✅ Method 1 success: ${wasAiEnhanced ? 'AI-enhanced' : 'Upscaled'} image loaded: ${img.width}×${img.height}`);
            await this.createSideBySideComparison(img, wasAiEnhanced);
            return true;
            
        } catch (error) {
            console.log('❌ Method 1 failed:', error.message);
        }
        
        // Method 2: Fetch with blob conversion (Enhanced for Firefox)
        try {
            console.log('🔄 Trying Method 2: Fetch with blob conversion (Firefox enhanced)...');
            
            // Firefox-specific fetch options
            const fetchOptions = {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'omit', // Firefox CORS compatibility
                headers: {
                    'Accept': 'image/*',
                    'User-Agent': navigator.userAgent
                }
            };
            
            const response = await fetch(previewImageUrl, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            console.log('✅ Blob created, size:', blob.size);
            
            // Firefox compatibility: Check blob type
            if (!blob.type.startsWith('image/')) {
                console.warn('⚠️ Blob type not recognized as image:', blob.type);
            }
            
            const objectUrl = URL.createObjectURL(blob);
            console.log('✅ Object URL created');
            
            const processedImg = new Image();
            const loadPromise = new Promise((resolve, reject) => {
                processedImg.onload = () => {
                    URL.revokeObjectURL(objectUrl);
                    console.log('✅ Blob image loaded successfully');
                    resolve(processedImg);
                };
                processedImg.onerror = (error) => {
                    URL.revokeObjectURL(objectUrl);
                    reject(error);
                };
                setTimeout(() => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('Blob image load timeout'));
                }, 10000);
            });
            
            processedImg.src = objectUrl;
            const img = await loadPromise;
            
            console.log(`✅ Method 2 success: ${wasAiEnhanced ? 'AI-enhanced' : 'Upscaled'} image loaded: ${img.width}×${img.height}`);
            await this.createSideBySideComparison(img, wasAiEnhanced);
            return true;
            
        } catch (error) {
            console.log('❌ Method 2 failed:', error.message);
        }
        
        // Method 3: Canvas-based loading (Firefox fallback)
        try {
            console.log('🔄 Trying Method 3: Canvas-based approach (Firefox fallback)...');
            await this.createCanvasFromUrl(previewImageUrl, wasAiEnhanced);
            return true;
            
        } catch (error) {
            console.log('❌ Method 3 failed:', error.message);
        }
        
        // Method 4: Firefox-specific fallback with data URL conversion
        try {
            console.log('🔄 Trying Method 4: Firefox data URL fallback...');
            const response = await fetch(previewImageUrl, {
                method: 'GET',
                mode: 'no-cors' // Firefox fallback
            });
            
            if (response.ok) {
                // Try to display using the enterprise layout fallback
                await this.displayEnhancedImageOnly(null, wasAiEnhanced);
                console.log('✅ Method 4: Fallback display completed');
                return true;
            }
            
        } catch (error) {
            console.log('❌ Method 4 failed:', error.message);
        }
        
        return false;
    }
    
    async createCanvasFromUrl(imageUrl, wasAiEnhanced) {
        // Create a canvas-based approach for better compatibility
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create a temporary image to get dimensions
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        
        return new Promise((resolve, reject) => {
            tempImg.onload = async () => {
                canvas.width = tempImg.width;
                canvas.height = tempImg.height;
                ctx.drawImage(tempImg, 0, 0);
                
                console.log(`✅ Canvas method success: ${wasAiEnhanced ? 'AI-enhanced' : 'Upscaled'} image: ${canvas.width}×${canvas.height}`);
                
                // Create an image from the canvas for the comparison
                const canvasImg = new Image();
                canvasImg.onload = async () => {
                    await this.createSideBySideComparison(canvasImg, wasAiEnhanced);
                    resolve();
                };
                canvasImg.src = canvas.toDataURL();
            };
            
            tempImg.onerror = reject;
            tempImg.src = imageUrl;
            
            setTimeout(() => reject(new Error('Canvas load timeout')), 5000);
        });
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
            originalImg.onload = async () => {
                console.log(`📊 Creating side-by-side comparison: Original ${originalImg.width}×${originalImg.height}, Processed ${processedImg.width}×${processedImg.height}`);
                
                const presentationManager = new ImagePresentationManager();
                const resultContainer = document.querySelector('.main-content-area') || document.body;
                
                if (!resultContainer) {
                    console.error('❌ Main content area not found');
                    return;
                }
                
                console.log(`✅ Using main content area for ${wasAiEnhanced ? 'AI-enhanced' : 'upscaled'} comparison display`);
                
                // Get the user's chosen scale factor from the UI
                const scaleFactorElement = document.getElementById('scale-factor');
                const userScaleFactor = scaleFactorElement ? parseInt(scaleFactorElement.value) : 10;
                
                // Calculate the final upscaled dimensions that the user expects
                const finalUpscaledDimensions = {
                    width: originalImg.width * userScaleFactor,
                    height: originalImg.height * userScaleFactor
                };
                
                console.log(`🎯 User scale factor: ${userScaleFactor}x, Final dimensions: ${finalUpscaledDimensions.width}×${finalUpscaledDimensions.height}`);
                
                await presentationManager.presentSideBySideComparison({
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
                    finalUpscaledDimensions: finalUpscaledDimensions,
                    userScaleFactor: userScaleFactor,
                    aiEnhanced: wasAiEnhanced
                }, resultContainer);
            };
            
            originalImg.onerror = (error) => {
                console.error('❌ Failed to load original image for comparison:', error);
            };
            
            // Use stored original image from multiple possible sources
            let originalImageFound = false;
            
            // Try app.presentationManager.originalImage first (most likely location)
            if (window.app?.presentationManager?.originalImage?.dataUrl) {
                originalImg.src = window.app.presentationManager.originalImage.dataUrl;
                console.log('✅ Using original image from presentationManager');
                originalImageFound = true;
            }
            // Fallback to app.currentImage
            else if (window.app?.currentImage?.dataUrl) {
                originalImg.src = window.app.currentImage.dataUrl;
                console.log('✅ Using original image from app.currentImage');
                originalImageFound = true;
            }
            // Last resort: try to get from DOM
            else {
                const originalPreview = document.querySelector('#original-container img');
                if (originalPreview && originalPreview.src) {
                    originalImg.src = originalPreview.src;
                    console.log('✅ Using original image from DOM');
                    originalImageFound = true;
                }
            }
            
            if (!originalImageFound) {
                console.warn('⚠️ Original image not available - trying to display enhanced image only');
                // Display enhanced image without comparison
                await this.displayEnhancedImageOnly(processedImg, wasAiEnhanced);
                return;
            }
            
        } catch (error) {
            console.error('❌ Error creating side-by-side comparison:', error);
            console.error('❌ Failed to import ImagePresentationManager:', error);
        }
    }

    /**
     * Display enhanced image only (fallback when original not available)
     */
    async displayEnhancedImageOnly(processedImg, wasAiEnhanced) {
        try {
            console.log('🖼️ Displaying enhanced image only (no comparison)');
            
            const enhancedContainer = document.getElementById('enhanced-container');
            if (!enhancedContainer) {
                console.warn('❌ Enhanced container not found');
                return;
            }
            
            // Clear existing content
            enhancedContainer.innerHTML = '';
            
            // Create enhanced image display
            const enhancedPreview = document.createElement('div');
            enhancedPreview.className = 'image-preview';
            enhancedPreview.id = 'enhanced-preview';
            
            const enhancedImg = document.createElement('img');
            enhancedImg.id = 'enhanced-image';
            enhancedImg.className = 'preview-image';
            enhancedImg.alt = 'Enhanced';
            enhancedImg.src = processedImg.src;
            
            // Add styling for proper display
            enhancedImg.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            
            enhancedPreview.appendChild(enhancedImg);
            enhancedContainer.appendChild(enhancedPreview);
            
            // Show enhanced container
            enhancedContainer.classList.remove('hidden');
            
            // Update panel info
            const enhancedInfo = document.getElementById('enhanced-info');
            if (enhancedInfo) {
                enhancedInfo.textContent = `${processedImg.width}×${processedImg.height} ${wasAiEnhanced ? '(AI Enhanced)' : '(Upscaled)'}`;
            }
            
            console.log(`✅ Enhanced image displayed: ${processedImg.width}×${processedImg.height} ${wasAiEnhanced ? '(AI Enhanced)' : ''}`);
            
            // Show success notification
            if (window.app?.presentationManager?.showNotification) {
                window.app.presentationManager.showNotification(
                    wasAiEnhanced ? 'AI Enhancement completed! Faces have been enhanced with CodeFormer.' : 'Upscaling completed successfully!',
                    'success'
                );
            }
            
        } catch (error) {
            console.error('❌ Error displaying enhanced image only:', error);
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
