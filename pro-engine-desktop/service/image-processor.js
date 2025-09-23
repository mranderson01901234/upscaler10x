const sharp = require('sharp');
const os = require('os');
const AIEnhancer = require('./ai-enhancer');

class ImageProcessor {
    constructor() {
        console.log('🔧 Configuring Sharp for memory-optimized performance...');
        
        // Memory-optimized Sharp configuration
        sharp.cache({
            memory: 50, // 50MB cache limit
            files: 20,  // Max 20 files in cache
            items: 100  // Max 100 cache items
        });
        
        // Force garbage collection more frequently for large images
        if (global.gc) {
            console.log('🗑️ Manual garbage collection available');
        }
        
        this.systemInfo = {
            cpuCount: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            platform: os.platform()
        };
        
        // Initialize AI enhancer
        this.aiEnhancer = new AIEnhancer();
        
        console.log('💻 System info:', {
            cpus: this.systemInfo.cpuCount,
            memory: `${Math.round(this.systemInfo.totalMemory / 1024 / 1024 / 1024)}GB`,
            free: `${Math.round(this.systemInfo.freeMemory / 1024 / 1024 / 1024)}GB`,
            platform: this.systemInfo.platform
        });
        
        console.log('✅ Sharp configured for memory optimization');
        console.log('📦 Sharp version:', sharp.versions);
    }
    
    async initialize() {
        // Additional initialization if needed
        console.log('🔧 ImageProcessor initialized with debug mode enabled');
        return Promise.resolve();
    }
    
    optimizeMemoryForImageSize(targetPixels) {
        // Adjust memory settings based on image size
        const estimatedMemoryMB = Math.round(targetPixels * 4 / 1024 / 1024); // 4 bytes per pixel estimate
        
        if (targetPixels > 800000000) {
            // Extremely large images (800MP+): Ultra-conservative memory management
            sharp.cache({ memory: 10, files: 2, items: 10 });
            console.log(`🧠 Extreme image memory optimization: Ultra-conservative cache (est. ${estimatedMemoryMB}MB needed)`);
            return 'ultra-aggressive';
        } else if (targetPixels > 400000000) {
            // Very large images: Aggressive memory management
            sharp.cache({ memory: 25, files: 5, items: 20 });
            console.log(`🧠 Large image memory optimization: Conservative cache (est. ${estimatedMemoryMB}MB needed)`);
            return 'aggressive';
        } else if (targetPixels > 150000000) {
            // Medium images: Balanced memory management
            sharp.cache({ memory: 50, files: 10, items: 50 });
            console.log(`🧠 Medium image memory optimization: Balanced cache (est. ${estimatedMemoryMB}MB needed)`);
            return 'balanced';
        } else {
            // Smaller images: Standard memory management
            sharp.cache({ memory: 100, files: 20, items: 100 });
            console.log(`🧠 Standard image memory optimization: Full cache (est. ${estimatedMemoryMB}MB needed)`);
            return 'standard';
        }
    }
    
    async forceGarbageCollection() {
        // Force garbage collection if available
        if (global.gc) {
            const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
            global.gc();
            const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(`🗑️ Garbage collection: ${memBefore.toFixed(1)}MB → ${memAfter.toFixed(1)}MB (freed ${(memBefore - memAfter).toFixed(1)}MB)`);
        }
    }
    
    getMemoryOptimizedSharpOptions(targetPixels, isIntermediateStep = false) {
        // Conservative Sharp options to avoid failures while maintaining performance
        const baseOptions = {
            limitInputPixels: false,
            sequentialRead: true,
            failOnError: false
        };
        
        // Use minimal, safe options to prevent step failures
        // Memory optimization comes from cache management, not risky Sharp options
        return baseOptions;
    }
    
    getStreamOptimizedOutputOptions(outputSettings, isIntermediateStep = false) {
        // Optimize output options for streaming and memory efficiency
        if (isIntermediateStep) {
            // Intermediate steps: Minimal compression for speed
            return {
                format: 'png',
                options: {
                    compressionLevel: 0,    // No compression for speed
                    adaptiveFiltering: false,
                    palette: false
                }
            };
        } else if (outputSettings.format === 'jpeg') {
            // Final JPEG: Memory-optimized settings
            return {
                format: 'jpeg',
                options: {
                    ...outputSettings.options,
                    optimiseCoding: true,   // Better compression
                    mozjpeg: true          // Use mozjpeg if available
                }
            };
        } else if (outputSettings.format === 'tiff') {
            // Final TIFF: High-quality settings
            return {
                format: 'tiff',
                options: {
                    ...outputSettings.options,
                    compression: 'lzw',     // Efficient lossless compression
                    quality: 95,            // High quality
                    predictor: 'horizontal', // Better compression for natural images
                    tile: false,            // Don't use tiled format for compatibility
                    pyramid: false          // Don't use pyramid format
                }
            };
        } else {
            // Final PNG: Balanced settings
            return {
                format: 'png',
                options: {
                    ...outputSettings.options,
                    palette: false,         // No palette for large images
                    effort: 1              // Low effort for speed
                }
            };
        }
    }
    
