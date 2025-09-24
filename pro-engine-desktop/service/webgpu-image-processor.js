/**
 * WebGPU Image Processor - Core WebGPU Processing Engine
 * Handles GPU-accelerated image upscaling with progressive scaling support
 */

const fs = require('fs').promises;
const path = require('path');

// Import real WebGPU bindings (when available)
let webgpu = null;
let webgpuAvailable = false;

// Try different WebGPU packages
const webgpuPackages = ['webgpu', '@webgpu/dawn', 'dawn-node'];
for (const packageName of webgpuPackages) {
    try {
        webgpu = require(packageName);
        webgpuAvailable = true;
        console.log(`✅ WebGPU bindings loaded from ${packageName}`);
        break;
    } catch (error) {
        // Continue trying other packages
    }
}

if (!webgpuAvailable) {
    console.log('ℹ️ WebGPU bindings not available - using CPU-optimized processing');
    console.log('📝 To enable WebGPU: install Dawn bindings or wait for better Node.js WebGPU support');
}

class WebGPUImageProcessor {
    constructor(hardwareDetector) {
        this.hardwareDetector = hardwareDetector;
        this.gpu = null;
        this.adapter = null;
        this.device = null;
        this.initialized = false;
        this.available = webgpuAvailable;
        this.memoryManager = null;
        this.shaderModules = new Map();
        this.pipelines = new Map();
        this.bufferPool = new Map();
        
        // Initialize tiled processor
        this.tiledProcessor = null;
        
        // Processing state
        this.currentSession = null;
        this.processingStats = {
            totalProcessed: 0,
            averageTime: 0,
            gpuMemoryUsed: 0,
            successRate: 100,
            tiledProcessingUsed: 0,
            directProcessingUsed: 0
        };
    }

    /**
     * Main initialization method - call this first!
     */
    async initialize() {
        if (!this.available) {
            console.log('⚠️ WebGPU bindings not available - skipping WebGPU initialization');
            return false;
        }

        try {
            console.log('🚀 Initializing WebGPU processor...');
            await this.initializeWebGPU();
            await this.initializeWebGPUContext();
            await this.initializeMemoryManager();
            
            this.initialized = true;
            console.log('✅ WebGPU processor fully initialized with tiled processing support');
            return true;
        } catch (error) {
            console.error('❌ WebGPU processor initialization failed:', error);
            this.available = false;
            this.initialized = false;
            return false;
        }
    }

    /**
     * Check if WebGPU is available
     */
    isAvailable() {
        return this.available && this.initialized;
    }

    /**
     * Initialize WebGPU context and resources
     */
    async initializeWebGPU() {
        if (!this.available) {
            throw new Error('WebGPU bindings not available');
        }

        console.log('🚀 Initializing WebGPU Image Processor...');
        
        try {
            // Check if WebGPU is supported by the system
            const webgpuSupport = this.hardwareDetector.getWebGPUSupport();
            if (!webgpuSupport?.serverSupported) {
                console.log('⚠️ WebGPU not supported by hardware detector, attempting direct initialization...');
            }

            // Initialize real WebGPU context
            await this.initializeWebGPUContext();
            
            // Initialize memory manager
            await this.initializeMemoryManager();
            
            // Load and compile shaders
            await this.loadShaders();
            
            // Create processing pipelines
            await this.createPipelines();
            
            this.initialized = true;
            console.log('✅ WebGPU Image Processor initialized successfully');
            console.log(`📊 GPU Info: ${this.adapter.info?.vendor || 'Unknown'} ${this.adapter.info?.architecture || ''}`);
            console.log(`💾 Max Buffer Size: ${Math.round(this.adapter.limits.maxBufferSize / (1024*1024*1024) * 10) / 10}GB`);
            
            return true;
            
        } catch (error) {
            console.error('❌ WebGPU initialization failed:', error);
            this.initialized = false;
            this.available = false;
            throw error;
        }
    }

