/**
 * WebGPU Progressive Scaler - GPU-Accelerated Progressive Image Scaling
 * Adapts existing progressive scaling logic to WebGPU with parallel processing
 */

class WebGPUProgressiveScaler {
    constructor(webgpuProcessor, memoryManager) {
        this.webgpuProcessor = webgpuProcessor;
        this.memoryManager = memoryManager;
        this.initialized = false;
        
        // Progressive scaling configuration
        this.config = {
            maxSingleStageScale: 4,     // Maximum scale factor for single-stage processing
            progressiveStageScale: 2,   // Scale factor for each progressive stage (2x)
            maxGPUMemoryUsage: 0.8,     // Maximum GPU memory utilization (80%)
            parallelStages: true,       // Enable parallel stage processing when possible
            qualityMode: 'balanced',    // 'fast', 'balanced', 'high'
            fallbackThreshold: 0.9      // CPU fallback at 90% GPU memory usage
        };
        
        // Processing state
        this.currentSession = null;
        this.stageResults = new Map();
        this.processingStats = {
            totalStages: 0,
            completedStages: 0,
            averageStageTime: 0,
            gpuUtilization: 0,
            memoryPeakUsage: 0
        };
    }

    /**
     * Initialize progressive scaler
     */
    async initialize() {
        console.log('🔄 Initializing WebGPU Progressive Scaler...');
        
        try {
            // Verify WebGPU processor is available
            if (!this.webgpuProcessor.isAvailable()) {
                throw new Error('WebGPU processor not available');
            }
            
            // Optimize configuration based on GPU capabilities
            await this.optimizeConfiguration();
            
            this.initialized = true;
            console.log('✅ WebGPU Progressive Scaler initialized');
            console.log(`📊 Configuration: ${this.config.qualityMode} quality, ${this.config.parallelStages ? 'parallel' : 'sequential'} stages`);
            
        } catch (error) {
            console.error('❌ Progressive Scaler initialization failed:', error);
            throw error;
        }
    }

    /**
     * Optimize configuration based on GPU capabilities
     */
    async optimizeConfiguration() {
        const memoryUsage = this.memoryManager.getMemoryUsage();
        const gpuMemory = memoryUsage.limits.totalGPUMemory;
        
        // Adjust configuration based on available GPU memory
        if (gpuMemory >= 4 * 1024 * 1024 * 1024) { // 4GB+
            this.config.qualityMode = 'high';
            this.config.parallelStages = true;
            this.config.maxGPUMemoryUsage = 0.85;
        } else if (gpuMemory >= 2 * 1024 * 1024 * 1024) { // 2GB+
            this.config.qualityMode = 'balanced';
            this.config.parallelStages = true;
            this.config.maxGPUMemoryUsage = 0.8;
        } else { // <2GB
            this.config.qualityMode = 'fast';
            this.config.parallelStages = false;
            this.config.maxGPUMemoryUsage = 0.7;
        }
        
        console.log(`🔧 Optimized for ${Math.round(gpuMemory / (1024*1024*1024))}GB GPU: ${this.config.qualityMode} quality mode`);
    }