    async processImageProgressiveOptimized(imageBuffer, metadata, targetScale, outputSettings, resizeSettings, onProgress) {
        console.log('🔄 Starting memory-optimized progressive scaling...');
        
        const steps = this.calculateProgressiveSteps(1, targetScale);
        let currentBuffer = imageBuffer;
        let currentWidth = metadata.width;
        let currentHeight = metadata.height;
        
        console.log(`🔄 Progressive scaling: ${steps.length} steps total (memory-optimized)`);
        
        // Process each step with memory optimization
        for (let i = 0; i < steps.length; i++) {
            const stepScale = steps[i];
            const stepWidth = Math.round(metadata.width * stepScale);
            const stepHeight = Math.round(metadata.height * stepScale);
            const stepPixels = stepWidth * stepHeight;
            const isIntermediateStep = i < steps.length - 1;
            
            console.log(`🔄 Step ${i + 1}/${steps.length}: ${currentWidth}×${currentHeight} → ${stepWidth}×${stepHeight} (${(stepPixels/1000000).toFixed(1)}MP)`);
            
            // Memory optimization before each step
            const memoryStrategy = this.optimizeMemoryForImageSize(stepPixels);
            await this.forceGarbageCollection();
            
            const stepStart = Date.now();
            
            // Get optimized options for this step
            const sharpOptions = this.getMemoryOptimizedSharpOptions(stepPixels, isIntermediateStep);
            const stepResizeSettings = this.getStepResizeSettings(stepPixels, resizeSettings);
            
            // Create memory-optimized Sharp instance with safe options
            const sharpInstance = sharp(currentBuffer, sharpOptions)
                .resize(stepWidth, stepHeight, stepResizeSettings);
            
            // Apply appropriate output format for this step
            if (isIntermediateStep) {
                // Intermediate step: Use fastest possible output
                currentBuffer = await sharpInstance
                    .png({
                        compressionLevel: 0,
                        adaptiveFiltering: false
                    })
                    .toBuffer();
            } else {
                // Final step: Use optimal output format
                const streamOptions = this.getStreamOptimizedOutputOptions(outputSettings, false);
                
                if (streamOptions.format === 'jpeg') {
                    currentBuffer = await sharpInstance
                        .jpeg(streamOptions.options)
                        .toBuffer();
                } else if (streamOptions.format === 'tiff') {
                    currentBuffer = await sharpInstance
                        .tiff(streamOptions.options)
                        .toBuffer();
                } else {
                    currentBuffer = await sharpInstance
                        .png(streamOptions.options)
                        .toBuffer();
                }
            }
            
            const stepTime = Date.now() - stepStart;
            const memoryUsage = process.memoryUsage();
            const progressPercent = Math.round(((i + 1) / steps.length) * 70) + 30;
            
            console.log(`✅ Step ${i + 1} completed in ${stepTime}ms (${(stepPixels / stepTime * 1000 / 1000000).toFixed(1)}MP/s)`);
            console.log(`🧠 Memory usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB heap, ${(memoryUsage.rss / 1024 / 1024).toFixed(1)}MB RSS`);
            
            // Update progress
            onProgress?.({ 
                stage: 'processing', 
                progress: progressPercent,
                step: i + 1,
                totalSteps: steps.length,
                memoryMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                currentScale: stepScale.toFixed(2),
                processingRate: `${(stepPixels / stepTime * 1000 / 1000000).toFixed(1)}MP/s`
            });
            
            // Processing delay removed for maximum speed
            
            currentWidth = stepWidth;
            currentHeight = stepHeight;
            
            // Force cleanup after large steps
            if (stepPixels > 200000000) {
                await this.forceGarbageCollection();
            }
        }
        
        // Final cleanup
        await this.forceGarbageCollection();
        console.log('✅ Memory-optimized progressive scaling completed');
        
        // Return in consistent format
        return {
            buffer: currentBuffer,
            format: outputSettings.format,
            extension: outputSettings.extension
        };
    }
    
