class ProUpscalerApp {
    constructor() {
        this.currentState = 'idle'; // 'idle', 'ready', 'processing', 'complete'
        this.currentImage = null;
        this.processedResult = null;
        this.startTime = null;
        
        this.initializeApp();
        this.bindEvents();
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
        
        this.updateProStatus();
        this.updateUIState('idle');
    }
    
    bindEvents() {
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
            uploadArea.addEventListener('click', () => fileInput?.click());
        }
        
        document.getElementById('start-processing')?.addEventListener('click', () => this.startUpscaling());
        document.getElementById('output-format')?.addEventListener('change', () => this.updateFormatOptions());
        document.getElementById('scale-factor')?.addEventListener('change', () => this.updateEstimates());
        document.getElementById('processing-mode')?.addEventListener('change', () => this.updateProcessingMode());
        document.getElementById('quality-slider')?.addEventListener('input', (e) => {
            document.getElementById('quality-value').textContent = e.target.value;
            this.updateEstimates();
        });
        
        // File settings event handlers
        document.getElementById('custom-filename')?.addEventListener('input', () => this.validateCustomFilename());
        document.getElementById('browse-location')?.addEventListener('click', () => this.browseDownloadLocation());
        
        // Bind left panel buttons (sidebar results removed)
        document.getElementById('download-button-left')?.addEventListener('click', () => this.downloadResult());
        document.getElementById('process-another-left')?.addEventListener('click', () => this.resetToUpload());
        
        document.getElementById('upgrade-prompt')?.addEventListener('click', () => this.showUpgradeModal());
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
        const noImageState = document.getElementById('no-image-state');
        const imageInfoState = document.getElementById('image-info-state');
        const dimensions = document.getElementById('image-dimensions');
        const size = document.getElementById('image-size');
        const format = document.getElementById('image-format');
        
        // Toggle states
        if (noImageState && imageInfoState) {
            noImageState.classList.add('hidden');
            imageInfoState.classList.remove('hidden');
        }
        
        // Update details
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
        
        if (!format || !qualityControl) return;
        
        if (format === 'jpeg' || format === 'webp') {
            qualityControl.classList.remove('hidden');
        } else {
            qualityControl.classList.add('hidden');
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
        
        // Update UI elements
        const currentSizeEl = document.getElementById('current-size');
        const outputDimensions = document.getElementById('output-dimensions');
        const estimatedSizeEl = document.getElementById('estimated-size');
        const estimatedTimeEl = document.getElementById('estimated-time');
        
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
        
        // Update filename preview
        this.updateFilenamePreview(format);
        
        this.checkUpgradePrompt(estimatedSize);
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
    
    checkUpgradePrompt(estimatedSize) {
        const upgradeCard = document.getElementById('upgrade-card');
        const canvasLeftPanel = document.querySelector('.canvas-left-panel');
        if (!upgradeCard) return;
        
        const largeSizeThreshold = 400 * 1024 * 1024; // 400MB
        
        if (estimatedSize > largeSizeThreshold && !this.proEngine.isAvailable) {
            upgradeCard.classList.remove('hidden');
            if (canvasLeftPanel) {
                canvasLeftPanel.classList.remove('panel-hidden');
            }
        } else {
            upgradeCard.classList.add('hidden');
            if (canvasLeftPanel) {
                canvasLeftPanel.classList.add('panel-hidden');
            }
        }
    }

    async startUpscaling() {
        if (!this.currentImage) return;
        
        this.startTime = Date.now();
        this.updateUIState('processing');
        
        const scaleFactorEl = document.getElementById('scale-factor');
        const formatEl = document.getElementById('output-format');
        const qualityEl = document.getElementById('quality-slider');
        const aiEnhancementEl = document.getElementById('ai-enhancement-toggle');
        
        const scaleFactor = scaleFactorEl ? parseInt(scaleFactorEl.value) : 2;
        const format = formatEl ? formatEl.value : 'png';
        const quality = qualityEl ? parseInt(qualityEl.value) : 95;
        const aiEnhancement = aiEnhancementEl ? aiEnhancementEl.checked : false;
        
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
                
                // Prepare result object for pro-engine
                const proEngineResult = {
                    dataUrl: imageDataUrl,
                    scaleFactor: scaleFactor,
                    format: format,
                    quality: quality,
                    width: this.currentImage.width * scaleFactor,
                    height: this.currentImage.height * scaleFactor,
                    size: this.estimateFileSize(this.currentImage.width * scaleFactor, this.currentImage.height * scaleFactor, format, quality)
                };
                
                this.updateProgress(50, aiEnhancement ? 'Sending to Pro Engine for AI-enhanced upscaling...' : 'Sending to Pro Engine for upscaling...');
                
                // Prepare AI enhancement options
                const processingOptions = {
                    aiEnhancement: aiEnhancement,
                    aiPreferences: {
                        fidelity: 0.05  // Optimized parameter from testing
                    }
                };
                
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
                
                // Update UI state to complete
                this.updateUIState('complete');
                
                // Show comprehensive completion modal for large files
                this.showLargeFileCompletionModal(proEngineResult, processingTime);
                
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
    
    updateProgress(percent, message) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const progressPercent = document.getElementById('progress-percent');
        const elapsedTime = document.getElementById('elapsed-time');
        const remainingTime = document.getElementById('remaining-time');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) {
            progressText.textContent = message;
            // Also update the detailed progress text for better user feedback
            console.log(`📊 Progress: ${Math.round(percent)}% - ${message}`);
        }
        if (progressPercent) progressPercent.textContent = `${Math.round(percent)}%`;
        
        if (this.startTime && elapsedTime) {
            const elapsed = Math.round((Date.now() - this.startTime) / 1000);
            elapsedTime.textContent = `${elapsed}s`;
            
            if (percent > 0 && remainingTime) {
                const estimated = Math.round((elapsed / percent) * (100 - percent));
                remainingTime.textContent = `~${estimated}s`;
            }
        }
    }
    
