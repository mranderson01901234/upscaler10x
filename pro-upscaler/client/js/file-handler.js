class FileHandler {
    constructor() {
        this.supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/tiff', 'image/tif'];
        this.maxFileSize = 1.5 * 1024 * 1024 * 1024; // 1.5GB
    }
    
    validateFile(file) {
        if (!file) return false;
        if (!this.supportedTypes.includes(file.type)) return false;
        if (file.size > this.maxFileSize) return false;
        return true;
    }
    
    shouldSkipBrowserPreview(file) {
        // Skip browser preview for extremely large files (>1GB) to avoid memory issues
        const sizeMB = file.size / (1024 * 1024);
        const isTiff = file.type === 'image/tiff' || file.type === 'image/tif';
        
        // Always skip browser preview for TIFF files since browsers can't display them natively
        // Also skip for files over 1GB
        return sizeMB > 1000 || isTiff;
    }

    shouldDownscalePreview(file) {
        // Downscale preview for large files (100MB-1GB) to avoid memory issues
        const sizeMB = file.size / (1024 * 1024);
        const isTiff = file.type === 'image/tiff' || file.type === 'image/tif';
        
        // For TIFF files, always use server-side preview generation (unless extremely large)
        if (isTiff && sizeMB <= 1000) {
            return true; // Use createTiffPreview instead of createDownscaledPreview
        }
        
        // For other formats, downscale if between 100MB-1GB
        return sizeMB > 100 && sizeMB <= 1000 && !isTiff;
    }

    async createDownscaledPreview(file, maxWidth = 1200, maxHeight = 800) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            const timeout = setTimeout(() => {
                reject(new Error('Preview generation timeout'));
            }, 15000); // 15 second timeout for preview
            
            img.onload = () => {
                clearTimeout(timeout);
                
                // Calculate downscale ratio to fit within max dimensions
                const scaleX = maxWidth / img.naturalWidth;
                const scaleY = maxHeight / img.naturalHeight;
                const scale = Math.min(scaleX, scaleY, 1); // Don't upscale, only downscale
                
                const previewWidth = Math.floor(img.naturalWidth * scale);
                const previewHeight = Math.floor(img.naturalHeight * scale);
                
                canvas.width = previewWidth;
                canvas.height = previewHeight;
                
                // Draw downscaled image
                ctx.drawImage(img, 0, 0, previewWidth, previewHeight);
                
                resolve({
                    width: img.naturalWidth, // Original dimensions
                    height: img.naturalHeight, // Original dimensions
                    previewWidth: previewWidth, // Preview dimensions
                    previewHeight: previewHeight, // Preview dimensions
                    dataUrl: canvas.toDataURL('image/jpeg', 0.8), // Compressed preview
                    originalDataUrl: null, // Don't store original for large files
                    file: file,
                    isDownscaled: true,
                    scale: scale
                });
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Failed to create preview'));
            };
            
            // Create object URL instead of data URL for better memory handling
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            
            // Clean up object URL after loading
            img.onload = (originalOnload => {
                return function() {
                    URL.revokeObjectURL(objectUrl);
                    originalOnload.call(this);
                };
            })(img.onload);
        });
    }
    
    async createTiffPreview(file, maxWidth = 1200, maxHeight = 800) {
        // Simplified TIFF preview using local canvas-based conversion
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`📋 Creating TIFF preview using local canvas conversion...`);
                
                const fileSizeMB = file.size / (1024 * 1024);
                
                // For very large TIFF files (>100MB), use metadata estimation
                if (fileSizeMB > 100) {
                    console.log(`⚠️ Large TIFF file (${fileSizeMB.toFixed(1)}MB), using metadata estimation`);
                    
                    // Estimate dimensions based on file size
                    const estimatedPixels = Math.floor(file.size / 4); // 4 bytes per pixel estimate
                    const estimatedDimension = Math.floor(Math.sqrt(estimatedPixels));
                    
                    resolve({
                        width: estimatedDimension,
                        height: estimatedDimension,
                        previewWidth: 0, // No preview available
                        previewHeight: 0, // No preview available
                        dataUrl: null, // No preview data URL
                        originalDataUrl: null,
                        file: file,
                        isDownscaled: false,
                        isTiff: true,
                        isLargeFile: true,
                        scale: 1,
                        format: 'tiff',
                        estimatedSize: fileSizeMB > 1000 ? `${(fileSizeMB/1024).toFixed(1)}GB` : `${fileSizeMB.toFixed(1)}MB`,
                        isTooLargeForPreview: true
                    });
                    return;
                }
                
                // Try local canvas-based preview for smaller TIFF files
                this.createLocalTiffPreview(file, maxWidth, maxHeight)
                    .then(resolve)
                    .catch(() => {
                        // Fallback to metadata estimation if local preview fails
                        console.log('🔄 Local preview failed, using metadata estimation...');
                        const estimatedPixels = Math.floor(file.size / 4);
                        const estimatedDimension = Math.floor(Math.sqrt(estimatedPixels));
                        
                        resolve({
                            width: estimatedDimension,
                            height: estimatedDimension,
                            previewWidth: 0,
                            previewHeight: 0,
                            dataUrl: null,
                            originalDataUrl: null,
                            file: file,
                            isDownscaled: false,
                            isTiff: true,
                            isLargeFile: fileSizeMB > 50,
                            scale: 1,
                            format: 'tiff',
                            estimatedSize: fileSizeMB > 1000 ? `${(fileSizeMB/1024).toFixed(1)}GB` : `${fileSizeMB.toFixed(1)}MB`,
                            previewError: 'Local preview not supported'
                        });
                    });
                
            } catch (error) {
                console.error('❌ TIFF preview setup failed:', error);
                reject(error);
            }
        });
    }

    async createLocalTiffPreview(file, maxWidth = 1200, maxHeight = 800) {
        // Attempt to create a preview using HTML5 Canvas and File API
        return new Promise((resolve, reject) => {
            // Create a hidden canvas for processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            // Set timeout to prevent hanging
            const timeout = setTimeout(() => {
                reject(new Error('TIFF preview timeout'));
            }, 10000); // 10 second timeout
            
            img.onload = () => {
                clearTimeout(timeout);
                
                try {
                    // Calculate preview dimensions
                    const scaleX = maxWidth / img.naturalWidth;
                    const scaleY = maxHeight / img.naturalHeight;
                    const scale = Math.min(scaleX, scaleY, 1); // Don't upscale, only downscale
                    
                    const previewWidth = Math.floor(img.naturalWidth * scale);
                    const previewHeight = Math.floor(img.naturalHeight * scale);
                    
                    // Set canvas size
                    canvas.width = previewWidth;
                    canvas.height = previewHeight;
                    
                    // Draw scaled image
                    ctx.drawImage(img, 0, 0, previewWidth, previewHeight);
                    
                    // Convert to JPEG for browser compatibility
                    const previewDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    
                    console.log(`✅ Local TIFF preview created: ${img.naturalWidth}×${img.naturalHeight} → ${previewWidth}×${previewHeight}`);
                    
                    resolve({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        previewWidth: previewWidth,
                        previewHeight: previewHeight,
                        dataUrl: previewDataUrl,
                        originalDataUrl: img.src,
                        file: file,
                        isDownscaled: true,
                        isTiff: true,
                        isLargeFile: file.size > 50 * 1024 * 1024,
                        scale: scale,
                        format: 'tiff'
                    });
                    
                } catch (canvasError) {
                    clearTimeout(timeout);
                    reject(new Error('Canvas processing failed: ' + canvasError.message));
                }
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Browser cannot display TIFF format'));
            };
            
            // Try to load the TIFF file directly
            // Note: Most browsers don't support TIFF natively, so this will likely fail
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            
            // Clean up object URL after attempt
            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 15000);
        });
    }
    
    getFileSizeWarning(file) {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > 500) {
            return 'large'; // Files over 500MB may take several minutes to process
        } else if (sizeMB > 100) {
            return 'medium'; // Files over 100MB may take longer to process
        }
        return 'normal';
    }
    
    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const img = new Image();
            
            // Add timeout for large files
            const timeout = setTimeout(() => {
                reject(new Error(`File reading timeout - file too large (${Math.round(file.size / 1024 / 1024)}MB)`));
            }, 30000); // 30 second timeout
            
            reader.onload = (e) => {
                img.onload = () => {
                    clearTimeout(timeout);
                    resolve({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        dataUrl: e.target.result,
                        file: file
                    });
                };
                img.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error(`Failed to load image - format may not be supported by browser (${file.type})`));
                };
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                clearTimeout(timeout);
                reject(new Error(`Failed to read file - size: ${Math.round(file.size / 1024 / 1024)}MB`));
            };
            
            // Add progress tracking for large files
            reader.onprogress = (e) => {
                if (e.lengthComputable) {
                    const progress = (e.loaded / e.total) * 100;
                    console.log(`📖 Reading file: ${progress.toFixed(1)}%`);
                }
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    downloadFile(result, filename = null) {
        const link = document.createElement('a');
        link.href = result.dataUrl;
        link.download = filename || `upscaled-${Date.now()}.${result.format}`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