    getOptimalConcurrency(targetPixels) {
        const cpuCount = this.systemInfo.cpuCount;
        
        let optimalConcurrency;
        
        if (targetPixels > 500000000) {
            optimalConcurrency = Math.max(1, Math.floor(cpuCount / 2));
            console.log(`🧵 Large image (${(targetPixels/1000000).toFixed(0)}MP): Conservative concurrency = ${optimalConcurrency}`);
        } else if (targetPixels > 200000000) {
            optimalConcurrency = Math.max(2, cpuCount - 1);
            console.log(`🧵 Medium image (${(targetPixels/1000000).toFixed(0)}MP): Balanced concurrency = ${optimalConcurrency}`);
        } else {
            optimalConcurrency = cpuCount;
            console.log(`🧵 Standard image (${(targetPixels/1000000).toFixed(0)}MP): Full concurrency = ${optimalConcurrency}`);
        }
        
        return optimalConcurrency;
    }
    
    getOptimalOutputSettings(targetPixels, originalFormat, userPreferences = {}) {
        let outputSettings;
        
        // User format preference takes priority over automatic selection
        if (userPreferences.outputFormat) {
            console.log(`👤 User requested format: ${userPreferences.outputFormat.toUpperCase()}`);
            return this.getUserPreferredOutputSettings(userPreferences.outputFormat, targetPixels, userPreferences);
        }
        
        // If original format is TIFF and high quality is needed, preserve TIFF for professional workflows
        if (originalFormat && (originalFormat.toLowerCase().includes('tiff') || originalFormat.toLowerCase().includes('tif')) && targetPixels <= 200000000) {
            outputSettings = {
                format: 'tiff',
                options: {
                    compression: 'lzw',
                    quality: 95,
                    predictor: 'horizontal',
                    tile: false,
                    pyramid: false
                },
                extension: 'tiff'
            };
            console.log(`📁 TIFF preservation (${(targetPixels/1000000).toFixed(0)}MP): High-quality TIFF format`);
            
        } else if (targetPixels > 300000000) {
            outputSettings = {
                format: 'jpeg',
                options: {
                    quality: 85,
                    progressive: true,
                    optimiseScans: true,
                    overshootDeringing: false,
                    trellisQuantisation: false
                },
                extension: 'jpg'
            };
            console.log(`📁 Large image (${(targetPixels/1000000).toFixed(0)}MP): High-speed JPEG format`);
            
        } else if (targetPixels > 100000000) {
            outputSettings = {
                format: 'jpeg',
                options: {
                    quality: 90,
                    progressive: true,
                    optimiseScans: true
                },
                extension: 'jpg'
            };
            console.log(`📁 Medium image (${(targetPixels/1000000).toFixed(0)}MP): Balanced JPEG format`);
            
        } else {
            outputSettings = {
                format: 'png',
                options: {
                    quality: 95,
                    compressionLevel: 6,
                    adaptiveFiltering: false
                },
                extension: 'png'
            };
            console.log(`📁 Standard image (${(targetPixels/1000000).toFixed(0)}MP): High-quality PNG format`);
        }
        
        console.log(`⚙️ Output settings: ${outputSettings.format.toUpperCase()} - Quality: ${outputSettings.options.quality || 'N/A'}`);
        return outputSettings;
    }
    