    /**
     * Process image with progressive scaling
     */
    async processImageProgressive(imageBuffer, scaleFactor, options = {}, onProgress) {
        if (!this.initialized) {
            throw new Error('Progressive scaler not initialized');
        }

        const startTime = Date.now();
        const sessionId = `progressive_${Date.now()}`;
        
        this.currentSession = {
            id: sessionId,
            startTime,
            scaleFactor,
            options: { ...this.config, ...options }
        };

        try {
            console.log(`🚀 Starting progressive WebGPU scaling: ${scaleFactor}x (${sessionId})`);
            
            if (onProgress) onProgress(5, 'Planning progressive scaling stages...');
            
            // Plan scaling stages
            const stages = this.planScalingStages(scaleFactor);
            this.processingStats.totalStages = stages.length;
            this.processingStats.completedStages = 0;
            
            console.log(`📋 Planned ${stages.length} scaling stages:`, stages.map(s => `${s.scale}x`).join(' → '));
            
            if (onProgress) onProgress(10, `Processing ${stages.length} scaling stages...`);
            
            // Execute scaling stages
            let currentBuffer = imageBuffer;
            let currentWidth = options.width || 2000;  // Would be parsed from actual image
            let currentHeight = options.height || 3000;
            
            for (let i = 0; i < stages.length; i++) {
                const stage = stages[i];
                const stageProgress = 10 + (i / stages.length) * 80;
                
                if (onProgress) {
                    onProgress(stageProgress, `Stage ${i + 1}/${stages.length}: ${stage.scale}x scaling (${stage.algorithm})...`);
                }
                
                // Check GPU memory before processing
                if (!await this.checkMemoryAvailability(currentWidth * stage.scale, currentHeight * stage.scale)) {
                    console.warn(`⚠️ GPU memory insufficient for stage ${i + 1}, switching to hybrid CPU processing for remaining stages`);
                    
                    // Use hybrid approach: process remaining stages with CPU
                    return await this.processRemainingStagesWithCPU(
                        currentBuffer, 
                        currentWidth, 
                        currentHeight, 
                        stages.slice(i), // Remaining stages
                        scaleFactor,
                        onProgress
                    );
                }
                
                // Process stage
                const stageResult = await this.processScalingStage(
                    currentBuffer, 
                    stage, 
                    currentWidth, 
                    currentHeight,
                    (progress, message) => {
                        const totalProgress = stageProgress + (progress / stages.length) * 0.8;
                        if (onProgress) onProgress(totalProgress, message);
                    }
                );
                
                // Update for next stage
                currentBuffer = stageResult.data;
                currentWidth = stageResult.width;
                currentHeight = stageResult.height;
                
                // Store stage result for debugging
                this.stageResults.set(i, {
                    stage: stage,
                    result: stageResult,
                    memoryUsed: this.memoryManager.getMemoryUsage().allocated
                });
                
                this.processingStats.completedStages++;
                
                // Update average stage time
                const stageTime = stageResult.processingTime || 0;
                this.updateAverageStageTime(stageTime);
                
                console.log(`✅ Stage ${i + 1} completed: ${stageTime}ms (${currentWidth}x${currentHeight})`);
            }
            
            const totalTime = Date.now() - startTime;
            
            if (onProgress) onProgress(95, 'Finalizing progressive scaling result...');
            
            // Update processing statistics
            this.processingStats.memoryPeakUsage = Math.max(
                this.processingStats.memoryPeakUsage,
                this.memoryManager.getMemoryUsage().peak
            );
            
            if (onProgress) onProgress(100, `Progressive scaling completed in ${totalTime}ms`);
            
            console.log(`✅ Progressive WebGPU scaling completed: ${totalTime}ms`);
            
            return {
                success: true,
                data: currentBuffer,
                width: currentWidth,
                height: currentHeight,
                processingTime: totalTime,
                stages: stages.length,
                method: 'webgpu-progressive',
                stats: this.getProcessingStats()
            };
            
        } catch (error) {
            console.error(`❌ Progressive scaling failed (${sessionId}):`, error);
            throw error;
        } finally {
            this.currentSession = null;
            this.stageResults.clear();
        }
    }

    /**
     * Plan scaling stages based on target scale factor using adaptive strategy
     */
    planScalingStages(scaleFactor) {
        const stages = [];
        
        // If scale factor is small enough, use single stage
        if (scaleFactor <= this.config.maxSingleStageScale) {
            stages.push({
                scale: scaleFactor,
                algorithm: this.selectAlgorithmForScale(scaleFactor),
                parallel: false
            });
            return stages;
        }
        
        // Use adaptive fractional scaling for memory efficiency
        let currentScale = 1;
        const targetScale = scaleFactor;
        
        while (currentScale < targetScale) {
            // Determine optimal step size based on memory constraints
            const remainingScale = targetScale / currentScale;
            let stepSize;
            
            // Adaptive step size selection
            if (remainingScale >= 4.0) {
                stepSize = 2.0; // Use 2x when we have plenty of scale left
            } else if (remainingScale >= 2.25) {
                stepSize = 1.5; // Use 1.5x for moderate scaling
            } else if (remainingScale >= 1.21) {
                stepSize = 1.1; // Use 1.1x for fine scaling
            } else {
                stepSize = remainingScale; // Final fractional step
            }
            
            const nextScale = Math.min(currentScale * stepSize, targetScale);
            const actualStepSize = nextScale / currentScale;
            
            stages.push({
                scale: actualStepSize,
                algorithm: this.selectAlgorithmForScale(actualStepSize),
                parallel: false,
                stepType: stepSize === 2.0 ? '2x' : stepSize === 1.5 ? '1.5x' : stepSize === 1.1 ? '1.1x' : 'fractional'
            });
            
            currentScale = nextScale;
        }
        
        // Verify the total scaling matches target
        const totalScale = stages.reduce((acc, stage) => acc * stage.scale, 1);
        console.log(`📊 Adaptive scaling plan for ${scaleFactor}x: ${stages.length} stages`);
        console.log(`📊 Stages: ${stages.map(s => `${s.scale.toFixed(2)}x(${s.stepType})`).join(' → ')} = ${totalScale.toFixed(2)}x total`);
        
        return stages;
    }