    showResults(result) {
        this.updateUIState('complete');
        
        // Update left panel results (primary location)
        const finalDimensionsLeft = document.getElementById('final-dimensions-left');
        const finalSizeLeft = document.getElementById('final-size-left');
        const actualTimeLeft = document.getElementById('actual-time-left');
        const finalFormatLeft = document.getElementById('final-format-left');
        const completedResultsCard = document.getElementById('completed-results-card');
        const resultsLeftPanel = document.getElementById('results-left-panel');
        
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
        
        // Show left panel results card and make panel visible
        if (completedResultsCard) completedResultsCard.classList.remove('hidden');
        if (resultsLeftPanel) resultsLeftPanel.classList.add('show-results');
        
        // USE NEW PRESENTATION SYSTEM FOR OPTIMAL DISPLAY
        this.presentResultWithNewSystem(result);
        
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
        
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        
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
        
        // Hide left panel results and make panel invisible
        const completedResultsCard = document.getElementById('completed-results-card');
        const resultsLeftPanel = document.getElementById('results-left-panel');
        const optimizedResultContainer = document.getElementById('optimized-result-container');
        
        if (completedResultsCard) completedResultsCard.classList.add('hidden');
        if (resultsLeftPanel) resultsLeftPanel.classList.remove('show-results');
        if (optimizedResultContainer) optimizedResultContainer.innerHTML = '';
        
        this.updateUIState('idle');
    }
    
    /**
     * Present result with new optimal presentation system
     */
    async presentResultWithNewSystem(result) {
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
                // Progress footer always visible - just ensure it's shown
                if (progressFooter) progressFooter.classList.remove('hidden');
                if (startButton) {
                    startButton.disabled = true;
                }
                break;
            case 'ready':
                // Progress footer always visible - just ensure it's shown
                if (progressFooter) progressFooter.classList.remove('hidden');
                if (startButton) {
                    startButton.disabled = false;
                }
                break;
            case 'processing':
                // Progress footer always visible - ensure it's shown
                if (progressFooter) progressFooter.classList.remove('hidden');
                if (startButton) {
                    startButton.disabled = true;
                }
                break;
            case 'complete':
                // Progress footer always visible - keep it shown
                if (progressFooter) progressFooter.classList.remove('hidden');
                // Note: Download and Process Another buttons are now in the left panel
                // They're shown via the showResults() method when the left panel is displayed
                break;
        }
    }
    
    updateProStatus() {
        const proStatus = document.getElementById('pro-status');
        if (!proStatus) return;
        
        const statusIndicator = proStatus.querySelector('.h-2');
        const statusText = proStatus.querySelector('span:last-child');
        
        if (this.proEngine.isAvailable) {
            if (statusIndicator) statusIndicator.className = 'h-2 w-2 rounded-full bg-blue-500';
            if (statusText) statusText.textContent = 'Pro Engine Ready';
            proStatus.className = 'pro-status flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400';
        }
    }
    
    showUpgradeModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4">
                <div class="text-center">
                    <h2 class="text-xl font-semibold mb-2">Upgrade to Pro</h2>
                    <p class="text-muted-foreground">Unlock lightning-fast downloads for large files</p>
                </div>
                
                <div class="space-y-3 text-sm">
                    <div class="flex items-center space-x-3">
                        <span class="text-emerald-500">✓</span>
                        <span>10× faster downloads</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-emerald-500">✓</span>
                        <span>Background processing</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-emerald-500">✓</span>
                        <span>All format options</span>
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button class="btn-primary flex-1" onclick="window.open('/upgrade', '_blank')">
                        Upgrade Now
                    </button>
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-12 right-4 p-3 rounded-lg shadow-lg z-40 max-w-sm text-sm ${
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'success' ? 'bg-emerald-500 text-white' :
            type === 'warning' ? 'bg-amber-500 text-white' :
            'bg-card border border-border'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
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
        
        // Show filename in status area immediately
        this.showDownloadedFilename(expectedFilename, 'Downloads/ProUpscaler/');
        
        // Check if this was a 10x upscale that got adjusted to 8x
        const scaleFactor = document.getElementById('scale-factor')?.value || 10;
        const isAdjustedScale = parseInt(scaleFactor) === 10;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
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
        if (!previewEl) return;
        
        const customName = document.getElementById('custom-filename')?.value.trim();
        
        if (customName && this.validateCustomFilename()) {
            // Show custom filename with extension
            const extension = this.getExtensionForFormat(format);
            const filename = customName.endsWith(`.${extension}`) ? customName : `${customName}.${extension}`;
            previewEl.textContent = filename;
            previewEl.title = `Custom filename: ${filename}`;
        } else {
            // Show auto-generated preview
            previewEl.textContent = 'Auto-generated';
            previewEl.title = 'Filename will be automatically generated based on timestamp and session ID';
        }
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