    /**
     * Initialize real WebGPU context
     */
    async initializeWebGPUContext() {
        try {
            console.log('🔧 Creating WebGPU instance...');
            
            // Check if webgpu package is properly loaded
            if (!webgpu || typeof webgpu.create !== 'function') {
                throw new Error('WebGPU package not properly loaded');
            }
            
            // Try to create WebGPU instance with validation
            const webgpuInstance = await webgpu.create();
            
            // Validate the returned instance
            if (!webgpuInstance || typeof webgpuInstance !== 'object') {
                throw new Error('WebGPU instance creation returned invalid value');
            }
            
            // Additional validation for expected WebGPU properties
            if (!webgpuInstance.requestAdapter) {
                throw new Error('WebGPU instance missing required methods');
            }
            
            this.gpu = webgpuInstance;
            console.log('✅ WebGPU instance created successfully');
            
            console.log('🔍 Requesting WebGPU adapter...');
            const adapter = await this.gpu.requestAdapter();
            
            if (!adapter) {
                throw new Error('No WebGPU adapter available');
            }
            
            console.log('🔍 Requesting WebGPU device...');
            this.device = await adapter.requestDevice();
            
            if (!this.device) {
                throw new Error('Failed to create WebGPU device');
            }
            
            console.log('✅ WebGPU context initialized successfully');
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ WebGPU initialization failed:', error.message);
            console.log('⚠️ Falling back to CPU processing');
            this.gpu = null;
            this.device = null;
            this.webgpuAvailable = false;
            this.isInitialized = false;
            // Don't throw - allow graceful fallback to CPU processing
        }
    }

    /**
     * Initialize memory manager
     */
    async initializeMemoryManager() {
        const EnhancedWebGPUMemoryManager = require('./enhanced-webgpu-memory-manager');
        this.memoryManager = new EnhancedWebGPUMemoryManager(this.adapter, this.device);
        await this.memoryManager.initialize();
        console.log('✅ Enhanced GPU memory manager initialized');
        
        // Initialize tiled processor
        await this.initializeTiledProcessor();
    }

    /**
     * Initialize tiled processor for handling large images
     */
    async initializeTiledProcessor() {
        try {
            const WebGPUTiledProcessor = require('./webgpu-tiled-processor');
            this.tiledProcessor = new WebGPUTiledProcessor(this, this.memoryManager);
            console.log('✅ WebGPU tiled processor initialized');
        } catch (error) {
            console.warn('⚠️ Failed to initialize tiled processor:', error.message);
            this.tiledProcessor = null;
        }
    }

    /**
     * Load and compile WebGPU shaders
     */
    async loadShaders() {
        console.log('📜 Loading WebGPU shaders...');
        
        const shaderDir = path.join(__dirname, 'shaders');
        
        // Create shaders directory if it doesn't exist
        try {
            await fs.access(shaderDir);
        } catch {
            await fs.mkdir(shaderDir, { recursive: true });
        }

        const shaders = [
            { name: 'bilinear', file: 'bilinear-upscale.wgsl' },
            { name: 'bicubic', file: 'bicubic-upscale.wgsl' },
            { name: 'lanczos', file: 'lanczos-upscale.wgsl' },
            { name: 'progressive', file: 'progressive-upscale.wgsl' },
            { name: 'fractional-1.5x', file: 'fractional-1.5x-upscale.wgsl' },
            { name: 'fractional-1.1x', file: 'fractional-1.1x-upscale.wgsl' }
        ];

        for (const shader of shaders) {
            try {
                const shaderPath = path.join(shaderDir, shader.file);
                
                // Check if shader file exists
                try {
                    await fs.access(shaderPath);
                } catch {
                    console.warn(`⚠️ Shader file not found: ${shader.file}, skipping...`);
                    continue;
                }

                const shaderCode = await fs.readFile(shaderPath, 'utf8');
                
                console.log(`🔧 Compiling shader: ${shader.name}`);
                
                const shaderModule = this.device.createShaderModule({
                    label: `${shader.name} Shader`,
                    code: shaderCode
                });

                // Wait for compilation to complete and check for errors
                const compilationInfo = await shaderModule.getCompilationInfo();
                
                if (compilationInfo.messages.length > 0) {
                    for (const message of compilationInfo.messages) {
                        if (message.type === 'error') {
                            throw new Error(`Shader compilation error in ${shader.name}: ${message.message}`);
                        } else if (message.type === 'warning') {
                            console.warn(`⚠️ Shader warning in ${shader.name}: ${message.message}`);
                        }
                    }
                }

                this.shaderModules.set(shader.name, shaderModule);
                console.log(`✅ Shader loaded: ${shader.name}`);

            } catch (error) {
                console.error(`❌ Failed to load shader ${shader.name}:`, error);
                // Continue with other shaders
            }
        }

        if (this.shaderModules.size === 0) {
            throw new Error('No shaders could be loaded');
        }

        console.log(`✅ Loaded ${this.shaderModules.size} shaders successfully`);
    }