    /**
     * Process remaining stages with CPU when GPU memory is insufficient
     */
    async processRemainingStagesWithCPU(currentBuffer, currentWidth, currentHeight, remainingStages, originalScaleFactor, onProgress) {
        console.log(`🔄 Hybrid processing: Switching to CPU for ${remainingStages.length} remaining stages`);
        
        try {
            // Calculate the remaining scale factor
            const remainingScale = remainingStages.reduce((acc, stage) => acc * stage.scale, 1);
            console.log(`📊 CPU will handle remaining ${remainingScale.toFixed(2)}x scaling from ${currentWidth}x${currentHeight}`);
            
            // Use Sharp for CPU processing of remaining scale
            const sharp = require('sharp');
            
            if (onProgress) {
                onProgress(60, `Hybrid processing: GPU completed initial stages, CPU handling remaining ${remainingScale.toFixed(1)}x scaling...`);
            }
            
            const finalWidth = Math.round(currentWidth * remainingScale);
            const finalHeight = Math.round(currentHeight * remainingScale);
            
            console.log(`🖥️ CPU processing: ${currentWidth}x${currentHeight} → ${finalWidth}x${finalHeight}`);
            
            const cpuStartTime = Date.now();
            const resultBuffer = await sharp(currentBuffer)
                .resize(finalWidth, finalHeight, {
                    kernel: 'lanczos3',
                    fit: 'fill'
                })
                .png()
                .toBuffer();
            
            const cpuTime = Date.now() - cpuStartTime;
            const totalTime = Date.now() - this.currentSession.startTime;
            
            console.log(`✅ Hybrid processing completed: WebGPU + CPU in ${totalTime}ms (CPU: ${cpuTime}ms)`);
            
            if (onProgress) {
                onProgress(100, `Hybrid processing completed: WebGPU + CPU in ${totalTime}ms`);
            }
            
            return {
                success: true,
                data: resultBuffer,
                buffer: resultBuffer,
                width: finalWidth,
                height: finalHeight,
                processingTime: totalTime,
                stages: this.processingStats.completedStages + remainingStages.length,
                method: 'webgpu-hybrid-cpu',
                hybridBreakpoint: this.processingStats.completedStages,
                stats: this.getProcessingStats()
            };
            
        } catch (error) {
            console.error('❌ Hybrid CPU processing failed:', error);
            throw error;
        }
    }

    /**
     * Select optimal algorithm for scale factor
     */
    selectAlgorithmForScale(scaleFactor) {
        // Use fractional scaling algorithms for memory efficiency
        if (scaleFactor <= 1.2) return 'fractional-1.1x';
        if (scaleFactor <= 1.8) return 'fractional-1.5x';
        
        switch (this.config.qualityMode) {
            case 'fast':
                return scaleFactor === 2 ? 'progressive' : 'bilinear';
            case 'balanced':
                return scaleFactor === 2 ? 'progressive' : 'bicubic';
            case 'high':
                return scaleFactor === 2 ? 'progressive' : 'lanczos';
            default:
                return 'bilinear';
        }
    }

