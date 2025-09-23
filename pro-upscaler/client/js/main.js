class ProUpscalerApp {
    constructor() {
        this.currentState = 'idle'; // 'idle', 'ready', 'processing', 'complete'
        this.currentImage = null;
        this.processedResult = null;
        this.startTime = null;
        this.downloadAfterProcessing = false;
        this.browser = this.detectBrowser();
        
        this.initializeApp();
        this.bindEvents();
    }
    
    // Browser detection for sidebar optimizations
    detectBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isFirefox = userAgent.includes('firefox');
        const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
        const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
        const isEdge = userAgent.includes('edg');
        
        let browserType = 'unknown';
        if (isFirefox) browserType = 'firefox';
        else if (isChrome) browserType = 'chrome';
        else if (isSafari) browserType = 'safari';
        else if (isEdge) browserType = 'edge';
        
        console.log(`🌐 Browser detected: ${browserType}`);
        
        // Apply browser-specific CSS class to body
        document.body.classList.add(`browser-${browserType}`);
        
        return {
            type: browserType,
            isFirefox,
            isChrome,
            isSafari,
            isEdge
        };
    }

    
    initializeApp() {
        console.log('🚀 Pro Upscaler Starting...');
        
        this.fileHandler = new FileHandler();
        
        // Use Ultra-Fast Upscaler for better performance
        // Falls back to SimpleUpscaler if UltraFastUpscaler is not available
        try {
            this.upscaler = new UltraFastUpscaler({ qualityMode: 'speed' });
            console.log('✅ Using Ultra-Fast Upscaler');
        } catch (error) {
            console.warn('⚠️ Ultra-Fast Upscaler not available, using SimpleUpscaler');
            this.upscaler = new SimpleUpscaler();
        }
        
        this.proEngine = new ProEngineInterface();
        
        // Initialize file settings
        this.customDownloadLocation = null;
        
        // Initialize authentication
        this.authService = window.authService;
        this.proEngineDownloader = new window.ProEngineDownloader(this.authService);
        this.proEngineAvailable = false;
        this.initializeAuth();
        
        // Set initial checking state - delay slightly to ensure DOM is ready
        setTimeout(() => {
            this.setProStatusChecking();
        }, 100);
        this.updateUIState('idle');
    }
    
    async initializeAuth() {
        // Check if user is already signed in
        const user = await this.authService.getCurrentUser();
        if (user) {
            this.updateUIForSignedInUser(user);
            this.updateUsageDisplay();
            await this.checkProEngineAvailability();
        } else {
            this.updateUIForSignedOutUser();
        }

        // Set up auth event listeners
        this.setupAuthEventListeners();
    }
    
    bindEvents() {
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');
        const headerUploadBtn = document.getElementById('header-upload-btn');
        const headerFileInput = document.getElementById('header-file-input');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        if (headerFileInput) {
            headerFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        if (headerUploadBtn && headerFileInput) {
            headerUploadBtn.addEventListener('click', () => headerFileInput.click());
        }
        
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
            uploadArea.addEventListener('click', () => fileInput?.click());
        }
        
        document.getElementById('start-processing')?.addEventListener('click', () => this.startUpscaling());
        document.getElementById('output-format')?.addEventListener('change', () => {
            this.updateFormatOptions();
            this.handleSettingsChange();
        });
        document.getElementById('scale-factor')?.addEventListener('change', () => {
            this.updateEstimates();
            this.handleSettingsChange();
        });
        document.getElementById('processing-mode')?.addEventListener('change', () => {
            this.updateProcessingMode();
            this.handleSettingsChange();
        });
        document.getElementById('quality-slider')?.addEventListener('input', (e) => {
            document.getElementById('quality-value').textContent = e.target.value;
            this.updateEstimates();
            this.handleSettingsChange();
        });
        document.getElementById('ai-enhancement-toggle')?.addEventListener('change', () => {
            this.updateEstimates();
            this.updateProcessingButtonText(); // Update button text when AI toggle changes
            this.handleSettingsChange();
        });
        
        // File settings event handlers
        document.getElementById('custom-filename')?.addEventListener('input', () => {
            this.validateCustomFilename();
            this.handleSettingsChange();
        });
        document.getElementById('browse-location')?.addEventListener('click', () => this.browseDownloadLocation());
        
        // Download button event handlers
        this.setupDownloadEventListeners();
        
        // Bind left panel buttons (sidebar results removed)
        document.getElementById('process-another-left')?.addEventListener('click', () => this.resetToUpload());
        

    }
    
    setupDownloadEventListeners() {
        const downloadBtn = document.getElementById('header-download-btn');
        
        // Direct download button click - downloads upscaled image
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!downloadBtn.disabled) {
                    this.downloadResult();
                }
            });
        }
    }
    
    setupAuthEventListeners() {
        // Sign in button
        document.getElementById('signin-button')?.addEventListener('click', () => {
            this.showAuthModal('signin');
        });

        // Sign up button
        document.getElementById('signup-button')?.addEventListener('click', () => {
            this.showAuthModal('signup');
        });

        // Modal form handlers
        document.getElementById('signin-form')?.addEventListener('submit', (e) => {
            this.handleSignIn(e);
        });

        document.getElementById('signup-form')?.addEventListener('submit', (e) => {
            this.handleSignUp(e);
        });

        // Sign out
        document.getElementById('signout-button')?.addEventListener('click', () => {
            this.handleSignOut();
        });

        // Modal close
        document.getElementById('auth-modal-close')?.addEventListener('click', () => {
            this.hideAuthModal();
        });
        
        // Close modal when clicking overlay
        document.getElementById('auth-modal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-modal-overlay')) {
                this.hideAuthModal();
            }
        });

        // Switch between sign in and sign up
        document.getElementById('show-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignUpForm();
        });

        document.getElementById('show-signin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignInForm();
        });
        

    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) this.processFile(file);
    }
    
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
    }
    
    handleFileDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        const files = event.dataTransfer.files;
        if (files.length > 0) this.processFile(files[0]);
    }
    
    async processFile(file) {
        if (!this.fileHandler.validateFile(file)) {
            this.showNotification('Please select a valid image file (PNG, JPEG, WebP, TIFF) up to 1.5GB', 'error');
            return;
        }
        
        // Show warning for large files
        const sizeWarning = this.fileHandler.getFileSizeWarning(file);
        if (sizeWarning === 'large') {
            this.showNotification('⚠️ Large file detected (>500MB). Processing may take several minutes.', 'warning');
        } else if (sizeWarning === 'medium') {
            this.showNotification('ℹ️ Medium file size (>100MB). Processing may take longer than usual.', 'info');
        }
        
        try {
            const sizeMB = file.size / (1024 * 1024);
            
            // For extremely large files (>1GB) or TIFF files, skip browser preview entirely
            if (this.fileHandler.shouldSkipBrowserPreview(file)) {
                const isTiff = file.type === 'image/tiff' || file.type === 'image/tif';
                
                if (isTiff) {
                    this.showNotification(`📋 TIFF file detected (${Math.round(sizeMB)}MB). Generating preview using desktop service...`, 'info');
                    
                    // Use desktop service to generate TIFF preview
                    this.currentImage = await this.fileHandler.createTiffPreview(file);
                    this.showDownscaledImagePreview(this.currentImage, file);
                } else {
                    this.showNotification(`🚀 Extremely large file detected (${Math.round(sizeMB)}MB). Preparing for desktop service processing...`, 'info');
                    
                    // Create minimal image data for extremely large files
                    this.currentImage = {
                        width: 'unknown',
                        height: 'unknown', 
                        dataUrl: null,
                        file: file,
                        isLargeFile: true
                    };
                    
                    this.showLargeFilePreview(file);
                }
                
                this.updateUIState('ready');
                this.updateEstimates();
                return;
            }
            
            // For large files (100MB-1GB), create downscaled preview
            if (this.fileHandler.shouldDownscalePreview(file)) {
                const isTiff = file.type === 'image/tiff' || file.type === 'image/tif';
                
                if (isTiff) {
                    this.showNotification(`📋 TIFF file detected (${Math.round(sizeMB)}MB). Generating preview using desktop service...`, 'info');
                    this.currentImage = await this.fileHandler.createTiffPreview(file);
                } else {
                    this.showNotification(`📸 Creating optimized preview for large file (${Math.round(sizeMB)}MB)... Please wait.`, 'info');
                    this.currentImage = await this.fileHandler.createDownscaledPreview(file);
                }
                
                this.showDownscaledImagePreview(this.currentImage, file);
                this.updateUIState('ready');
                this.updateEstimates();
                return;
            }
            
            // Normal processing for smaller files (<100MB)
            if (sizeMB > 50) {
                this.showNotification(`📖 Loading file (${Math.round(sizeMB)}MB)... Please wait.`, 'info');
            }
            
            this.currentImage = await this.fileHandler.loadImage(file);
            this.showImagePreview(this.currentImage, file);
            this.updateUIState('ready');
            this.updateEstimates();
        } catch (error) {
            console.error('File processing error:', error);
            
            // Provide specific error messages
            let errorMessage = 'Error loading image file';
            if (error.message.includes('timeout')) {
                errorMessage = '⏱️ File too large for browser preview. Try using the desktop service for processing.';
            } else if (error.message.includes('not be supported')) {
                errorMessage = '🚫 Image format not supported by browser. Try converting to PNG/JPEG first.';
            } else if (error.message.includes('Failed to read')) {
                errorMessage = `📁 Cannot read file (${Math.round(file.size / 1024 / 1024)}MB). File may be corrupted or too large.`;
            }
            
            this.showNotification(errorMessage, 'error');
        }
    }
    
    showDownscaledImagePreview(imageData, file) {
        // Hide upload area and show preview area
        const uploadArea = document.getElementById('upload-area');
        const previewArea = document.getElementById('preview-area');
        const previewImage = document.getElementById('preview-image');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        
        uploadArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
        
        // Check if we have a preview image or need to show placeholder
        if (imageData.dataUrl && imageData.previewWidth > 0) {
            // Show the downscaled preview image
            previewImage.style.display = 'block';
            previewImage.src = imageData.dataUrl;
            previewImage.style.maxWidth = '100%';
            previewImage.style.height = 'auto';
            
            // Add preview info overlay
            const existingOverlay = previewImage.parentNode.querySelector('.preview-info-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            const previewOverlay = document.createElement('div');
            previewOverlay.className = 'preview-info-overlay absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded';
            previewOverlay.innerHTML = `
                📸 Preview: ${imageData.previewWidth}×${imageData.previewHeight}<br>
                📏 Original: ${imageData.width}×${imageData.height}<br>
                🔍 Scale: ${Math.round(imageData.scale * 100)}%
            `;
            
            // Make parent container relative for absolute positioning
            previewImage.parentNode.style.position = 'relative';
            previewImage.parentNode.appendChild(previewOverlay);
            
            // Show notification about preview scaling
            this.showNotification(`✅ Preview created (${Math.round(imageData.scale * 100)}% scale). Processing will use full ${imageData.width}×${imageData.height} resolution.`, 'success');
            
        } else {
            // No preview available - show file info placeholder
            previewImage.style.display = 'none';
            
            // Remove any existing overlays
            const existingOverlay = previewImage.parentNode.querySelector('.preview-info-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            // Create file info display for TIFF without preview
            const existingTiffInfo = previewImage.parentNode.querySelector('.tiff-file-info');
            if (existingTiffInfo) {
                existingTiffInfo.remove();
            }
            
            const tiffFileInfo = document.createElement('div');
            tiffFileInfo.className = 'tiff-file-info flex flex-col items-center justify-center h-64 bg-muted/10 rounded-lg border-2 border-dashed border-border';
            
            const errorMessage = imageData.previewError ? `<div class="text-xs text-red-400 mt-2">Preview: ${imageData.previewError}</div>` : '';
            const sizeInfo = imageData.estimatedSize || `${Math.round(file.size / (1024 * 1024))}MB`;
            
            tiffFileInfo.innerHTML = `
                <div class="text-6xl mb-4">🖼️</div>
                <div class="text-lg font-semibold mb-2">TIFF File Ready</div>
                <div class="text-sm text-muted-foreground text-center mb-2">
                    ${imageData.width}×${imageData.height} pixels<br>
                    ${sizeInfo} file size
                </div>
                <div class="text-xs text-muted-foreground text-center">
                    ${imageData.isTooLargeForPreview ? 'File too large for preview generation' : 'Preview not available'}<br>
                    Will be processed by desktop service
                </div>
                ${errorMessage}
            `;
            
            previewImage.parentNode.insertBefore(tiffFileInfo, previewImage);
            
            // Show notification about file ready for processing
            this.showNotification(`✅ TIFF file ready (${imageData.width}×${imageData.height}). Processing will use full resolution.`, 'success');
        }
        
        // Update the sidebar with file information
        this.updateImageDetails(imageData, file);
    }

    showLargeFilePreview(file) {
        // Hide upload area and show preview area for large files
        const uploadArea = document.getElementById('upload-area');
        const previewArea = document.getElementById('preview-area');
        const previewImage = document.getElementById('preview-image');
        
        uploadArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
        
        // Show file info instead of image preview
        previewImage.style.display = 'none';
        
        // Remove any existing overlays
        const existingOverlay = previewImage.parentNode.querySelector('.preview-info-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create large file info display
        const existingLargeFileInfo = previewImage.parentNode.querySelector('.large-file-info');
        if (existingLargeFileInfo) {
            existingLargeFileInfo.remove();
        }
        
        const largeFileInfo = document.createElement('div');
        largeFileInfo.className = 'large-file-info flex flex-col items-center justify-center h-64 bg-muted/10 rounded-lg border-2 border-dashed border-border';
        largeFileInfo.innerHTML = `
            <div class="text-6xl mb-4">📁</div>
            <div class="text-lg font-semibold mb-2">Extremely Large File Ready</div>
            <div class="text-sm text-muted-foreground text-center">
                File too large for browser preview<br>
                Will be processed directly by desktop service
            </div>
        `;
        
        previewImage.parentNode.insertBefore(largeFileInfo, previewImage);
        
        // Update the sidebar with file information - create mock imageData for large files
        const mockImageData = {
            width: 'unknown',
            height: 'unknown'
        };
        this.updateImageDetails(mockImageData, file);
    }

    showImagePreview(imageData, file) {
        // Hide upload area and show preview area
        const uploadArea = document.getElementById('upload-area');
        const previewArea = document.getElementById('preview-area');
        const previewImage = document.getElementById('preview-image');
        
        if (uploadArea && previewArea) {
            uploadArea.classList.add('hidden');
            previewArea.classList.remove('hidden');
        }
        
        if (previewImage) {
            previewImage.src = imageData.dataUrl;
            
            // Smart sizing based on image dimensions
            previewImage.onload = () => {
                const naturalWidth = previewImage.naturalWidth;
                const naturalHeight = previewImage.naturalHeight;
                const aspectRatio = naturalWidth / naturalHeight;
                
                // Calculate optimal display size
                const containerWidth = previewArea.clientWidth - 64; // Account for padding
                const containerHeight = previewArea.clientHeight - 64;
                
                let displayWidth, displayHeight;
                
                // For very small images (< 300px), scale them up
                if (naturalWidth < 300 || naturalHeight < 300) {
                    const minSize = 300;
                    if (aspectRatio > 1) {
                        displayWidth = Math.max(minSize, Math.min(containerWidth * 0.6, 600));
                        displayHeight = displayWidth / aspectRatio;
                    } else {
                        displayHeight = Math.max(minSize, Math.min(containerHeight * 0.6, 600));
                        displayWidth = displayHeight * aspectRatio;
                    }
                }
                // For large images, ensure they fit nicely in the container
                else if (naturalWidth > containerWidth * 0.8 || naturalHeight > containerHeight * 0.8) {
                    if (aspectRatio > containerWidth / containerHeight) {
                        displayWidth = Math.min(containerWidth * 0.8, 800);
                        displayHeight = displayWidth / aspectRatio;
                    } else {
                        displayHeight = Math.min(containerHeight * 0.8, 600);
                        displayWidth = displayHeight * aspectRatio;
                    }
                }
                // For medium-sized images, show at a comfortable viewing size
                else {
                    displayWidth = Math.min(Math.max(naturalWidth, 400), containerWidth * 0.7);
                    displayHeight = displayWidth / aspectRatio;
                }
                
                // Apply the calculated size
                previewImage.style.width = `${displayWidth}px`;
                previewImage.style.height = `${displayHeight}px`;
            };
        }
        
        // Update image details in sidebar
        this.updateImageDetails(imageData, file);
    }
    
    updateImageDetails(imageData, file) {
        // Update canvas overlay elements
        const noImageText = document.getElementById('no-image-text');
        const imageInfoText = document.getElementById('image-info-text');
        const dimensionsText = document.getElementById('image-dimensions-text');
        const sizeText = document.getElementById('image-size-text');
        const formatText = document.getElementById('image-format-text');
        
        // Toggle states
        if (noImageText && imageInfoText) {
            noImageText.classList.add('hidden');
            imageInfoText.classList.remove('hidden');
        }
        
        // Update details in overlay
        if (dimensionsText) {
            if (imageData.width === 'unknown' || imageData.height === 'unknown') {
                dimensionsText.textContent = 'Unknown';
            } else {
                dimensionsText.textContent = `${imageData.width} × ${imageData.height}`;
            }
        }
        if (sizeText) sizeText.textContent = this.formatFileSize(file.size);
        if (formatText) formatText.textContent = file.type.split('/')[1].toUpperCase();
        
        // Keep old elements for backward compatibility (if they exist)
        const dimensions = document.getElementById('image-dimensions');
        const size = document.getElementById('image-size');
        const format = document.getElementById('image-format');
        if (dimensions) {
            if (imageData.width === 'unknown' || imageData.height === 'unknown') {
                dimensions.textContent = 'Unknown';
            } else {
                dimensions.textContent = `${imageData.width} × ${imageData.height}`;
            }
        }
        if (size) size.textContent = this.formatFileSize(file.size);
        if (format) format.textContent = file.type.split('/')[1].toUpperCase();
    }
    
    updateFormatOptions() {
        const format = document.getElementById('output-format')?.value;
        const qualityControl = document.getElementById('quality-control');
        const formatInfo = document.getElementById('format-info');
        
        if (!format) return;
        
        // Show/hide quality control based on format
        if (qualityControl) {
            if (format === 'jpeg') {
                qualityControl.classList.remove('hidden');
            } else {
                qualityControl.classList.add('hidden');
            }
        }
        
        // Update format information text
        if (formatInfo) {
            const scaleFactor = parseInt(document.getElementById('scale-factor')?.value) || 10;
            const currentImagePixels = this.currentImage ? (this.currentImage.width * this.currentImage.height) : 6000000;
            const targetPixels = currentImagePixels * scaleFactor * scaleFactor;
            const targetMP = (targetPixels / 1000000).toFixed(0);
            
            let infoText = '';
            let processingTime = '';
            let fileSize = '';
            
            switch (format) {
                case 'jpeg':
                    processingTime = 'Fastest processing';
                    fileSize = `~${Math.round(targetPixels * 0.3 / 1024 / 1024)}MB`;
                    infoText = `${processingTime}, compressed files (${fileSize})`;
                    break;
                case 'png':
                    processingTime = 'Slower processing';
                    fileSize = `~${Math.round(targetPixels * 4 / 1024 / 1024)}MB`;
                    infoText = `${processingTime}, uncompressed quality (${fileSize})`;
                    break;
                case 'tiff':
                    processingTime = 'Moderate processing';
                    fileSize = `~${Math.round(targetPixels * 3 / 1024 / 1024)}MB`;
                    infoText = `${processingTime}, professional quality (${fileSize})`;
                    break;
            }
            
            formatInfo.textContent = infoText;
            
            // Add warning for very large files
            if (targetPixels > 500000000) { // 500MP+
                formatInfo.style.color = format === 'jpeg' ? '#10b981' : '#f59e0b';
                if (format !== 'jpeg') {
                    formatInfo.textContent += ' - Large file warning!';
                }
            } else {
                formatInfo.style.color = '#6b7280';
            }
        }
        
        this.updateEstimates();
    }

    updateProcessingMode() {
        const mode = document.getElementById('processing-mode')?.value;
        if (!mode) return;
        
        // Reinitialize upscaler with new quality mode
        try {
            if (this.upscaler && typeof this.upscaler.cleanup === 'function') {
                this.upscaler.cleanup();
            }
            this.upscaler = new UltraFastUpscaler({ qualityMode: mode });
            console.log(`✅ Switched to ${mode} mode`);
        } catch (error) {
            console.warn('⚠️ Failed to switch processing mode, using SimpleUpscaler');
            this.upscaler = new SimpleUpscaler();
        }
        
        this.updateEstimates();
    }
    
    updateEstimates() {
        if (!this.currentImage) return;
        
        const scaleFactorEl = document.getElementById('scale-factor');
        const formatEl = document.getElementById('output-format');
        const qualityEl = document.getElementById('quality-slider');
        
        if (!scaleFactorEl || !formatEl) return;
        
        const scaleFactor = parseInt(scaleFactorEl.value);
        const format = formatEl.value;
        const quality = qualityEl ? parseInt(qualityEl.value) : 95;
        
        // Always use original dimensions for calculations, not preview dimensions
        const originalWidth = this.currentImage.width;
        const originalHeight = this.currentImage.height;
        
        // Handle cases where dimensions might be 'unknown' for extremely large files
        if (originalWidth === 'unknown' || originalHeight === 'unknown') {
            // Update UI to show unknown state
            const currentSizeEl = document.getElementById('current-size');
            const targetSizeEl = document.getElementById('target-size');
            const estimateEl = document.getElementById('processing-estimate');
            
            if (currentSizeEl) currentSizeEl.textContent = 'Unknown dimensions';
            if (targetSizeEl) targetSizeEl.textContent = `Will be determined during processing`;
            if (estimateEl) estimateEl.textContent = 'Processing time will be estimated when dimensions are detected';
            return;
        }
        
        const outputWidth = originalWidth * scaleFactor;
        const outputHeight = originalHeight * scaleFactor;
        const estimatedSize = this.estimateFileSize(outputWidth, outputHeight, format, quality);
        const estimatedTime = this.estimateProcessingTime(outputWidth, outputHeight);
        
        // Update UI elements - both overlay and original locations
        const currentSizeEl = document.getElementById('current-size');
        const outputDimensions = document.getElementById('output-dimensions');
        const estimatedSizeEl = document.getElementById('estimated-size');
        const estimatedTimeEl = document.getElementById('estimated-time');
        
        // Update canvas overlay elements
        const outputDimensionsText = document.getElementById('output-dimensions-text');
        const estimatedSizeText = document.getElementById('estimated-size-text');
        const estimatedTimeText = document.getElementById('estimated-time-text');
        
        // Show original dimensions (what will actually be processed)
        if (currentSizeEl) {
            if (this.currentImage.isDownscaled) {
                currentSizeEl.textContent = `${originalWidth} × ${originalHeight} (preview: ${this.currentImage.previewWidth} × ${this.currentImage.previewHeight})`;
            } else {
                currentSizeEl.textContent = `${originalWidth} × ${originalHeight}`;
            }
        }
        
        if (outputDimensions) outputDimensions.textContent = `${outputWidth} × ${outputHeight}`;
        if (estimatedSizeEl) estimatedSizeEl.textContent = `~${this.formatFileSize(estimatedSize)}`;
        if (estimatedTimeEl) estimatedTimeEl.textContent = `~${estimatedTime}s`;
        
        // Update canvas overlay elements
        if (outputDimensionsText) outputDimensionsText.textContent = `${outputWidth} × ${outputHeight}`;
        if (estimatedSizeText) estimatedSizeText.textContent = `~${this.formatFileSize(estimatedSize)}`;
        if (estimatedTimeText) estimatedTimeText.textContent = `~${estimatedTime}s`;
        
        // Update filename preview
        this.updateFilenamePreview(format);
        

    }
    
    /**
     * Handle when user changes settings after processing is complete
     * This re-enables the Start Upscaling button for quick re-processing
     */
    handleSettingsChange() {
        // Only re-enable if we have an image loaded and processing is complete
        if (this.currentImage && this.currentState === 'complete') {
            console.log('🔄 Settings changed after completion - re-enabling processing button');
            this.updateUIState('ready');
            
            // Hide any completion modals or overlays
            this.hideCompletionDisplays();
            
            // Update button text to indicate new settings
            this.updateProcessingButtonText();
            
            // Show a subtle notification that settings have changed
            this.showNotification('Settings updated - ready to process with new settings', 'info');
        }
    }
    
    /**
     * Update processing button text based on current state
     */
    updateProcessingButtonText() {
        const button = document.getElementById('start-processing');
        if (!button) return;
        
        const aiToggle = document.getElementById('ai-enhancement-toggle');
        const isAIEnabled = aiToggle ? aiToggle.checked : false;
        
        if (this.currentState === 'ready' && this.processedResult) {
            // User has changed settings after completion
            if (isAIEnabled) {
                button.innerHTML = `
                    <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Re-Process with AI
                `;
            } else {
                button.innerHTML = `
                    <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Re-Process Image
                `;
            }
        } else {
            // Default state
            if (isAIEnabled) {
                button.innerHTML = `
                    <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Start AI Upscaling
                `;
            } else {
                button.innerHTML = `
                    <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Start Upscaling
                `;
            }
        }
    }
    
    /**
     * Hide completion displays when user changes settings
     */
    hideCompletionDisplays() {
        // Hide results overlay
        const resultsOverlay = document.getElementById('results-overlay');
        const completedResultsCard = document.getElementById('completed-results-card');
        
        if (resultsOverlay) resultsOverlay.classList.add('hidden');
        if (completedResultsCard) completedResultsCard.classList.add('hidden');
        
        // Remove any completion modals
        const existingModals = document.querySelectorAll('.fixed.inset-0.bg-black\\/50');
        existingModals.forEach(modal => {
            if (modal.innerHTML.includes('Processing Complete')) {
                modal.remove();
            }
        });
    }
    
    estimateFileSize(width, height, format, quality = 95) {
        const pixels = width * height;
        let bytesPerPixel;
        
        switch (format) {
            case 'png': bytesPerPixel = 4; break;
            case 'jpeg': bytesPerPixel = quality / 100 * 2; break;
            case 'webp': bytesPerPixel = quality / 100 * 1.5; break;
            default: bytesPerPixel = 3;
        }
        
        return pixels * bytesPerPixel;
    }
    
    estimateProcessingTime(width, height) {
        const pixels = width * height;
        
        // More accurate estimates based on upscaler type and processing mode
        if (this.upscaler instanceof UltraFastUpscaler) {
            const mode = document.getElementById('processing-mode')?.value || 'speed';
            let baseTime;
            
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
        } else {
            // Original SimpleUpscaler estimation
            return Math.max(2, Math.round(pixels / 10000000));
        }
    }
    


    async startUpscaling() {
        if (!this.currentImage) return;
        
        // Check authentication and usage limits first
        const scaleFactorEl = document.getElementById('scale-factor');
        const aiEnhancementEl = document.getElementById('ai-enhancement-toggle');
        const scaleFactor = scaleFactorEl ? parseInt(scaleFactorEl.value) : 2;
        const aiEnhancement = aiEnhancementEl ? aiEnhancementEl.checked : false;
        
        const processingType = this.authService.getProcessingType(scaleFactor, aiEnhancement);
        const usageCheck = await this.authService.checkUsage(processingType);
        
        if (!usageCheck.allowed) {
            this.showNotification(usageCheck.reason, 'error');
            if (usageCheck.requiresAuth) {
                this.showAuthModal('signin');
            } else {
    
            }
            return;
        }
        
        this.startTime = Date.now();
        this.updateUIState('processing');
        
        const formatEl = document.getElementById('output-format');
        const qualityEl = document.getElementById('quality-slider');
        
        const format = formatEl ? formatEl.value : 'png';
        const quality = qualityEl ? parseInt(qualityEl.value) : 95;
        
        try {
            // Check if pro-engine is available - if so, use it immediately
            if (this.proEngine.isAvailable) {
                console.log('🚀 Starting immediate pro-engine processing...');
                this.updateProgress(10, 'Connecting to Pro Engine...');
                
                // Create session ID for tracking
                const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                this.updateProgress(25, 'Preparing image data for processing...');
                
                // For large/downscaled files, we need to read the original file
                let imageDataUrl = this.currentImage.dataUrl;
                
                if (this.currentImage.isDownscaled || this.currentImage.isLargeFile) {
                    this.updateProgress(30, 'Reading original file for processing...');
                    try {
                        // Read the original file directly for processing
                        const originalFile = this.currentImage.file;
                        imageDataUrl = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target.result);
                            reader.onerror = () => reject(new Error('Failed to read original file'));
                            reader.readAsDataURL(originalFile);
                        });
                    } catch (error) {
                        console.error('Error reading original file:', error);
                        throw new Error('Failed to read original file for processing');
                    }
                }
                
                // Get format and quality settings
                const outputFormat = document.getElementById('output-format')?.value || 'jpeg';
                const quality = parseInt(document.getElementById('quality-slider')?.value) || 90;
                
                // Prepare result object for pro-engine
                const proEngineResult = {
                    dataUrl: imageDataUrl,
                    scaleFactor: scaleFactor,
                    format: outputFormat,
                    quality: quality,
                    width: this.currentImage.width * scaleFactor,
                    height: this.currentImage.height * scaleFactor,
                    size: this.estimateFileSize(this.currentImage.width * scaleFactor, this.currentImage.height * scaleFactor, outputFormat, quality)
                };
                
                this.updateProgress(50, aiEnhancement ? 'Sending to Pro Engine for AI-enhanced upscaling...' : 'Sending to Pro Engine for upscaling...');
                
                const processingOptions = {
                    aiEnhancement: aiEnhancement,
                    aiPreferences: {
                        fidelity: 0.05  // Optimized parameter from testing
                    },
                    outputPreferences: {
                        outputFormat: outputFormat,
                        quality: quality
                    }
                };
                
                console.log(`🎨 User selected format: ${outputFormat.toUpperCase()} (Quality: ${quality}%)`);
                if (outputFormat !== 'jpeg') {
                    console.log(`⚠️ ${outputFormat.toUpperCase()} format will take longer and create larger files`);
                }
                
                // Use AI-enhanced processing if available and requested
                if (aiEnhancement && this.proEngine.desktopServiceAvailable) {
                    console.log('🤖 Starting AI-enhanced processing...');
                    await this.proEngine.processWithDesktopServiceAI(proEngineResult, sessionId, processingOptions);
                } else {
                    // Standard processing
                    await this.proEngine.downloadLargeFile(proEngineResult, sessionId);
                }
                
                this.updateProgress(90, 'Processing complete, saving to Downloads folder...');
                
                // Calculate processing time
                const processingTime = Math.round((Date.now() - this.startTime) / 1000);
                console.log(`🎉 Pro-engine processing initiated in ${processingTime}s`);
                
                this.updateProgress(100, 'Complete! File saved to Downloads/ProUpscaler/');
                
                // Log usage after successful processing
                if (this.authService.isSignedIn()) {
                    const imagePixels = this.currentImage.width * this.currentImage.height;
                    await this.authService.logUsage(processingType, scaleFactor.toString() + 'x', imagePixels, processingTime * 1000);
                    this.updateUsageDisplay();
                }
                
                // Update UI state to complete
                this.updateUIState('complete');
                
                // Note: Desktop service handles its own completion modal
                // No need to show additional modal here
                
                return; // Exit early - no need for local processing
            }
            
            // Fallback: Use local upscaler if pro-engine is not available
            console.log('⚠️ Pro-engine not available, using local upscaler...');
            this.updateProgress(5, 'Initializing ultra-fast upscaling process...');
            
            // For local processing, prepare the image data
            let imageForProcessing = this.currentImage;
            
            if (this.currentImage.isDownscaled || this.currentImage.isLargeFile) {
                this.updateProgress(10, 'Reading original file for local processing...');
                try {
                    // For local processing, we need to create proper image data from the original file
                    const originalFile = this.currentImage.file;
                    const originalDataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = () => reject(new Error('Failed to read original file'));
                        reader.readAsDataURL(originalFile);
                    });
                    
                    // Create image data object with original file data
                    imageForProcessing = {
                        ...this.currentImage,
                        dataUrl: originalDataUrl
                    };
                } catch (error) {
                    console.error('Error reading original file for local processing:', error);
                    throw new Error('Failed to read original file for local processing');
                }
            }
            
            const result = await this.upscaler.upscaleImage(
                imageForProcessing,
                scaleFactor,
                format,
                quality,
                (progress, message) => this.updateProgress(progress, message)
            );
            
            // Log usage after successful local processing
            if (this.authService.isSignedIn()) {
                const imagePixels = this.currentImage.width * this.currentImage.height;
                const processingTime = Date.now() - this.startTime;
                await this.authService.logUsage(processingType, scaleFactor.toString() + 'x', imagePixels, processingTime);
                this.updateUsageDisplay();
            }
            
            // Handle chunked results according to the proven system
            if (result.chunkedData) {
                console.log('🔧 Handling chunked result for display - using smart preview');
                
                // Create virtual canvas (no actual pixel data!)
                this.fullResolutionCanvas = document.createElement('canvas');
                this.fullResolutionCanvas.width = result.chunkedData.width;
                this.fullResolutionCanvas.height = result.chunkedData.height;
                this.fullResolutionCanvas.chunkedData = result.chunkedData;
                console.log(`💾 Stored chunked result info: ${this.fullResolutionCanvas.width}×${this.fullResolutionCanvas.height}`);
                
                // Create smart preview for display
                const previewCanvas = this.createSmartPreview(result.chunkedData);
                result.canvas = previewCanvas;
                result.isChunked = true;
                
                this.processedResult = result;
                this.showResults(result);
            } else {
                // Regular result - create actual canvas copy
                this.fullResolutionCanvas = document.createElement('canvas');
                this.fullResolutionCanvas.width = result.width;
                this.fullResolutionCanvas.height = result.height;
                const ctx = this.fullResolutionCanvas.getContext('2d');
                if (result.canvas) {
                    ctx.drawImage(result.canvas, 0, 0);
                }
                
                this.processedResult = result;
                this.showResults(result);
            }
            
        } catch (error) {
            console.error('Upscaling error:', error);
            
            // Provide specific error messages based on error type
            if (error.message.includes('exceeds') || error.message.includes('limit')) {
                this.showNotification(
                    `Image too large to process. Try reducing the scale factor or using a smaller image. ${error.message}`,
                    'error'
                );
            } else if (error.message.includes('Processing failed')) {
                this.showNotification(
                    `Processing failed: ${error.message}. Please try a different image or reduce the scale factor.`,
                    'error'
                );
            } else if (error.message.includes('Invalid image')) {
                this.showNotification(
                    'Invalid image format. Please use a supported image format (JPEG, PNG, WebP).',
                    'error'
                );
            } else {
                this.showNotification('Upscaling failed. Please try again with a different image or settings.', 'error');
            }
            
            this.updateUIState('ready');
        }
    }
    
    updateProgress(percent, message, details = null) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const progressPercent = document.getElementById('progress-percent');
        const elapsedTime = document.getElementById('elapsed-time');
        const remainingTime = document.getElementById('remaining-time');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) {
            let displayMessage = message;
            
            // Enhance message with progressive scaling details if available
            if (details && details.step && details.totalSteps) {
                displayMessage = `${message} (Step ${details.step}/${details.totalSteps})`;
                if (details.currentScale) {
                    displayMessage += ` - ${details.currentScale}x`;
                }
            }
            
            progressText.textContent = displayMessage;
            
            // Enhanced console logging with detailed information
            let logMessage = `📊 Progress: ${Math.round(percent)}% - ${message}`;
            if (details) {
                if (details.step && details.totalSteps) {
                    logMessage += ` [Step ${details.step}/${details.totalSteps}]`;
                }
                if (details.currentScale) {
                    logMessage += ` [${details.currentScale}x scale]`;
                }
                if (details.processingRate) {
                    logMessage += ` [${details.processingRate}]`;
                }
                if (details.memoryMB) {
                    logMessage += ` [${details.memoryMB}MB RAM]`;
                }
            }
            console.log(logMessage);
        }
        if (progressPercent) progressPercent.textContent = `${Math.round(percent)}%`;
        
        if (this.startTime && elapsedTime) {
            const elapsed = Math.round((Date.now() - this.startTime) / 1000);
            elapsedTime.textContent = `${elapsed}s`;
            
            if (percent > 0 && remainingTime) {
                // More accurate time estimation for progressive scaling
                let estimated = Math.round((elapsed / percent) * (100 - percent));
                
                // Adjust estimation for progressive scaling steps
                if (details && details.step && details.totalSteps && percent < 90) {
                    const stepsRemaining = details.totalSteps - details.step;
                    const avgTimePerStep = elapsed / details.step;
                    estimated = Math.round(stepsRemaining * avgTimePerStep * 1.2); // 20% buffer
                }
                
                remainingTime.textContent = `~${estimated}s`;
            }
        }
    }
    
    showResults(result) {
        this.updateUIState('complete');
        
        // Auto-download if requested
        if (this.downloadAfterProcessing) {
            this.downloadAfterProcessing = false;
            // Small delay to ensure UI updates, then download
            setTimeout(() => {
                this.downloadResult();
            }, 500);
        }
        
        // Update left panel results (primary location)
        const finalDimensionsLeft = document.getElementById('final-dimensions-left');
        const finalSizeLeft = document.getElementById('final-size-left');
        const actualTimeLeft = document.getElementById('actual-time-left');
        const finalFormatLeft = document.getElementById('final-format-left');
        const completedResultsCard = document.getElementById('completed-results-card');
        const resultsOverlay = document.getElementById('results-overlay');
        
        // Calculate display values
        let dimensionsText, sizeText, formatText;
        if (result.isChunked || result.chunkedData) {
            dimensionsText = `${result.chunkedData ? result.chunkedData.width : result.width} × ${result.chunkedData ? result.chunkedData.height : result.height}`;
            sizeText = 'Virtual Preview';
            formatText = 'PNG (Preview)';
        } else {
            dimensionsText = `${result.width} × ${result.height}`;
            sizeText = this.formatFileSize(result.size || 0);
            formatText = (result.format || 'PNG').toUpperCase();
        }
        
        const processingTime = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
        const timeText = `${processingTime}s`;
        
        // Update left panel (primary location)
        if (finalDimensionsLeft) finalDimensionsLeft.textContent = dimensionsText;
        if (finalSizeLeft) finalSizeLeft.textContent = sizeText;
        if (finalFormatLeft) finalFormatLeft.textContent = formatText;
        if (actualTimeLeft) actualTimeLeft.textContent = timeText;
        
        // Show results overlay
        if (completedResultsCard) completedResultsCard.classList.remove('hidden');
        if (resultsOverlay) resultsOverlay.classList.remove('hidden');
        
        // USE NEW PRESENTATION SYSTEM FOR OPTIMAL DISPLAY
        this.presentResultWithNewSystem(result);
        
        // Auto-download/save result
        try {
            if (this.proEngine && this.proEngine.desktopServiceAvailable) {
                // Desktop service auto-saves; just inform user
                this.showNotification('Complete! File saved to Downloads/ProUpscaler/', 'success');
            } else if (!result.isChunked && !result.chunkedData) {
                // Browser path: trigger download immediately
                const format = document.getElementById('output-format')?.value || 'png';
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
                const filename = `upscaled-${result.width}x${result.height}-${timestamp}.${format}`;
                this.fileHandler.downloadFile(result, filename);
                this.showDownloadedFilename(filename, 'Downloads/');
                this.showNotification('Download complete!', 'success');
            } else {
                // Chunked preview cannot be fully downloaded here; suggest desktop service
                this.showNotification('Preview ready. Use Pro Engine for full-resolution save.', 'info');
            }
        } catch (e) {
            console.error('Auto-download error:', e);
        }
        
        // Log completion with system stats
        const megapixels = ((result.chunkedData ? result.chunkedData.width * result.chunkedData.height : result.width * result.height) / 1000000).toFixed(1);
        console.log(`🎉 Ultra-fast upscaling complete! ${megapixels}MP result in ${timeText}`);
    }
    
    async downloadResult() {
        if (!this.processedResult) return;
        
        const downloadButton = document.getElementById('download-button');
        if (!downloadButton) return;
        
        const originalText = downloadButton.innerHTML;
        
        try {
            downloadButton.innerHTML = `
                <div class="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                Downloading...
            `;
            downloadButton.disabled = true;
            
            // Handle chunked results according to proven system
            if (this.fullResolutionCanvas && this.fullResolutionCanvas.chunkedData) {
                console.log('📦 Downloading chunked result...');
                await this.downloadChunkedResult();
                this.showNotification('Chunked result download complete!', 'success');
            } else if (this.proEngine.isAvailable && this.processedResult.size > 100 * 1024 * 1024) {
                const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                await this.proEngine.downloadLargeFile(this.processedResult, sessionId);
                this.showNotification('Download started with Pro Engine!', 'success');
            } else {
                // Generate filename for regular downloads
                const format = document.getElementById('output-format')?.value || 'png';
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
                const filename = `upscaled-${this.processedResult.width}x${this.processedResult.height}-${timestamp}.${format}`;
                
                this.fileHandler.downloadFile(this.processedResult, filename);
                this.showDownloadedFilename(filename, 'Downloads/');
                this.showNotification('Download complete!', 'success');
            }
            
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Download failed. Please try again.', 'error');
        } finally {
            downloadButton.innerHTML = originalText;
            downloadButton.disabled = false;
        }
    }

    /**
     * Download chunked result - according to proven system
     */
    async downloadChunkedResult(filename = null) {
        const chunkedData = this.fullResolutionCanvas.chunkedData;
        const { width, height } = chunkedData;
        
        console.log(`📊 Downloading ${width}×${height} chunked result`);
        
        // For demo purposes, create a partial reconstruction
        // In production, you'd use server-side composition or WASM
        const maxDimension = 8192; // Safe limit for download demo
        const reconstructedCanvas = document.createElement('canvas');
        reconstructedCanvas.width = Math.min(width, maxDimension);
        reconstructedCanvas.height = Math.min(height, maxDimension);
        
        const ctx = reconstructedCanvas.getContext('2d');
        
        // Create a placeholder result with info
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, reconstructedCanvas.width, reconstructedCanvas.height);
        
        // Add the original image scaled up as best-effort result
        if (this.currentImage && this.currentImage.dataUrl) {
            const img = new Image();
            img.onload = () => {
                // Draw scaled original
                ctx.drawImage(img, 0, 0, reconstructedCanvas.width, reconstructedCanvas.height);
                
                // Add overlay with info
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, reconstructedCanvas.height - 100, reconstructedCanvas.width, 100);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`Ultra-Fast Upscaled: ${width}×${height}`, 
                           reconstructedCanvas.width / 2, reconstructedCanvas.height - 60);
                ctx.fillText(`(Partial ${reconstructedCanvas.width}×${reconstructedCanvas.height} preview)`, 
                           reconstructedCanvas.width / 2, reconstructedCanvas.height - 30);
                
                // Download the result
                this.downloadCanvas(reconstructedCanvas, filename || `upscaled-${width}x${height}-preview.png`);
            };
            img.src = this.currentImage.dataUrl;
        } else {
            // Fallback download
            this.downloadCanvas(reconstructedCanvas, filename || `upscaled-${width}x${height}-info.png`);
        }
    }

    /**
     * Download canvas as file
     */
    downloadCanvas(canvas, filename) {
        const finalFilename = filename || `upscaled-${canvas.width}x${canvas.height}.png`;
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Show the downloaded filename in the status area
            this.showDownloadedFilename(finalFilename, 'Downloads/');
        }, 'image/png');
    }
    
    resetToUpload() {
        this.currentImage = null;
        this.processedResult = null;
        this.startTime = null;
        this.downloadAfterProcessing = false;
        
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        
        // Update download button state
        this.updateDownloadButtonState();
        
        // Reset canvas overlays
        this.resetCanvasOverlays();
        
        // Show upload area and hide preview area
        const uploadArea = document.getElementById('upload-area');
        const previewArea = document.getElementById('preview-area');
        if (uploadArea && previewArea) {
            uploadArea.classList.remove('hidden');
            previewArea.classList.add('hidden');
        }
        
        // Reset image details
        const noImageState = document.getElementById('no-image-state');
        const imageInfoState = document.getElementById('image-info-state');
        if (noImageState && imageInfoState) {
            noImageState.classList.remove('hidden');
            imageInfoState.classList.add('hidden');
        }
        
        // Reset info displays
        const infoElements = ['image-dimensions', 'image-size', 'image-format', 'output-dimensions', 'estimated-size', 'estimated-time'];
        infoElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '-';
        });
        
        // Hide downloaded filename display
        const filenameDisplay = document.getElementById('downloaded-filename-display');
        if (filenameDisplay) {
            filenameDisplay.classList.add('hidden');
        }
        
        // No sidebar results to hide anymore
        
        // Hide results overlay
        const completedResultsCard = document.getElementById('completed-results-card');
        const resultsOverlay = document.getElementById('results-overlay');
        const optimizedResultContainer = document.getElementById('optimized-result-container');
        
        if (completedResultsCard) completedResultsCard.classList.add('hidden');
        if (resultsOverlay) resultsOverlay.classList.add('hidden');
        if (optimizedResultContainer) optimizedResultContainer.innerHTML = '';
        
        this.updateUIState('idle');
    }
    
    /**
     * Present result with new optimal presentation system
     */
    async presentResultWithNewSystem(result) {
        // DISABLED: This creates off-screen download buttons that confuse users
        // Only use the header download button for a clean single-pane UI
        console.log('Presentation system disabled - using header download button only');
        return;
        
        try {
            // Import and use the new presentation system
            const { ImagePresentationManager } = await import('./image-presentation-manager.js');
            const presentationManager = new ImagePresentationManager();
            
            // Convert result to new format
            const optimizedResult = this.convertResultForNewSystem(result);
            
            // Find or create a container for the new presentation
            let presentationContainer = document.getElementById('optimized-result-container');
            if (!presentationContainer) {
                presentationContainer = document.createElement('div');
                presentationContainer.id = 'optimized-result-container';
                presentationContainer.style.cssText = `
                    margin-top: 20px;
                    padding: 20px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                `;
                
                // Add after the results panel
                const resultsPanel = document.getElementById('results-panel');
                if (resultsPanel && resultsPanel.parentNode) {
                    resultsPanel.parentNode.insertBefore(presentationContainer, resultsPanel.nextSibling);
                }
            }
            
            // Present with optimal system
            presentationManager.presentUpscaledImage(optimizedResult, presentationContainer);
            
            console.log('🖼️ Using new optimal presentation system');
            
        } catch (error) {
            console.warn('⚠️ Could not load new presentation system, using fallback:', error);
        }
    }

    /**
     * Convert result to new system format
     */
    convertResultForNewSystem(result) {
        const isVirtual = result.isChunked || result.chunkedData;
        const dimensions = {
            width: result.chunkedData ? result.chunkedData.width : result.width,
            height: result.chunkedData ? result.chunkedData.height : result.height
        };
        
        const megapixels = (dimensions.width * dimensions.height / 1000000).toFixed(1);
        const processingTime = result.processingTime || 0;
        
        return {
            displayCanvas: result.canvas, // Preview canvas
            fullResolutionCanvas: this.fullResolutionCanvas || result.canvas,
            isVirtual: isVirtual,
            dimensions: dimensions,
            processingTime: processingTime,
            megapixels: megapixels
        };
    }

    /**
     * Create smart preview for chunked results - according to proven system
     */
    createSmartPreview(chunkedData, previewSize = 1024) {
        console.log('🖼️ Creating smart preview for chunked result');
        
        // Calculate preview dimensions maintaining aspect ratio
        const aspectRatio = chunkedData.height / chunkedData.width;
        
        const previewCanvas = document.createElement('canvas');
        if (aspectRatio > 1) {
            // Portrait
            previewCanvas.height = previewSize;
            previewCanvas.width = Math.round(previewSize / aspectRatio);
        } else {
            // Landscape
            previewCanvas.width = previewSize;
            previewCanvas.height = Math.round(previewSize * aspectRatio);
        }
        
        const ctx = previewCanvas.getContext('2d');
        
        // Draw the original image scaled to preview size as placeholder
        if (this.currentImage && this.currentImage.dataUrl) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
                
                // Add subtle overlay to indicate it's a preview of larger image
                ctx.fillStyle = 'rgba(0, 100, 255, 0.1)';
                ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
                
                // Add preview indicator text
                ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`Preview of ${chunkedData.width}×${chunkedData.height}`, 
                           previewCanvas.width / 2, previewCanvas.height - 20);
            };
            img.src = this.currentImage.dataUrl;
        } else {
            // Fallback - create a placeholder
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
            
            ctx.fillStyle = '#60a5fa';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${chunkedData.width}×${chunkedData.height}`, 
                       previewCanvas.width / 2, previewCanvas.height / 2);
            ctx.fillText('(Chunked Result)', 
                       previewCanvas.width / 2, previewCanvas.height / 2 + 30);
        }
        
        return previewCanvas;
    }

    // Authentication UI Methods
    showAuthModal(mode = 'signin') {
        const modal = document.getElementById('auth-modal');
        modal.classList.remove('hidden');
        
        if (mode === 'signin') {
            this.showSignInForm();
        } else {
            this.showSignUpForm();
        }
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        modal.classList.add('hidden');
        
        // Clear form inputs
        document.getElementById('signin-email').value = '';
        document.getElementById('signin-password').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-confirm').value = '';
    }

    showEmailVerificationMessage(email) {
        // Update the modal content to show email verification message
        const modal = document.getElementById('auth-modal');
        const modalContent = modal.querySelector('.auth-modal-content');
        
        modalContent.innerHTML = `
            <div class="auth-modal-header">
                <h2>Check Your Email</h2>
                <button id="auth-modal-close" class="auth-modal-close">&times;</button>
            </div>
            <div class="auth-verification-message">
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📧</div>
                    <h3 style="margin-bottom: 12px; color: var(--foreground);">Verification Email Sent</h3>
                    <p style="color: var(--muted-foreground); margin-bottom: 16px; line-height: 1.5;">
                        We've sent a verification link to:<br>
                        <strong style="color: var(--foreground);">${email}</strong>
                    </p>
                    <p style="color: var(--muted-foreground); font-size: 14px; margin-bottom: 20px;">
                        Click the link in your email to activate your account, then return here to sign in.
                    </p>
                    <button id="verification-done-btn" class="auth-button" style="margin-top: 12px;">
                        I've Verified My Email
                    </button>
                </div>
            </div>
        `;

        // Re-attach close event listener
        modalContent.querySelector('#auth-modal-close').addEventListener('click', () => {
            this.hideAuthModal();
        });

        // Handle "I've verified" button
        modalContent.querySelector('#verification-done-btn').addEventListener('click', () => {
            this.restoreAuthModal();
            this.showSignInForm();
            this.showNotification('Please sign in with your verified account', 'info');
        });

        // Auto-hide after 10 seconds with countdown
        this.startVerificationCountdown();
        // Also allow pressing Enter to close and switch to sign in
        modalContent.querySelector('#verification-done-btn').addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                this.restoreAuthModal();
                this.showSignInForm();
                this.showNotification('Please sign in with your verified account', 'info');
            }
        });
    }

    startVerificationCountdown() {
        let countdown = 10;
        const updateCountdown = () => {
            const btn = document.getElementById('verification-done-btn');
            if (btn && countdown > 0) {
                btn.textContent = `Auto-close in ${countdown}s`;
                countdown--;
                setTimeout(updateCountdown, 1000);
            } else if (btn) {
                this.hideAuthModal();
                this.showNotification('You can sign in once you\'ve verified your email', 'info');
            }
        };
        setTimeout(updateCountdown, 3000); // Start countdown after 3 seconds
    }

    restoreAuthModal() {
        // Restore the original modal content
        const modal = document.getElementById('auth-modal');
        const modalContent = modal.querySelector('.auth-modal-content');
        
        modalContent.innerHTML = `
            <div class="auth-modal-header">
                <h2 id="auth-modal-title">Sign In</h2>
                <button id="auth-modal-close" class="auth-modal-close">&times;</button>
            </div>
            
            <!-- Sign In Form -->
            <form id="signin-form" class="auth-form">
                <div class="form-group">
                    <label for="signin-email">Email</label>
                    <input type="email" id="signin-email" required>
                </div>
                <div class="form-group">
                    <label for="signin-password">Password</label>
                    <input type="password" id="signin-password" required>
                </div>
                <button type="submit" class="auth-button">Sign In</button>
                <p class="auth-switch">
                    Don't have an account? 
                    <a href="#" id="show-signup">Sign up</a>
                </p>
            </form>
            
            <!-- Sign Up Form -->
            <form id="signup-form" class="auth-form hidden">
                <div class="form-group">
                    <label for="signup-email">Email</label>
                    <input type="email" id="signup-email" required>
                </div>
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <input type="password" id="signup-password" required>
                </div>
                <div class="form-group">
                    <label for="signup-confirm">Confirm Password</label>
                    <input type="password" id="signup-confirm" required>
                </div>
                <button type="submit" class="auth-button">Create Account</button>
                <p class="auth-switch">
                    Already have an account? 
                    <a href="#" id="show-signin">Sign in</a>
                </p>
            </form>
        `;

        // Re-attach all event listeners
        this.attachModalEventListeners();
    }

    attachModalEventListeners() {
        // Modal form handlers
        document.getElementById('signin-form')?.addEventListener('submit', (e) => {
            this.handleSignIn(e);
        });

        document.getElementById('signup-form')?.addEventListener('submit', (e) => {
            this.handleSignUp(e);
        });

        // Modal close
        document.getElementById('auth-modal-close')?.addEventListener('click', () => {
            this.hideAuthModal();
        });

        // Switch between sign in and sign up
        document.getElementById('show-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignUpForm();
        });

        document.getElementById('show-signin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignInForm();
        });
    }

    showSignInForm() {
        document.getElementById('auth-modal-title').textContent = 'Sign In';
        document.getElementById('signin-form').classList.remove('hidden');
        document.getElementById('signup-form').classList.add('hidden');
    }

    showSignUpForm() {
        document.getElementById('auth-modal-title').textContent = 'Create Account';
        document.getElementById('signin-form').classList.add('hidden');
        document.getElementById('signup-form').classList.remove('hidden');
    }

    async handleSignIn(e) {
        e.preventDefault();
        
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;

        try {
            const result = await this.authService.signIn(email, password);
            this.hideAuthModal();
            this.updateUIForSignedInUser(result.user);
            this.updateUsageDisplay();
            this.showNotification('Successfully signed in!', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handleSignUp(e) {
        e.preventDefault();
        
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        const submitBtn = (e.submitter) ? e.submitter : document.querySelector('#signup-form .auth-button');

        if (password !== confirm) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters long', 'error');
            return;
        }

        // Loading state
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';
        }

        try {
            const result = await this.authService.signUp(email, password);
            
            // Check if email verification is required
            if (result.user && !result.user.email_confirmed_at) {
                // Show email verification message immediately
                this.showEmailVerificationMessage(email);
            } else if (result.user) {
                // User is immediately signed in (email confirmation disabled)
                this.hideAuthModal();
                this.updateUIForSignedInUser(result.user);
                this.updateUsageDisplay();
                this.showNotification('Account created successfully!', 'success');
            }
        } catch (error) {
            // Handle the specific case where email verification is required
            if (error.message.includes('check your email for verification')) {
                this.showEmailVerificationMessage(email);
            } else {
                this.showNotification(error.message, 'error');
                // Reset button so user can try again
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                }
            }
        }
    }

    async handleSignOut() {
        await this.authService.signOut();
        this.updateUIForSignedOutUser();
        this.showNotification('Signed out successfully', 'success');
    }

    updateUIForSignedInUser(user) {
        document.getElementById('signed-out-state').classList.add('hidden');
        document.getElementById('signed-in-state').classList.remove('hidden');
        
        document.getElementById('user-email').textContent = user.email;
        
        const profile = this.authService.getUserProfile();
        if (profile) {
            const tierBadge = document.getElementById('user-tier');
            tierBadge.textContent = profile.subscription_tier;
            tierBadge.className = `tier-badge ${profile.subscription_tier}`;
        }
        
        this.updateUsageDisplay();
    }

    updateUIForSignedOutUser() {
        document.getElementById('signed-out-state').classList.remove('hidden');
        document.getElementById('signed-in-state').classList.add('hidden');
        
        // Reset usage display
        document.getElementById('standard-usage').textContent = '-';
        document.getElementById('highres-usage').textContent = '-';
        document.getElementById('ai-usage').textContent = '-';
        

    }

    async updateUsageDisplay() {
        if (!this.authService.isSignedIn()) return;

        try {
            const stats = await this.authService.getUsageStats();
            const profile = this.authService.getUserProfile();
            
            if (stats && profile) {
                const tier = profile.subscription_tiers;
                
                // Update usage counters
                document.getElementById('standard-usage').textContent = 
                    tier.max_2x_4x === -1 ? `${stats.standard} (unlimited)` : `${stats.standard}/${tier.max_2x_4x}`;
                
                document.getElementById('highres-usage').textContent = 
                    tier.max_8x === -1 ? `${stats.highres} (unlimited)` : (tier.max_8x === 0 ? 'locked' : `${stats.highres}/${tier.max_8x}`);
                
                document.getElementById('ai-usage').textContent = 
                    tier.max_ai_enhancements === -1 ? `${stats.ai_enhancement} (unlimited)` : `${stats.ai_enhancement}/${tier.max_ai_enhancements}`;
                

            }
        } catch (error) {
            console.error('Failed to update usage display:', error);
        }
    }

    // Cleanup resources when app is closed
    cleanup() {
        if (this.upscaler && typeof this.upscaler.cleanup === 'function') {
            this.upscaler.cleanup();
        }
    }
    
    updateUIState(state) {
        this.currentState = state;
        
        const progressFooter = document.getElementById('progress-footer');
        const startButton = document.getElementById('start-processing');
        
        // Show appropriate state and buttons
        switch (state) {
            case 'idle':
                // Hide progress footer when idle
                if (progressFooter) progressFooter.classList.add('hidden');
                if (startButton) {
                    startButton.disabled = true;
                }
                this.updateProcessingButtonText();
                break;
            case 'ready':
                // Hide progress footer when ready
                if (progressFooter) progressFooter.classList.add('hidden');
                if (startButton) {
                    startButton.disabled = false;
                }
                this.updateProcessingButtonText();
                break;
            case 'processing':
                // Show progress footer during processing
                if (progressFooter) progressFooter.classList.remove('hidden');
                if (startButton) {
                    startButton.disabled = true;
                }
                // Don't update button text during processing
                break;
            case 'complete':
                // Hide progress footer when complete
                if (progressFooter) progressFooter.classList.add('hidden');
                // Note: Download and Process Another buttons are now in the results overlay
                // They're shown via the showResults() method when the overlay is displayed
                this.updateProcessingButtonText();
                break;
        }
        
        // Update download button state whenever UI state changes
        this.updateDownloadButtonState();
    }
    
    updateProStatus() {
        const proEngineStatus = document.getElementById('pro-engine-status');
        const statusCircle = document.getElementById('status-circle');
        
        if (!proEngineStatus || !statusCircle) return;
        
        // Remove all status classes first
        statusCircle.classList.remove('online', 'checking');
        
        if (this.proEngine.isAvailable) {
            statusCircle.classList.add('online');
            console.log('✅ Pro Engine status updated: Online');
        } else {
            // Default red color (no class needed, it's the default in CSS)
            console.log('❌ Pro Engine status updated: Offline');
        }
    }
    
    setProStatusChecking() {
        const statusCircle = document.getElementById('status-circle');
        if (statusCircle) {
            statusCircle.classList.remove('online');
            statusCircle.classList.add('checking');
            console.log('🔄 Pro Engine status: Checking...');
        }
    }
    



    
    showNotification(message, type = 'info') {
        const container = document.getElementById('canvas-notifications');
        const host = container || document.body;
        const notification = document.createElement('div');
        notification.className = `canvas-notification-item ${type}`;
        notification.textContent = message;
        
        host.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    showLargeFileCompletionModal(result, processingTime) {
        // Generate the expected filename based on the pattern used by the pro-engine
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const expectedFilename = `upscaled-${sessionId}-${timestamp}.png`;
        
        // Show completion in canvas area instead of full-screen modal
        this.showNotification('Large file processing complete! File saved to Downloads/ProUpscaler/', 'success');
        
        // Use the existing results overlay to show completion details
        const resultsOverlay = document.getElementById('results-overlay');
        if (resultsOverlay) {
            // Update the results overlay with completion info
            const finalDimensionsLeft = document.getElementById('final-dimensions-left');
            const finalSizeLeft = document.getElementById('final-size-left');
            const actualTimeLeft = document.getElementById('actual-time-left');
            const finalFormatLeft = document.getElementById('final-format-left');
            
            if (finalDimensionsLeft) finalDimensionsLeft.textContent = `${result.width} × ${result.height}`;
            if (finalSizeLeft) finalSizeLeft.textContent = this.formatFileSize(result.size || 0);
            if (actualTimeLeft) actualTimeLeft.textContent = `${processingTime}s`;
            if (finalFormatLeft) finalFormatLeft.textContent = (result.format || 'PNG').toUpperCase();
            
            resultsOverlay.classList.remove('hidden');
        }
        
        return; // Skip the full-screen modal
        
        // Disabled full-screen modal (kept for reference)
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 hidden';
        modal.innerHTML = `
            <div class="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4">
                <div class="text-center">
                    <h2 class="text-xl font-semibold mb-2">Processing Complete!</h2>
                    <p class="text-muted-foreground">Your large image has been saved to your Downloads folder.</p>
                </div>
                
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="flex items-center space-x-3">
                        <span class="text-muted-foreground">Original:</span>
                        <span>${this.currentImage.width} × ${this.currentImage.height}</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-muted-foreground">Upscaled:</span>
                        <span>${result.width} × ${result.height}</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-muted-foreground">Processing Time:</span>
                        <span>${processingTime}s</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-muted-foreground">Format:</span>
                        <span>${(result.format || 'PNG').toUpperCase()}</span>
                    </div>
                </div>
                

                
                <div class="space-y-3">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                        <strong>📁 File:</strong> ${expectedFilename}<br>
                        <strong>📁 Location:</strong> Downloads/ProUpscaler/<br>
                        <strong>💡 Note:</strong> The image is too large to display in your browser. Please open your Downloads folder to view the upscaled image.
                    </div>
                    <div class="flex space-x-3">
                        <button class="btn-primary flex-1" onclick="window.app.openDownloadsFolder(); this.parentElement.parentElement.parentElement.parentElement.remove()">
                            Open Downloads Folder
                        </button>
                        <button class="btn-secondary" onclick="window.app.resetToUpload(); this.parentElement.parentElement.parentElement.parentElement.remove()">
                            Process Another Image
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    /**
     * Show the downloaded filename in the status area
     */
    showDownloadedFilename(filename, location = null) {
        const filenameDisplay = document.getElementById('downloaded-filename-display');
        const filenameText = document.getElementById('downloaded-filename-text');
        const downloadLocationEl = document.getElementById('download-location');
        
        if (filenameDisplay && filenameText) {
            filenameText.textContent = filename;
            if (downloadLocationEl) {
                // Use custom location if available, otherwise use provided or default
                const displayLocation = location || this.getDownloadLocationDisplay();
                downloadLocationEl.textContent = displayLocation;
            }
            filenameDisplay.classList.remove('hidden');
            
            console.log(`📁 Downloaded: ${filename} → ${location || this.getDownloadLocationDisplay()}`);
        }
    }
    
    openDownloadsFolder() {
        // Try different methods to open the Downloads folder
        try {
            // Use custom location if set, otherwise default
            const locationPath = this.getDownloadLocationPath();
            const downloadsPath = `file://${locationPath}`;
            window.open(downloadsPath, '_blank');
        } catch (error) {
            console.warn('Could not open Downloads folder directly:', error);
            
            // Method 2: Fallback - show instructions
            const locationDisplay = this.getDownloadLocationDisplay();
            this.showNotification(
                `📁 Please manually navigate to your ${locationDisplay} folder to view your upscaled image.`,
                'info'
            );
        }
    }
    
    /**
     * Validate custom filename input
     */
    validateCustomFilename() {
        const input = document.getElementById('custom-filename');
        const value = input.value.trim();
        
        // Remove error state first
        input.classList.remove('error');
        
        if (value === '') {
            // Empty is valid - will use auto-generated
            this.updateEstimates();
            return true;
        }
        
        // Validate filename characters
        const invalidChars = /[<>:"/\\|?*]/g;
        if (invalidChars.test(value)) {
            input.classList.add('error');
            this.showNotification('Filename contains invalid characters: < > : " / \\ | ? *', 'error');
            return false;
        }
        
        // Check length
        if (value.length > 200) {
            input.classList.add('error');
            this.showNotification('Filename too long (max 200 characters)', 'error');
            return false;
        }
        
        // Check for reserved names (Windows compatibility)
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        if (reservedNames.includes(value.toUpperCase())) {
            input.classList.add('error');
            this.showNotification('Filename uses a reserved name', 'error');
            return false;
        }
        
        this.updateEstimates(); // Refresh preview with new filename
        return true;
    }
    
    /**
     * Browse for download location
     */
    async browseDownloadLocation() {
        try {
            // Use File System Access API if available (modern browsers)
            if ('showDirectoryPicker' in window) {
                const dirHandle = await window.showDirectoryPicker();
                const locationInput = document.getElementById('download-location');
                
                // Store the directory handle
                this.customDownloadLocation = dirHandle;
                locationInput.value = dirHandle.name;
                
                this.showNotification('📁 Download location updated', 'success');
                this.updateEstimates();
            } else {
                // Fallback: Show modal with common locations
                this.showLocationPickerModal();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error selecting directory:', error);
                this.showNotification('Could not access directory picker', 'error');
            }
        }
    }
    
    /**
     * Show location picker modal for browsers without File System Access API
     */
    showLocationPickerModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-card border border-border rounded-lg max-w-sm w-full p-4 space-y-3">
                <div class="text-center">
                    <h3 class="text-lg font-semibold mb-2">Select Download Location</h3>
                    <p class="text-sm text-muted-foreground mb-3">Choose a common download location:</p>
                </div>
                
                <div class="space-y-2">
                    <button class="btn-secondary w-full text-sm" onclick="window.app.setDownloadLocation('Downloads/ProUpscaler'); this.parentElement.parentElement.parentElement.parentElement.remove()">
                        📁 Downloads/ProUpscaler (Default)
                    </button>
                    <button class="btn-secondary w-full text-sm" onclick="window.app.setDownloadLocation('Downloads'); this.parentElement.parentElement.parentElement.parentElement.remove()">
                        📁 Downloads
                    </button>
                    <button class="btn-secondary w-full text-sm" onclick="window.app.setDownloadLocation('Desktop'); this.parentElement.parentElement.parentElement.parentElement.remove()">
                        📁 Desktop
                    </button>
                    <button class="btn-secondary w-full text-sm" onclick="window.app.setDownloadLocation('Documents/ProUpscaler'); this.parentElement.parentElement.parentElement.parentElement.remove()">
                        📁 Documents/ProUpscaler
                    </button>
                </div>
                
                <button class="btn-ghost w-full text-sm" onclick="this.parentElement.parentElement.remove()">
                    Cancel
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    /**
     * Set download location from modal selection
     */
    setDownloadLocation(location) {
        const locationInput = document.getElementById('download-location');
        locationInput.value = location;
        this.customDownloadLocation = location;
        this.showNotification('📁 Download location updated', 'success');
        this.updateEstimates();
    }
    
    /**
     * Get custom filename or generate default
     */
    getCustomFilename(sessionId, format, extension) {
        const customName = document.getElementById('custom-filename')?.value.trim();
        if (customName && this.validateCustomFilename()) {
            return `${customName}.${extension}`;
        }
        // Fallback to current auto-generation
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `upscaled-${sessionId}-${timestamp}.${extension}`;
    }
    
    /**
     * Get download location path for file operations
     */
    getDownloadLocationPath() {
        if (this.customDownloadLocation) {
            if (typeof this.customDownloadLocation === 'string') {
                return `/home/mranderson/${this.customDownloadLocation}`;
            }
            // For FileSystemDirectoryHandle, we'll need to use the API
            return '/home/mranderson/Downloads/ProUpscaler'; // Fallback
        }
        return '/home/mranderson/Downloads/ProUpscaler';
    }
    
    /**
     * Get download location display name
     */
    getDownloadLocationDisplay() {
        const locationInput = document.getElementById('download-location');
        return locationInput?.value || 'Downloads/ProUpscaler';
    }
    
    /**
     * Get custom filename for API calls
     */
    getCustomFilenameForAPI() {
        const input = document.getElementById('custom-filename');
        const value = input?.value.trim();
        return (value && this.validateCustomFilename()) ? value : null;
    }
    
    /**
     * Get custom location for API calls
     */
    getCustomLocationForAPI() {
        if (this.customDownloadLocation && typeof this.customDownloadLocation === 'string') {
            return this.customDownloadLocation;
        }
        return null;
    }
    
    /**
     * Update filename preview in Output Preview card
     */
    updateFilenamePreview(format = 'png') {
        const previewEl = document.getElementById('preview-filename');
        const previewTextEl = document.getElementById('preview-filename-text');
        
        const customName = document.getElementById('custom-filename')?.value.trim();
        
        let filename, title;
        if (customName && this.validateCustomFilename()) {
            // Show custom filename with extension
            const extension = this.getExtensionForFormat(format);
            filename = customName.endsWith(`.${extension}`) ? customName : `${customName}.${extension}`;
            title = `Custom filename: ${filename}`;
        } else {
            // Show auto-generated preview
            filename = 'Auto-generated';
            title = 'Filename will be automatically generated based on timestamp and session ID';
        }
        
        // Update both old and new elements
        if (previewEl) {
            previewEl.textContent = filename;
            previewEl.title = title;
        }
        if (previewTextEl) {
            previewTextEl.textContent = filename;
            previewTextEl.title = title;
        }
    }
    
    /**
     * Reset canvas overlays to default state
     */
    resetCanvasOverlays() {
        const noImageText = document.getElementById('no-image-text');
        const imageInfoText = document.getElementById('image-info-text');
        
        if (noImageText && imageInfoText) {
            noImageText.classList.remove('hidden');
            imageInfoText.classList.add('hidden');
        }
        
        // Reset overlay text values
        const dimensionsText = document.getElementById('image-dimensions-text');
        const sizeText = document.getElementById('image-size-text');
        const formatText = document.getElementById('image-format-text');
        const outputDimensionsText = document.getElementById('output-dimensions-text');
        const estimatedSizeText = document.getElementById('estimated-size-text');
        const estimatedTimeText = document.getElementById('estimated-time-text');
        const previewFilenameText = document.getElementById('preview-filename-text');
        
        if (dimensionsText) dimensionsText.textContent = '-';
        if (sizeText) sizeText.textContent = '-';
        if (formatText) formatText.textContent = '-';
        if (outputDimensionsText) outputDimensionsText.textContent = '-';
        if (estimatedSizeText) estimatedSizeText.textContent = '-';
        if (estimatedTimeText) estimatedTimeText.textContent = '-';
        if (previewFilenameText) previewFilenameText.textContent = 'Auto-generated';
    }

    /**
     * Get file extension for format
     */
    getExtensionForFormat(format) {
        switch (format.toLowerCase()) {
            case 'jpeg': return 'jpg';
            case 'webp': return 'webp';
            case 'png':
            default: return 'png';
        }
    }

    async checkProEngineAvailability() {
        const status = await this.proEngineDownloader.checkProEngineStatus();
        this.proEngineAvailable = status.installed && status.aiModelsLoaded;
        if (status.eligible && !status.installed) {
            this.showProEngineInstallPrompt();
        }
        this.updateProEngineUI(status);
    }

    updateProEngineUI(status) {
        const indicator = document.getElementById('pro-engine-status');
        if (!indicator) return;
        if (status.installed && status.aiModelsLoaded) {
            indicator.textContent = '⚡ Pro Engine Active';
            indicator.className = 'status-indicator pro-engine-active';
        } else if (status.eligible) {
            indicator.textContent = '📥 Pro Engine Available';
            indicator.className = 'status-indicator pro-engine-available';
        } else {
            indicator.textContent = '🔒 Pro Engine (Not Available)';
            indicator.className = 'status-indicator pro-engine-locked';
        }
    }
    

    
    downloadProcessedImage() {
        // Just call the working download method
        this.downloadResult();
    }
    
    updateDownloadButtonState() {
        const downloadBtn = document.getElementById('header-download-btn');
        
        if (!downloadBtn) return;
        
        const hasImage = this.currentImage !== null;
        const hasProcessed = this.processedResult !== null;
        
        // Enable download button as soon as we have ANY image
        if (hasImage || hasProcessed) {
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
            downloadBtn.style.cursor = 'pointer';
            downloadBtn.title = hasProcessed ? 'Download Upscaled Image' : 'Download Image (will upscale automatically)';
        } else {
            downloadBtn.disabled = true;
            downloadBtn.style.opacity = '0.5';
            downloadBtn.style.cursor = 'not-allowed';
            downloadBtn.title = 'Upload an image first';
        }
    }

    showProEngineInstallPrompt() {
        const promptHtml = this.proEngineDownloader.showDownloadPrompt();
        if (this.showModal) {
            this.showModal('Pro Engine Installation', promptHtml);
        } else {
            console.log('Pro Engine prompt:', promptHtml);
        }
        document.getElementById('download-pro-engine')?.addEventListener('click', () => {
            this.handleProEngineDownload();
        });
    }

    async handleProEngineDownload() {
        try {
            this.showNotification('Starting Pro Engine download...', 'info');
            await this.proEngineDownloader.downloadProEngine((progress) => this.updateDownloadProgress?.(progress));
            this.showNotification('Pro Engine downloaded! Please run the installer.', 'success');
        } catch (error) {
            this.showNotification(`Download failed: ${error.message}`, 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new ProUpscalerApp();
});

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.app && typeof window.app.cleanup === 'function') {
        window.app.cleanup();
    }
});