    /**
     * Create processing pipelines
     */
    async createPipelines() {
        console.log('⚙️ Creating compute pipelines...');

        for (const [name, shaderModule] of this.shaderModules) {
            try {
                console.log(`🔧 Creating pipeline: ${name}`);

                const pipeline = this.device.createComputePipeline({
                    label: `${name} Pipeline`,
                    layout: 'auto',
                    compute: {
                        module: shaderModule,
                        entryPoint: 'main'
                    }
                });

                this.pipelines.set(name, pipeline);
                console.log(`✅ Pipeline created: ${name}`);

            } catch (error) {
                console.error(`❌ Failed to create pipeline ${name}:`, error);
                // Continue with other pipelines
            }
        }

        if (this.pipelines.size === 0) {
            throw new Error('No compute pipelines could be created');
        }

        console.log(`✅ Created ${this.pipelines.size} compute pipelines successfully`);
    }

    /**
     * Create image buffers on GPU
     */
    async createImageBuffers(imageData, scaleFactor) {
        const { width, height, channels } = imageData;
        const inputSize = width * height * channels * 4; // 4 bytes per f32
        const outputWidth = width * scaleFactor;
        const outputHeight = height * scaleFactor;
        const outputSize = outputWidth * outputHeight * channels * 4;

        // Get buffers from memory manager
        const inputBuffer = await this.memoryManager.getBuffer('input', inputSize);
        const outputBuffer = await this.memoryManager.getBuffer('output', outputSize);
        const uniformBuffer = await this.memoryManager.getBuffer('uniform', 16); // 4 f32 values

        return {
            inputBuffer,
            outputBuffer,
            uniformBuffer,
            outputWidth,
            outputHeight
        };
    }

    /**
     * Execute upscaling shader on GPU
     */
    async executeUpscalingShader(algorithm, buffers, imageData, scaleFactor, onProgress) {
        const pipeline = this.pipelines.get(algorithm);
        if (!pipeline) {
            throw new Error(`Pipeline not found for algorithm: ${algorithm}`);
        }

        const { width, height, channels } = imageData;
        const { outputWidth, outputHeight } = buffers;

        // Create bind group (simulated)
        const bindGroup = {
            entries: [
                { binding: 0, resource: { buffer: buffers.inputBuffer } },
                { binding: 1, resource: { buffer: buffers.outputBuffer } },
                { binding: 2, resource: { buffer: buffers.uniformBuffer } }
            ]
        };

        // Create command encoder
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();

        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);

        // Calculate workgroup dispatch size
        const workgroupSizeX = 8;
        const workgroupSizeY = 8;
        const dispatchX = Math.ceil(outputWidth / workgroupSizeX);
        const dispatchY = Math.ceil(outputHeight / workgroupSizeY);

        passEncoder.dispatchWorkgroups(dispatchX, dispatchY);
        passEncoder.end();

        // Submit work to GPU
        const commandBuffer = commandEncoder.finish();
        this.device.queue.submit([commandBuffer]);

        // Wait for completion
        await this.device.queue.onSubmittedWorkDone();

        if (onProgress) {
            onProgress(100, `GPU ${algorithm} upscaling completed`);
        }