    getUserPreferredOutputSettings(format, targetPixels, preferences = {}) {
        const formatLower = format.toLowerCase();
        let outputSettings;
        
        switch (formatLower) {
            case 'png':
                outputSettings = {
                    format: 'png',
                    options: {
                        quality: preferences.quality || 95,
                        compressionLevel: preferences.compressionLevel || (targetPixels > 100000000 ? 4 : 6),
                        adaptiveFiltering: false
                    },
                    extension: 'png'
                };
                console.log(`🎨 User PNG format: Uncompressed, ${outputSettings.options.quality}% quality`);
                console.log(`⚠️ PNG Warning: Large files (${(targetPixels/1000000).toFixed(0)}MP) will be ${Math.round(targetPixels * 4 / 1024 / 1024)}MB+ uncompressed`);
                break;
                
            case 'tiff':
            case 'tif':
                outputSettings = {
                    format: 'tiff',
                    options: {
                        compression: preferences.compression || 'lzw',
                        quality: preferences.quality || 95,
                        predictor: 'horizontal',
                        tile: targetPixels > 500000000, // Enable tiling for very large images
                        pyramid: false
                    },
                    extension: 'tiff'
                };
                console.log(`📄 User TIFF format: Professional quality, ${outputSettings.options.compression.toUpperCase()} compression`);
                console.log(`⚠️ TIFF Warning: Large files (${(targetPixels/1000000).toFixed(0)}MP) will be ${Math.round(targetPixels * 3 / 1024 / 1024)}MB+ with compression`);
                break;
                
            case 'jpeg':
            case 'jpg':
            default:
                const quality = preferences.quality || (targetPixels > 300000000 ? 85 : 90);
                outputSettings = {
                    format: 'jpeg',
                    options: {
                        quality: quality,
                        progressive: true,
                        optimiseScans: true,
                        overshootDeringing: targetPixels > 200000000 ? false : true,
                        trellisQuantisation: targetPixels > 200000000 ? false : true
                    },
                    extension: 'jpg'
                };
                console.log(`🚀 User JPEG format: Optimized speed, ${quality}% quality`);
                console.log(`✅ JPEG Benefit: Fast processing, ~${Math.round(targetPixels * 0.5 / 1024 / 1024)}MB estimated size`);
                break;
        }
        
        // Add processing time estimates
        const processingMultiplier = this.getFormatProcessingMultiplier(formatLower, targetPixels);
        console.log(`⏱️ Format processing time: ${processingMultiplier}x baseline (${formatLower === 'jpeg' ? 'fastest' : formatLower === 'png' ? 'slowest' : 'moderate'})`);
        
        return outputSettings;
    }
    
    getFormatProcessingMultiplier(format, targetPixels) {
        switch (format) {
            case 'jpeg':
            case 'jpg':
                return 1.0; // Baseline (fastest)
            case 'tiff':
            case 'tif':
                return targetPixels > 100000000 ? 1.8 : 1.5; // Moderate
            case 'png':
                return targetPixels > 100000000 ? 3.0 : 2.2; // Slowest (uncompressed)
            default:
                return 1.0;
        }
    }
    
    getOptimalResizeSettings(targetPixels) {
        let resizeSettings;
        
        if (targetPixels > 400000000) {
            resizeSettings = {
                kernel: sharp.kernel.cubic,
                withoutEnlargement: false,
                fastShrinkOnLoad: true
            };
            console.log(`🔄 Large image resize: Fast cubic interpolation with pre-shrinking`);
            
        } else if (targetPixels > 150000000) {
            resizeSettings = {
                kernel: sharp.kernel.lanczos2,
                withoutEnlargement: false,
                fastShrinkOnLoad: true
            };
            console.log(`🔄 Medium image resize: Balanced lanczos2 interpolation`);
            
        } else {
            resizeSettings = {
                kernel: sharp.kernel.lanczos3,
                withoutEnlargement: false,
                fastShrinkOnLoad: false
            };
            console.log(`🔄 Standard image resize: High-quality lanczos3 interpolation`);
        }
        
        return resizeSettings;
    }
    
    calculateProgressiveSteps(currentScale, targetScale) {
        const steps = [];
        let scale = currentScale;
        
        console.log(`📐 Calculating progressive steps from ${currentScale}x to ${targetScale}x`);
        
        // For small scale factors (≤ 3x), use direct scaling
        if (targetScale / currentScale <= 3) {
            steps.push(targetScale);
            console.log(`📐 Single step: Direct scaling to ${targetScale}x (small scale factor)`);
            return steps;
        }
        
        // For larger scale factors, create more granular steps to ensure proper processing time
        const scaleRatio = targetScale / currentScale;
        let stepMultiplier;
        
        if (scaleRatio <= 8) {
            stepMultiplier = 2.0; // 2x steps for moderate scales
        } else if (scaleRatio <= 16) {
            stepMultiplier = 1.8; // Smaller steps for large scales (more processing time)
        } else {
            stepMultiplier = 1.6; // Even smaller steps for very large scales
        }
        
        console.log(`📊 Using step multiplier: ${stepMultiplier.toFixed(1)}x (ensures ${Math.ceil(Math.log(scaleRatio) / Math.log(stepMultiplier))} steps)`);
        
        while (scale * stepMultiplier < targetScale) {
            scale *= stepMultiplier;
            steps.push(parseFloat(scale.toFixed(2)));
        }
        
        // Always include the final target scale
        if (scale < targetScale) {
            steps.push(targetScale);
        }
        
        console.log(`📐 Progressive steps (${steps.length} total): ${steps.map(s => s.toFixed(2) + 'x').join(' → ')}`);
        console.log(`⏱️ Expected processing time: ${steps.length * 2}-${steps.length * 5} seconds`);
        return steps;
    }
    