    /**
     * Check if GPU memory is available for the next stage using enhanced memory manager
     */
    async checkMemoryAvailability(outputWidth, outputHeight) {
        // Use enhanced memory manager's availability check
        const inputPixels = (outputWidth / 1.5) * (outputHeight / 1.5); // Approximate input size
        const estimatedMemory = this.calculateStageMemoryRequirement(inputPixels, 1.5); // Average fractional step
        
        try {
            const canProcess = await this.memoryManager.checkMemoryAvailability(estimatedMemory);
            
            if (canProcess) {
                console.log(`✅ Memory check passed: ${this.formatBytes(estimatedMemory)} available for ${outputWidth}x${outputHeight} stage`);
                return true;
            } else {
                console.warn(`⚠️ Memory check failed: ${this.formatBytes(estimatedMemory)} needed exceeds available memory`);
                return false;
            }
        } catch (error) {
            console.error('❌ Memory availability check failed:', error);
            return false;
        }
    }
    
    /**
     * Calculate memory requirement for a stage
     */
    calculateStageMemoryRequirement(inputPixels, scaleFactor) {
        const outputPixels = inputPixels * (scaleFactor * scaleFactor);
        const channels = 4; // RGBA
        const bytesPerChannel = 4; // f32
        const overhead = 1.2; // Buffer overhead
        return (inputPixels + outputPixels) * channels * bytesPerChannel * overhead;
    }

    /**
     * Process a single scaling stage
     */
    async processScalingStage(inputBuffer, stage, width, height, onProgress) {
        const stageStartTime = Date.now();
        
        try {
            // Create image data structure
            const imageData = {
                width: width,
                height: height,
                channels: 4, // RGBA
                data: inputBuffer
            };
            
            // Process with WebGPU
            const result = await this.webgpuProcessor.processImage(
                inputBuffer,
                stage.scale,
                { 
                    algorithm: stage.algorithm,
                    width: width,
                    height: height
                },
                onProgress
            );
            
            return {
                ...result,
                processingTime: Date.now() - stageStartTime
            };
            
        } catch (error) {
            console.error(`❌ Stage processing failed:`, error);
            throw error;
        }
    }

    /**
     * Update average stage time
     */
    updateAverageStageTime(stageTime) {
        const completed = this.processingStats.completedStages;
        const currentAvg = this.processingStats.averageStageTime;
        
        this.processingStats.averageStageTime = (currentAvg * (completed - 1) + stageTime) / completed;
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        const memoryUsage = this.memoryManager.getMemoryUsage();
        
        return {
            ...this.processingStats,
            currentMemoryUsage: memoryUsage.allocated,
            memoryUtilization: memoryUsage.utilizationPercent,
            configuration: this.config,
            activeSession: this.currentSession?.id || null
        };
    }

    /**
     * Format bytes for human-readable output
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Estimate processing time for a given scale factor
     */
    estimateProcessingTime(scaleFactor, imageWidth, imageHeight) {
        const stages = this.planScalingStages(scaleFactor);
        const avgStageTime = this.processingStats.averageStageTime || 1000; // 1s default
        
        // Estimate based on pixel count scaling
        const basePixels = 2000 * 3000; // Reference size
        const actualPixels = imageWidth * imageHeight;
        const pixelRatio = actualPixels / basePixels;
        
        const estimatedTime = stages.length * avgStageTime * pixelRatio;
        
        return {
            estimatedTimeMs: Math.round(estimatedTime),
            stages: stages.length,
            avgStageTime: Math.round(avgStageTime),
            confidence: this.processingStats.completedStages > 0 ? 'high' : 'low'
        };
    }

    /**
     * Get detailed stage information for debugging
     */
    getStageDetails() {
        return Array.from(this.stageResults.entries()).map(([index, data]) => ({
            stageIndex: index,
            scale: data.stage.scale,
            algorithm: data.stage.algorithm,
            processingTime: data.result.processingTime,
            outputSize: `${data.result.width}x${data.result.height}`,
            memoryUsed: this.formatBytes(data.memoryUsed)
        }));
    }

    /**
     * Check if progressive scaler is available
     */
    isAvailable() {
        return this.initialized && this.webgpuProcessor.isAvailable();
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up WebGPU Progressive Scaler...');
        
        try {
            // Clear stage results
            this.stageResults.clear();
            
            // Reset processing stats
            this.processingStats = {
                totalStages: 0,
                completedStages: 0,
                averageStageTime: 0,
                gpuUtilization: 0,
                memoryPeakUsage: 0
            };
            
            this.initialized = false;
            console.log('✅ Progressive Scaler cleanup completed');
            
        } catch (error) {
            console.error('❌ Progressive Scaler cleanup error:', error);
        }
    }
}

module.exports = WebGPUProgressiveScaler; 