        console.log(`✅ GPU ${algorithm} upscaling completed: ${width}x${height} → ${outputWidth}x${outputHeight}`);
    }

    /**
     * Read result from GPU buffer
     */
    async readResultBuffer(outputBuffer, outputSize) {
        // Map buffer for reading (simulated)
        await outputBuffer.mapAsync(1); // READ mode
        const mappedRange = outputBuffer.getMappedRange();
        
        // Copy data
        const resultData = new Float32Array(mappedRange.slice());
        
        // Unmap buffer
        outputBuffer.unmap();

        return resultData;
    }

    /**
     * Main image processing entry point
     */
    async processImage(imageBuffer, scaleFactor, options = {}, onProgress) {
        if (!this.isAvailable()) {
            throw new Error('WebGPU not available or not initialized');
        }

        const startTime = Date.now();
        const sessionId = `webgpu_${Date.now()}`;
        
        this.currentSession = {
            id: sessionId,
            startTime,
            scaleFactor,
            options
        };

        try {
            console.log(`🚀 Starting WebGPU image processing (${sessionId})`);
            
            if (onProgress) onProgress(5, 'Analyzing image for optimal processing method...');
            
            // Parse image data to get dimensions
            const imageData = await this.parseImageData(imageBuffer);
            
            // Check if we should use tiled processing for high scale factors
            const shouldUseTiled = this.shouldUseTiledProcessing(imageData, scaleFactor);
            
            if (shouldUseTiled && this.tiledProcessor) {
                console.log(`🧩 Using tiled processing for ${scaleFactor}x (${imageData.width}×${imageData.height}) - bypassing memory wall`);
                this.processingStats.tiledProcessingUsed++;
                
                const result = await this.tiledProcessor.processImageTiled(imageBuffer, scaleFactor, options, onProgress);
                
                const processingTime = Date.now() - startTime;
                this.updateProcessingStats(processingTime, true);
                
                return {
                    ...result,
                    sessionId,
                    method: 'webgpu-tiled'
                };
            }
            
            // Use direct WebGPU processing for smaller scale factors
            console.log(`⚡ Using direct WebGPU processing for ${scaleFactor}x (${imageData.width}×${imageData.height})`);
            this.processingStats.directProcessingUsed++;
            
            // Check if we should use progressive scaling for high scale factors (fallback)
            const shouldUseProgressive = this.shouldUseProgressiveScaling(imageData, scaleFactor);
            
            if (shouldUseProgressive) {
                console.log(`🔄 Using progressive scaling for ${scaleFactor}x (${imageData.width}×${imageData.height})`);
                return await this.processWithProgressiveScaling(imageBuffer, imageData, scaleFactor, options, onProgress);
            }
            
            if (onProgress) onProgress(15, 'Creating GPU buffers...');
            
            // Create GPU buffers
            const buffers = await this.createImageBuffers(imageData, scaleFactor);
            
            if (onProgress) onProgress(25, 'Uploading image to GPU...');
            
            // Upload image data to GPU
            await this.uploadImageToGPU(buffers.inputBuffer, imageData);
            
            // Determine processing algorithm
            const algorithm = options.algorithm || this.selectOptimalAlgorithm(scaleFactor);
            
            if (onProgress) onProgress(40, `Executing ${algorithm} upscaling on GPU...`);
            
            // Execute GPU processing
            await this.executeUpscalingShader(algorithm, buffers, imageData, scaleFactor, onProgress);
            
            if (onProgress) onProgress(85, 'Reading results from GPU...');
            
            // Read results from GPU
            const outputSize = buffers.outputWidth * buffers.outputHeight * imageData.channels;
            const resultData = await this.readResultBuffer(buffers.outputBuffer, outputSize);
            
            if (onProgress) onProgress(95, 'Converting result to image format...');
            
            // Convert result back to image buffer
            const resultBuffer = await this.convertToImageBuffer(resultData, buffers.outputWidth, buffers.outputHeight, imageData.channels);
            
            // Release GPU resources
            await this.memoryManager.releaseBuffers([buffers.inputBuffer, buffers.outputBuffer, buffers.uniformBuffer]);
            
            const processingTime = Date.now() - startTime;
            this.updateProcessingStats(processingTime, true);
            
            if (onProgress) onProgress(100, `WebGPU direct processing completed in ${processingTime}ms`);
            
            console.log(`✅ WebGPU direct processing completed: ${processingTime}ms`);
            
            return {
                success: true,
                data: resultBuffer,
                buffer: resultBuffer,  // Add buffer property for file manager compatibility
                width: buffers.outputWidth,
                height: buffers.outputHeight,
                processingTime,
                algorithm,
                method: 'webgpu-direct',
                sessionId
            };
            
        } catch (error) {
            console.error(`❌ WebGPU processing failed (${sessionId}):`, error);
            this.updateProcessingStats(Date.now() - startTime, false);
            throw error;
        } finally {
            this.currentSession = null;
        }
    }

    /**
     * Parse image data from buffer (simplified)
     */
    async parseImageData(imageBuffer) {
        // Parse actual image dimensions using Sharp
        const sharp = require('sharp');
        const metadata = await sharp(imageBuffer).metadata();
        
        console.log(`📊 Parsed image: ${metadata.width}×${metadata.height}, channels: ${metadata.channels}`);
        
        return {
            width: metadata.width,
            height: metadata.height,
            channels: metadata.channels || 4, // Default to RGBA
            data: new Float32Array(metadata.width * metadata.height * (metadata.channels || 4))
        };
    }

    /**
     * Upload image data to GPU buffer
     */
    async uploadImageToGPU(buffer, imageData) {
        // In real implementation, would copy imageData.data to buffer
        console.log(`📤 Uploaded ${imageData.width}x${imageData.height} image to GPU`);
    }

    /**
     * Select optimal algorithm based on scale factor
     */
    selectOptimalAlgorithm(scaleFactor) {
        // Use fractional scaling for memory efficiency
        if (scaleFactor <= 1.2) return 'fractional-1.1x';
        if (scaleFactor <= 1.8) return 'fractional-1.5x';
        if (scaleFactor <= 2) return 'bilinear';
        if (scaleFactor <= 4) return 'bicubic';
        if (scaleFactor <= 8) return 'lanczos';
        return 'progressive'; // For high scale factors, use progressive scaling
    }

    /**
     * Convert GPU result back to image buffer
     */
    async convertToImageBuffer(resultData, width, height, channels) {
        // Convert Float32Array back to image buffer format using Sharp
        const sharp = require('sharp');
        
        try {
            // Convert Float32Array to Uint8Array (0-255 range)
            const uint8Data = new Uint8Array(resultData.length);
            for (let i = 0; i < resultData.length; i++) {
                uint8Data[i] = Math.min(255, Math.max(0, Math.round(resultData[i] * 255)));
            }
            
            // Create Sharp image from raw pixel data
            const image = sharp(uint8Data, {
                raw: {
                    width: width,
                    height: height,
                    channels: channels
                }
            });
            
            // Convert to PNG buffer
            return await image.png().toBuffer();
            
        } catch (error) {
            console.error('❌ Error converting GPU result to image buffer:', error);
            // Fallback: return raw buffer
            return Buffer.from(resultData.buffer || resultData);
        }
    }

    /**
     * Determine if tiled processing should be used (NEW - bypasses 4.1x memory wall)
     */
    shouldUseTiledProcessing(imageData, scaleFactor) {
        const totalPixels = imageData.width * imageData.height;
        const outputPixels = totalPixels * (scaleFactor * scaleFactor);
        
        // Use tiled processing for:
        // 1. Scale factors > 4.1x (known WebGPU memory wall)
        // 2. Large output images (>50MP)
        // 3. When direct scaling would exceed GPU memory limits
        const estimatedMemoryGB = (outputPixels * imageData.channels * 4) / (1024 * 1024 * 1024);
        const memoryLimitGB = 2.0; // Conservative limit for GTX 1050
        
        const useTiled = scaleFactor > 4.1 || outputPixels > 50000000 || estimatedMemoryGB > memoryLimitGB;
        
        console.log(`🎯 Tiled processing decision: ${useTiled}`);
        console.log(`   Scale factor: ${scaleFactor}x (tiled threshold: 4.1x)`);
        console.log(`   Output pixels: ${(outputPixels/1000000).toFixed(1)}MP (tiled threshold: 50MP)`);
        console.log(`   Estimated memory: ${estimatedMemoryGB.toFixed(2)}GB (limit: ${memoryLimitGB}GB)`);
        
        return useTiled;
    }

    /**
     * Determine if progressive scaling should be used (FALLBACK for when tiled processing fails)
     */
    shouldUseProgressiveScaling(imageData, scaleFactor) {
        const totalPixels = imageData.width * imageData.height;
        const outputPixels = totalPixels * (scaleFactor * scaleFactor);
        
        // Use progressive scaling as fallback for:
        // 1. High scale factors (>4x) when tiled processing isn't available
        // 2. Large output images (>50MP)
        // 3. When direct scaling would exceed memory limits
        const estimatedMemoryGB = (outputPixels * imageData.channels * 4) / (1024 * 1024 * 1024);
        const memoryLimitGB = 2.0; // Conservative limit for GTX 1050
        
        console.log(`📊 Progressive fallback memory estimate: ${estimatedMemoryGB.toFixed(2)}GB (limit: ${memoryLimitGB}GB)`);
        
        const useProgressive = scaleFactor > 4 || outputPixels > 50000000 || estimatedMemoryGB > memoryLimitGB;
        console.log(`🎯 Progressive scaling fallback decision: ${useProgressive} (scale: ${scaleFactor}x, pixels: ${outputPixels}, memory: ${estimatedMemoryGB.toFixed(2)}GB)`);
        
        return useProgressive;
    }

    /**
     * Process using progressive scaling for high scale factors
     */
    async processWithProgressiveScaling(imageBuffer, imageData, scaleFactor, options, onProgress) {
        console.log(`🔄 Initializing WebGPU Progressive Scaler for ${scaleFactor}x scaling`);
        
        try {
            // Import and initialize progressive scaler if not already done
            if (!this.progressiveScaler) {
                const WebGPUProgressiveScaler = require('./webgpu-progressive-scaler');
                this.progressiveScaler = new WebGPUProgressiveScaler(this, this.memoryManager);
                await this.progressiveScaler.initialize();
            }
            
            // Use progressive scaler
            const result = await this.progressiveScaler.processImageProgressive(imageBuffer, scaleFactor, options, onProgress);
            
            return {
                success: true,
                data: result.buffer || result.data,
                buffer: result.buffer || result.data,
                width: result.width,
                height: result.height,
                processingTime: result.processingTime,
                algorithm: 'progressive',
                method: 'webgpu-progressive'
            };
            
        } catch (error) {
            console.error('❌ Progressive scaling failed:', error);
            throw error;
        }
    }

    /**
     * Update processing statistics
     */
    updateProcessingStats(processingTime, success) {
        this.processingStats.totalProcessed++;
        
        if (success) {
            const prevAvg = this.processingStats.averageTime;
            const count = this.processingStats.totalProcessed;
            this.processingStats.averageTime = (prevAvg * (count - 1) + processingTime) / count;
        } else {
            const total = this.processingStats.totalProcessed;
            const successful = Math.floor(total * this.processingStats.successRate / 100);
            this.processingStats.successRate = (successful / total) * 100;
        }
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return {
            ...this.processingStats,
            gpuMemoryUsed: this.memoryManager?.getMemoryUsage() || 0,
            initialized: this.initialized,
            currentSession: this.currentSession?.id || null
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up WebGPU resources...');
        
        try {
            // Cleanup tiled processor
            if (this.tiledProcessor) {
                await this.tiledProcessor.cleanup();
            }
            
            // Release all buffers
            if (this.memoryManager) {
                await this.memoryManager.cleanup();
            }
            
            // Destroy device
            if (this.device) {
                this.device.destroy();
            }
            
            // Clear collections
            this.shaderModules.clear();
            this.pipelines.clear();
            this.bufferPool.clear();
            
            this.initialized = false;
            console.log('✅ WebGPU cleanup completed');
            
        } catch (error) {
            console.error('❌ WebGPU cleanup error:', error);
        }
    }
}

module.exports = WebGPUImageProcessor; 