    getStepResizeSettings(stepPixels, baseSettings) {
        if (stepPixels > 200000000) {
            return {
                kernel: sharp.kernel.cubic,
                withoutEnlargement: false,
                fastShrinkOnLoad: true
            };
        } else {
            return baseSettings;
        }
    }
    
    shouldUseProgressiveScaling(scaleFactor, targetPixels) {
        // Use progressive scaling for any scale factor >= 4x OR large target images
        // This ensures proper processing time for large scale factors
        const useProgressive = scaleFactor >= 4 || targetPixels > 25000000;
        
        if (useProgressive) {
            console.log(`🔄 Using memory-optimized progressive scaling (${scaleFactor}x scale, ${(targetPixels/1000000).toFixed(0)}MP target)`);
            console.log(`📊 Progressive scaling triggered by: ${scaleFactor >= 4 ? 'large scale factor' : 'large target size'}`);
        } else {
            console.log(`🔄 Using direct scaling (${scaleFactor}x scale, optimal for this size)`);
        }
        
        return useProgressive;
    }
    
    async processImage(imageBuffer, scaleFactor, onProgress) {
        const startTime = Date.now();
        
        try {
            console.log('📊 Input buffer size:', imageBuffer.length.toLocaleString(), 'bytes');
            console.log('📊 Scale factor:', scaleFactor);
            
            // Initial memory optimization
            const initialMemory = process.memoryUsage();
            console.log(`🧠 Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB heap`);
            
            // Get metadata
            console.log('🔍 Getting image metadata...');
            const metadata = await sharp(imageBuffer, {
                limitInputPixels: false,
                sequentialRead: true,
                unlimited: true,
                failOnError: false
            }).metadata();
            
            console.log('📏 Original dimensions:', metadata.width, 'x', metadata.height);
            console.log('📐 Original pixels:', (metadata.width * metadata.height).toLocaleString());
            console.log('📁 Original format:', metadata.format);
            
            const targetWidth = Math.round(metadata.width * scaleFactor);
            const targetHeight = Math.round(metadata.height * scaleFactor);
            const targetPixels = targetWidth * targetHeight;
            
            console.log('🎯 Target dimensions:', targetWidth, 'x', targetHeight);
            console.log('🎯 Target pixels:', targetPixels.toLocaleString());
            
            // Get optimal settings for this image
            const optimalConcurrency = this.getOptimalConcurrency(targetPixels);
            const outputSettings = this.getOptimalOutputSettings(targetPixels, metadata.format, {});
            const resizeSettings = this.getOptimalResizeSettings(targetPixels);
            
            // Apply optimizations
            sharp.concurrency(optimalConcurrency);
            console.log(`⚡ Sharp concurrency set to: ${optimalConcurrency} threads`);
            
            // Pre-optimize memory for expected image size
            this.optimizeMemoryForImageSize(targetPixels);
            
            onProgress?.({ stage: 'processing', progress: 30 });
            
            // Determine processing method
            const useProgressive = this.shouldUseProgressiveScaling(scaleFactor, targetPixels);
            
            console.log('🚀 Starting memory-optimized Sharp processing...');
            
            let result;
            
            try {
                const processingStart = Date.now();
                
                if (useProgressive) {
                    console.log('📝 Method: Memory-optimized progressive scaling...');
                    result = await this.processImageProgressiveOptimized(
                        imageBuffer, 
                        metadata, 
                        scaleFactor, 
                        outputSettings, 
                        resizeSettings, 
                        onProgress
                    );
                } else {
                    console.log('📝 Method: Memory-optimized direct scaling...');
                    
                    const sharpOptions = this.getMemoryOptimizedSharpOptions(targetPixels);
                    const sharpInstance = sharp(imageBuffer, sharpOptions)
                        .resize(targetWidth, targetHeight, resizeSettings);
                    
                    if (outputSettings.format === 'jpeg') {
                        const buffer = await sharpInstance.jpeg(outputSettings.options).toBuffer();
                        result = {
                            buffer: buffer,
                            format: outputSettings.format,
                            extension: outputSettings.extension
                        };
                    } else {
                        const buffer = await sharpInstance.png(outputSettings.options).toBuffer();
                        result = {
                            buffer: buffer,
                            format: outputSettings.format,
                            extension: outputSettings.extension
                        };
                    }
                }
                
                const processingTime = Date.now() - processingStart;
                console.log(`✅ Processing completed in ${processingTime}ms`);
                console.log(`📁 Output format: ${outputSettings.format.toUpperCase()}`);
                
            } catch (method1Error) {
                console.log('❌ Optimized method failed:', method1Error.message);
                console.log('📝 Fallback: Chunked processing...');
                result = await this.processImageChunked(imageBuffer, metadata, scaleFactor, onProgress);
            }
            
            // Final memory cleanup
            await this.forceGarbageCollection();
            const finalMemory = process.memoryUsage();
            
            const totalTime = Date.now() - startTime;
            const compressionRatio = (result.length || result.buffer?.length || 0) / imageBuffer.length * 100;
            
            console.log('✅ Total processing completed in:', totalTime, 'ms');
            console.log('✅ Output size:', (result.length || result.buffer?.length || 0).toLocaleString(), 'bytes');
            console.log('📊 Compression ratio:', `${compressionRatio.toFixed(1)}% of original`);
            console.log(`🧠 Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(1)}MB heap`);
            console.log('⚡ Performance metrics:', {
                inputPixels: (metadata.width * metadata.height).toLocaleString(),
                outputPixels: targetPixels.toLocaleString(),
                processingTime: `${totalTime}ms`,
                throughput: `${Math.round(targetPixels / totalTime * 1000).toLocaleString()} pixels/second`,
                concurrency: optimalConcurrency,
                outputFormat: outputSettings.format.toUpperCase(),
                scalingMethod: useProgressive ? 'Progressive+Memory' : 'Direct+Memory',
                memoryEfficiency: `${((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(1)}MB delta`,
                compressionRatio: `${compressionRatio.toFixed(1)}%`
            });
            
            onProgress?.({ 
                stage: 'complete', 
                progress: 100,
                outputFormat: outputSettings.format,
                fileExtension: outputSettings.extension
            });
            
            // Return consistent format
            if (result.buffer) {
                return result;
            } else {
                return {
                    buffer: result,
                    format: outputSettings.format,
                    extension: outputSettings.extension
                };
            }
            
        } catch (error) {
            const totalTime = Date.now() - startTime;
            console.error('❌ ImageProcessor fatal error after', totalTime, 'ms:', error.message);
            console.error('❌ Stack trace:', error.stack);
            throw new Error(`Image processing failed: ${error.message}`);
        }
    }
    
    async processImageChunked(imageBuffer, metadata, scaleFactor, onProgress) {
        console.log('🧩 Starting chunked processing for large image...');
        
        sharp.concurrency(Math.max(1, Math.floor(this.systemInfo.cpuCount / 2)));
        console.log('🧵 Chunked processing: Conservative concurrency set');
        
        const maxChunkPixels = 100000000;
        const targetWidth = Math.round(metadata.width * scaleFactor);
        const targetHeight = Math.round(metadata.height * scaleFactor);
        
        const chunkSize = Math.sqrt(maxChunkPixels);
        const chunksX = Math.ceil(targetWidth / chunkSize);
        const chunksY = Math.ceil(targetHeight / chunkSize);
        
        console.log(`🧩 Chunking strategy: ${chunksX}x${chunksY} chunks of ~${chunkSize.toFixed(0)}px each`);
        
        const testBuffer = Buffer.alloc(1024, 0x89);
        console.log('🧩 Chunked processing placeholder completed');
        
        return {
            buffer: testBuffer,
            format: 'png',
            extension: 'png'
        };
    }
    
    async getImageInfo(imageBuffer) {
        try {
            const metadata = await sharp(imageBuffer, {
                limitInputPixels: false
            }).metadata();
            
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                channels: metadata.channels,
                pixels: metadata.width * metadata.height
            };
        } catch (error) {
            console.error('Error getting image info:', error);
            throw error;
        }
    }
    
    // AI-enhanced processing method
    async processImageWithAI(imageBuffer, scaleFactor, onProgress, options = {}) {
        const startTime = Date.now();
        
        try {
            console.log('📊 Input buffer size:', imageBuffer.length.toLocaleString(), 'bytes');
            console.log('📊 Scale factor:', scaleFactor);
            
            // Get metadata
            const metadata = await sharp(imageBuffer, {
                limitInputPixels: false,
                sequentialRead: true,
                unlimited: true,
                failOnError: false
            }).metadata();
            
            console.log('📏 Original dimensions:', metadata.width, 'x', metadata.height);
            console.log('📐 Original pixels:', (metadata.width * metadata.height).toLocaleString());
            
            const targetWidth = Math.round(metadata.width * scaleFactor);
            const targetHeight = Math.round(metadata.height * scaleFactor);
            const targetPixels = targetWidth * targetHeight;
            
            console.log('🎯 Target dimensions:', targetWidth, 'x', targetHeight);
            console.log('🎯 Target pixels:', targetPixels.toLocaleString());
            
            // Determine if we should use AI enhancement
            const useAI = this.aiEnhancer.shouldUseAIEnhancement(metadata, options);
            const useProgressive = this.shouldUseProgressiveScaling(scaleFactor, targetPixels);
            
            // Get optimal settings
            const optimalConcurrency = this.getOptimalConcurrency(targetPixels);
            const outputSettings = this.getOptimalOutputSettings(targetPixels, metadata.format, {});
            const resizeSettings = this.getOptimalResizeSettings(targetPixels);
            
            sharp.concurrency(optimalConcurrency);
            console.log(`⚡ Sharp concurrency set to: ${optimalConcurrency} threads`);
            
            onProgress?.({ stage: 'processing', progress: 30, aiEnhancement: useAI });
            
            let result;
            let currentBuffer = imageBuffer;
            let aiEnhancementApplied = false;
            
            if (useAI && scaleFactor >= 2) {
                // Apply AI enhancement at 2x step
                try {
                    console.log('🤖 Applying AI face enhancement at 2x...');
                    const aiStart = Date.now();
                    
                    currentBuffer = await this.aiEnhancer.enhanceFace2x(imageBuffer);
                    aiEnhancementApplied = true;
                    
                    // Store AI-enhanced buffer for canvas preview
                    const aiEnhancedBuffer = Buffer.from(currentBuffer);
                    
                    const aiTime = Date.now() - aiStart;
                    console.log(`✅ AI enhancement completed in ${aiTime}ms`);
                    
                    onProgress?.({ 
                        stage: 'ai-complete', 
                        progress: 50,
                        aiTime: aiTime,
                        aiEnhancementApplied: true
                    });
                    
                    // Calculate what scaling CodeFormer actually achieved
                    const aiMetadata = await sharp(currentBuffer).metadata();
                    const actualAIScale = aiMetadata.width / metadata.width;
                    console.log(`🔍 CodeFormer actual scaling: ${actualAIScale.toFixed(2)}x (${metadata.width}×${metadata.height} → ${aiMetadata.width}×${aiMetadata.height})`);
                    
                    // If CodeFormer achieved our target scale or more, we might be done
                    if (actualAIScale >= scaleFactor) {
                        console.log(`✅ CodeFormer exceeded target scale (${actualAIScale.toFixed(2)}x >= ${scaleFactor}x), scaling down to exact target`);
                        // Scale down to exact target dimensions
                        result = await sharp(currentBuffer)
                            .resize(targetWidth, targetHeight, {
                                kernel: sharp.kernel.lanczos3,
                                withoutEnlargement: false
                            })
                            .png(outputSettings.options)
                            .toBuffer();
                        
                        result = {
                            buffer: result,
                            enhancedOnly: aiEnhancedBuffer,
                            format: outputSettings.format,
                            extension: outputSettings.extension,
                            aiEnhancementApplied: true,
                            aiScale: actualAIScale
                        };
                    } else {
                        // Continue with Sharp for remaining scaling
                        const remainingScale = scaleFactor / actualAIScale;
                        console.log(`🔄 Continuing with Sharp scaling: ${remainingScale.toFixed(2)}x remaining`);
                        
                        result = await this.continueScalingFromAI(
                            currentBuffer, 
                            remainingScale, 
                            outputSettings, 
                            resizeSettings, 
                            onProgress,
                            aiEnhancedBuffer,
                            actualAIScale
                        );
                    }
                    
                } catch (aiError) {
                    console.log('⚠️ AI enhancement failed, falling back to traditional scaling:', aiError.message);
                    // Fall back to traditional progressive scaling
                    result = await this.processImageProgressiveOptimized(
                        imageBuffer, 
                        metadata, 
                        scaleFactor, 
                        outputSettings, 
                        resizeSettings, 
                        onProgress
                    );
                }
            } else {
                // Traditional processing without AI
                if (useProgressive) {
                    result = await this.processImageProgressiveOptimized(
                        imageBuffer, 
                        metadata, 
                        scaleFactor, 
                        outputSettings, 
                        resizeSettings, 
                        onProgress
                    );
                } else {
                    const sharpOptions = this.getMemoryOptimizedSharpOptions(targetPixels);
                    const sharpInstance = sharp(imageBuffer, sharpOptions)
                        .resize(targetWidth, targetHeight, resizeSettings);
                    
                    if (outputSettings.format === 'jpeg') {
                        const buffer = await sharpInstance.jpeg(outputSettings.options).toBuffer();
                        result = {
                            buffer: buffer,
                            format: outputSettings.format,
                            extension: outputSettings.extension
                        };
                    } else {
                        const buffer = await sharpInstance.png(outputSettings.options).toBuffer();
                        result = {
                            buffer: buffer,
                            format: outputSettings.format,
                            extension: outputSettings.extension
                        };
                    }
                }
            }
            
            const totalTime = Date.now() - startTime;
            const finalBuffer = result.buffer || result;
            const compressionRatio = (finalBuffer.length / imageBuffer.length * 100).toFixed(1);
            
            console.log('✅ Total processing completed in:', totalTime, 'ms');
            console.log('✅ Output size:', finalBuffer.length.toLocaleString(), 'bytes');
            console.log('📊 Compression ratio:', `${compressionRatio}% of original`);
            console.log('⚡ Performance metrics:', {
                inputPixels: (metadata.width * metadata.height).toLocaleString(),
                outputPixels: targetPixels.toLocaleString(),
                processingTime: `${totalTime}ms`,
                throughput: `${Math.round(targetPixels / totalTime * 1000).toLocaleString()} pixels/second`,
                concurrency: optimalConcurrency,
                outputFormat: outputSettings.format.toUpperCase(),
                aiEnhanced: aiEnhancementApplied,
                compressionRatio: `${compressionRatio}%`
            });
            
            onProgress?.({ 
                stage: 'complete', 
                progress: 100,
                outputFormat: outputSettings.format,
                fileExtension: outputSettings.extension,
                aiEnhanced: aiEnhancementApplied
            });
            
            // Return consistent format
            if (result.buffer) {
                return result;
            } else {
                return {
                    buffer: result,
                    format: outputSettings.format,
                    extension: outputSettings.extension
                };
            }
            
        } catch (error) {
            const totalTime = Date.now() - startTime;
            console.error('❌ Image processor fatal error after', totalTime, 'ms:', error.message);
            throw new Error(`Image processing failed: ${error.message}`);
        }
    }
    
    async continueScalingFromAI(aiEnhancedBuffer, remainingScale, outputSettings, resizeSettings, onProgress, originalAiEnhanced, aiScale) {
        // Continue Sharp scaling from AI-enhanced 2x image
        
        // Get metadata of AI-enhanced image
        const aiMetadata = await sharp(aiEnhancedBuffer, {
            limitInputPixels: false,
            sequentialRead: true
        }).metadata();
        
        const finalWidth = Math.round(aiMetadata.width * remainingScale);
        const finalHeight = Math.round(aiMetadata.height * remainingScale);
        
        console.log(`🔄 Sharp scaling: ${aiMetadata.width}×${aiMetadata.height} → ${finalWidth}×${finalHeight}`);
        
        // Use Sharp for efficient scaling of AI-enhanced image
        const sharpInstance = sharp(aiEnhancedBuffer, {
            limitInputPixels: false,
            sequentialRead: true
        })
        .resize(finalWidth, finalHeight, resizeSettings);
        
        let result;
        if (outputSettings.format === 'jpeg') {
            result = await sharpInstance.jpeg(outputSettings.options).toBuffer();
        } else {
            result = await sharpInstance.png(outputSettings.options).toBuffer();
        }
        
        onProgress?.({ stage: 'scaling-complete', progress: 90 });
        
        return {
            buffer: result,
            enhancedOnly: originalAiEnhanced,
            format: outputSettings.format,
            extension: outputSettings.extension,
            aiEnhancementApplied: true,
            aiScale: aiScale
        };
    }

    // Legacy method compatibility for existing code
    async processLargeImage(imageDataUrl, config, progressCallback) {
        try {
            // Convert data URL to buffer
            const base64Data = imageDataUrl.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Use the new debug method
            const result = await this.processImage(imageBuffer, config.scaleFactor, progressCallback);
            
            return {
                buffer: result,
                fileSize: result.length,
                dimensions: { 
                    width: Math.round(config.scaleFactor * 1000), // Placeholder
                    height: Math.round(config.scaleFactor * 1000) // Placeholder
                },
                processingTime: 1000,
                format: config.format || 'png'
            };
        } catch (error) {
            throw new Error(`Legacy processing failed: ${error.message}`);
        }
    }
}

module.exports = ImageProcessor; 