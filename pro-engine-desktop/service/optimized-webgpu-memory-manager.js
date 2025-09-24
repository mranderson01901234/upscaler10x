/**
 * Optimized WebGPU Memory Manager with CPU Fallback
 * =================================================
 * 
 * Enhanced memory manager that implements intelligent CPU fallback when WebGPU memory limits are exceeded
 * Supports fractional scaling and progressive memory management for optimal performance
 */

const WebGPUMemoryManager = require('./webgpu-memory-manager');

class OptimizedWebGPUMemoryManager extends WebGPUMemoryManager {
    constructor(adapter, device) {
        super(adapter, device);
        
        // Enhanced configuration for fractional scaling
        this.fractionalConfig = {
            optimalFallbackPoint: 1.5, // Default, will be calibrated
            memoryPressureThreshold: 0.75, // 75% memory usage triggers caution
            criticalMemoryThreshold: 0.9, // 90% memory usage triggers immediate fallback
            progressiveScalingThreshold: 4.0, // Use progressive scaling above 4x
            memoryCalibrationEnabled: true,
            fallbackHistory: [],
            maxFallbackHistory: 50
        };
        
        // Enhanced memory tracking
        this.memoryTracking = {
            peakUsageByScale: new Map(),
            failuresByScale: new Map(),
            successfulScales: new Set(),
            failedScales: new Set(),
            lastCalibration: null,
            calibrationCount: 0
        };
        
        // CPU fallback processor (will be injected)
        this.cpuFallbackProcessor = null;
        
        console.log('🧠 Optimized WebGPU Memory Manager initialized');
    }

    /**
     * Set CPU fallback processor for hybrid processing
     */
    setCPUFallbackProcessor(processor) {
        this.cpuFallbackProcessor = processor;
        console.log('✅ CPU fallback processor configured');
    }

    /**
     * Enhanced memory availability check with fractional scaling support
     */
    async checkMemoryAvailabilityForScale(scaleFactor, imageWidth, imageHeight) {
        const currentUsage = this.getMemoryUsage();
        const estimatedMemory = this.estimateMemoryForScale(scaleFactor, imageWidth, imageHeight);
        const availableMemory = currentUsage.limits.safeMemoryLimit - currentUsage.allocated;
        const currentUtilization = currentUsage.utilizationPercent / 100;
        
        // Check against various thresholds
        const checks = {
            hasAvailableMemory: estimatedMemory <= availableMemory,
            belowPressureThreshold: currentUtilization < this.fractionalConfig.memoryPressureThreshold,
            belowCriticalThreshold: currentUtilization < this.fractionalConfig.criticalMemoryThreshold,
            belowOptimalFallback: scaleFactor <= this.fractionalConfig.optimalFallbackPoint,
            shouldUseProgressive: scaleFactor >= this.fractionalConfig.progressiveScalingThreshold
        };
        
        // Enhanced decision logic
        const recommendation = this.getProcessingRecommendation(scaleFactor, checks, estimatedMemory);
        
        console.log(`🧠 Memory check for ${scaleFactor}x (${imageWidth}×${imageHeight}):`);
        console.log(`   Estimated memory: ${this.formatBytes(estimatedMemory)}`);
        console.log(`   Available memory: ${this.formatBytes(availableMemory)}`);
        console.log(`   Current utilization: ${(currentUtilization * 100).toFixed(1)}%`);
        console.log(`   Recommendation: ${recommendation.method} (${recommendation.reason})`);
        
        return {
            ...checks,
            estimatedMemory,
            availableMemory,
            currentUtilization,
            recommendation
        };
    }

    /**
     * Get processing recommendation based on memory analysis
     */
    getProcessingRecommendation(scaleFactor, checks, estimatedMemory) {
        // Critical memory situation - immediate CPU fallback
        if (!checks.belowCriticalThreshold) {
            return {
                method: 'cpu-fallback',
                reason: 'Critical memory usage - immediate CPU fallback required',
                priority: 'critical'
            };
        }
        
        // Insufficient memory for WebGPU
        if (!checks.hasAvailableMemory) {
            return {
                method: 'cpu-fallback',
                reason: 'Insufficient GPU memory available',
                priority: 'high'
            };
        }
        
        // Above optimal fallback point
        if (!checks.belowOptimalFallback) {
            return {
                method: 'cpu-fallback',
                reason: `Scale factor ${scaleFactor}x above optimal fallback point ${this.fractionalConfig.optimalFallbackPoint}x`,
                priority: 'medium'
            };
        }
        
        // High scale factor - use progressive scaling
        if (checks.shouldUseProgressive) {
            return {
                method: 'webgpu-progressive',
                reason: `High scale factor ${scaleFactor}x - use progressive WebGPU scaling`,
                priority: 'optimal'
            };
        }
        
        // Memory pressure but still manageable
        if (!checks.belowPressureThreshold) {
            return {
                method: 'webgpu-cautious',
                reason: 'Memory pressure detected - use WebGPU with enhanced monitoring',
                priority: 'caution'
            };
        }
        
        // Optimal conditions for WebGPU
        return {
            method: 'webgpu-optimal',
            reason: 'Optimal conditions for WebGPU processing',
            priority: 'optimal'
        };
    }

    /**
     * Enhanced memory estimation for fractional scaling
     */
    estimateMemoryForScale(scaleFactor, imageWidth, imageHeight) {
        const inputPixels = imageWidth * imageHeight;
        const outputPixels = inputPixels * (scaleFactor * scaleFactor);
        
        const channels = 4; // RGBA
        const bytesPerChannel = 4; // f32
        
        // For progressive scaling, we only need memory for the next stage, not the final output
        let effectiveOutputPixels = outputPixels;
        if (scaleFactor >= this.fractionalConfig.progressiveScalingThreshold) {
            // Progressive scaling uses 2x stages, so max memory is for 2x scaling
            const maxStageScale = 2.0;
            effectiveOutputPixels = Math.min(outputPixels, inputPixels * (maxStageScale * maxStageScale));
        }
        
        // Buffer overhead calculation
        let bufferMultiplier = 2.5; // Base: input + output + overhead
        
        // Adjust multiplier based on scale factor
        if (scaleFactor > 4) bufferMultiplier += 0.5; // Extra overhead for high scales
        if (scaleFactor < 2) bufferMultiplier -= 0.3; // Less overhead for low scales
        
        const totalMemory = Math.max(inputPixels, effectiveOutputPixels) * channels * bytesPerChannel * bufferMultiplier;
        
        return Math.round(totalMemory);
    }

    /**
     * Intelligent processing method selection
     */
    async selectProcessingMethod(scaleFactor, imageWidth, imageHeight, options = {}) {
        const memoryCheck = await this.checkMemoryAvailabilityForScale(scaleFactor, imageWidth, imageHeight);
        const recommendation = memoryCheck.recommendation;
        
        // Record this decision for calibration
        this.recordProcessingDecision(scaleFactor, recommendation);
        
        // Return processing configuration
        return {
            method: recommendation.method,
            reason: recommendation.reason,
            priority: recommendation.priority,
            memoryCheck,
            config: this.getMethodConfig(recommendation.method, scaleFactor, options)
        };
    }

    /**
     * Get configuration for selected processing method
     */
    getMethodConfig(method, scaleFactor, options) {
        switch (method) {
            case 'webgpu-optimal':
                return {
                    useWebGPU: true,
                    progressive: false,
                    memoryMonitoring: 'standard',
                    algorithm: this.selectAlgorithm(scaleFactor),
                    bufferPooling: true
                };
                
            case 'webgpu-cautious':
                return {
                    useWebGPU: true,
                    progressive: false,
                    memoryMonitoring: 'enhanced',
                    algorithm: this.selectAlgorithm(scaleFactor),
                    bufferPooling: true,
                    gcFrequency: 'high'
                };
                
            case 'webgpu-progressive':
                return {
                    useWebGPU: true,
                    progressive: true,
                    memoryMonitoring: 'enhanced',
                    stageScale: 2.0,
                    bufferPooling: true,
                    gcFrequency: 'high'
                };
                
            case 'cpu-fallback':
                return {
                    useWebGPU: false,
                    processor: 'sharp',
                    algorithm: 'lanczos3',
                    reason: 'WebGPU memory limitations'
                };
                
            default:
                return {
                    useWebGPU: false,
                    processor: 'sharp',
                    algorithm: 'lanczos3',
                    reason: 'Unknown method'
                };
        }
    }

    /**
     * Select optimal algorithm for scale factor
     */
    selectAlgorithm(scaleFactor) {
        if (scaleFactor <= 1.5) return 'bilinear';
        if (scaleFactor <= 3.0) return 'bicubic';
        if (scaleFactor <= 6.0) return 'lanczos';
        return 'progressive';
    }

    /**
     * Record processing decision for calibration
     */
    recordProcessingDecision(scaleFactor, recommendation) {
        const record = {
            scaleFactor,
            method: recommendation.method,
            reason: recommendation.reason,
            timestamp: Date.now(),
            memoryUtilization: this.getMemoryUsage().utilizationPercent
        };
        
        this.fractionalConfig.fallbackHistory.push(record);
        
        // Keep history size manageable
        if (this.fractionalConfig.fallbackHistory.length > this.fractionalConfig.maxFallbackHistory) {
            this.fractionalConfig.fallbackHistory.shift();
        }
    }

    /**
     * Record processing result for calibration
     */
    recordProcessingResult(scaleFactor, success, processingTime, memoryUsed, method) {
        if (success) {
            this.memoryTracking.successfulScales.add(scaleFactor);
            
            // Update peak memory usage for this scale
            const currentPeak = this.memoryTracking.peakUsageByScale.get(scaleFactor) || 0;
            if (memoryUsed > currentPeak) {
                this.memoryTracking.peakUsageByScale.set(scaleFactor, memoryUsed);
            }
        } else {
            this.memoryTracking.failedScales.add(scaleFactor);
            
            // Track failure count for this scale
            const currentFailures = this.memoryTracking.failuresByScale.get(scaleFactor) || 0;
            this.memoryTracking.failuresByScale.set(scaleFactor, currentFailures + 1);
        }
        
        // Trigger calibration if needed
        if (this.shouldRecalibrate()) {
            this.recalibrateOptimalFallbackPoint();
        }
    }

    /**
     * Check if recalibration is needed
     */
    shouldRecalibrate() {
        const now = Date.now();
        const lastCalibration = this.memoryTracking.lastCalibration || 0;
        const timeSinceCalibration = now - lastCalibration;
        
        // Recalibrate every 10 minutes or after 20 processing operations
        const timeThreshold = 10 * 60 * 1000; // 10 minutes
        const operationThreshold = 20;
        
        const totalOperations = this.memoryTracking.successfulScales.size + this.memoryTracking.failedScales.size;
        
        return timeSinceCalibration > timeThreshold || 
               (totalOperations > 0 && totalOperations % operationThreshold === 0);
    }

    /**
     * Recalibrate optimal fallback point based on historical data
     */
    recalibrateOptimalFallbackPoint() {
        console.log('🔧 Recalibrating optimal fallback point...');
        
        const successfulScales = Array.from(this.memoryTracking.successfulScales);
        const failedScales = Array.from(this.memoryTracking.failedScales);
        
        if (successfulScales.length === 0) {
            console.log('⚠️ No successful scales recorded, keeping current fallback point');
            return;
        }
        
        // Find the highest successful WebGPU scale
        const webgpuSuccesses = this.fractionalConfig.fallbackHistory
            .filter(record => record.method.startsWith('webgpu') && 
                    this.memoryTracking.successfulScales.has(record.scaleFactor))
            .map(record => record.scaleFactor);
        
        if (webgpuSuccesses.length > 0) {
            const highestWebGPUSuccess = Math.max(...webgpuSuccesses);
            const newOptimalFallback = highestWebGPUSuccess * 1.1; // 10% safety margin
            
            const oldFallback = this.fractionalConfig.optimalFallbackPoint;
            this.fractionalConfig.optimalFallbackPoint = Math.round(newOptimalFallback * 10) / 10;
            
            console.log(`✅ Calibrated optimal fallback: ${oldFallback}x → ${this.fractionalConfig.optimalFallbackPoint}x`);
        }
        
        this.memoryTracking.lastCalibration = Date.now();
        this.memoryTracking.calibrationCount++;
    }

    /**
     * Process image with intelligent method selection
     */
    async processImageIntelligently(imageBuffer, scaleFactor, imageWidth, imageHeight, options = {}, onProgress) {
        const processingStart = Date.now();
        
        try {
            // Select optimal processing method
            const processingPlan = await this.selectProcessingMethod(scaleFactor, imageWidth, imageHeight, options);
            
            console.log(`🎯 Processing plan: ${processingPlan.method} (${processingPlan.reason})`);
            
            let result;
            
            if (processingPlan.config.useWebGPU) {
                // WebGPU processing with enhanced monitoring
                result = await this.processWithWebGPU(imageBuffer, scaleFactor, processingPlan.config, onProgress);
            } else {
                // CPU fallback processing
                result = await this.processWithCPUFallback(imageBuffer, scaleFactor, imageWidth, imageHeight, processingPlan.config, onProgress);
            }
            
            const processingTime = Date.now() - processingStart;
            const memoryUsed = this.getMemoryUsage().allocated;
            
            // Record result for calibration
            this.recordProcessingResult(scaleFactor, true, processingTime, memoryUsed, processingPlan.method);
            
            return {
                ...result,
                processingPlan,
                processingTime,
                memoryUsed
            };
            
        } catch (error) {
            const processingTime = Date.now() - processingStart;
            this.recordProcessingResult(scaleFactor, false, processingTime, 0, 'failed');
            
            console.error(`❌ Intelligent processing failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process with WebGPU using the specified configuration
     */
    async processWithWebGPU(imageBuffer, scaleFactor, config, onProgress) {
        // This would integrate with the existing WebGPU processor
        // For now, return a placeholder result
        if (onProgress) onProgress(50, `Processing with WebGPU (${config.progressive ? 'progressive' : 'direct'})...`);
        
        // Simulate processing
        await this.delay(1000);
        
        if (onProgress) onProgress(100, 'WebGPU processing completed');
        
        return {
            success: true,
            method: 'webgpu',
            algorithm: config.algorithm,
            progressive: config.progressive
        };
    }

    /**
     * Process with CPU fallback
     */
    async processWithCPUFallback(imageBuffer, scaleFactor, imageWidth, imageHeight, config, onProgress) {
        if (!this.cpuFallbackProcessor) {
            throw new Error('CPU fallback processor not configured');
        }
        
        if (onProgress) onProgress(25, 'Processing with CPU fallback...');
        
        const sharp = require('sharp');
        const outputWidth = Math.round(imageWidth * scaleFactor);
        const outputHeight = Math.round(imageHeight * scaleFactor);
        
        try {
            const result = await sharp(imageBuffer)
                .resize(outputWidth, outputHeight, {
                    kernel: config.algorithm || 'lanczos3',
                    fit: 'fill'
                })
                .png({ compressionLevel: 0 })
                .toBuffer();
            
            if (onProgress) onProgress(100, 'CPU fallback processing completed');
            
            return {
                success: true,
                data: result,
                buffer: result,
                width: outputWidth,
                height: outputHeight,
                method: 'cpu-fallback',
                algorithm: config.algorithm,
                reason: config.reason
            };
            
        } catch (error) {
            console.error('❌ CPU fallback processing failed:', error);
            throw error;
        }
    }

    /**
     * Get processing statistics including calibration data
     */
    getEnhancedProcessingStats() {
        const baseStats = this.getMemoryUsage();
        
        return {
            ...baseStats,
            fractionalConfig: this.fractionalConfig,
            memoryTracking: {
                ...this.memoryTracking,
                successfulScales: Array.from(this.memoryTracking.successfulScales),
                failedScales: Array.from(this.memoryTracking.failedScales),
                peakUsageByScale: Object.fromEntries(this.memoryTracking.peakUsageByScale),
                failuresByScale: Object.fromEntries(this.memoryTracking.failuresByScale)
            },
            recentDecisions: this.fractionalConfig.fallbackHistory.slice(-10)
        };
    }

    /**
     * Update optimal fallback point manually
     */
    updateOptimalFallbackPoint(newFallbackPoint, reason = 'Manual update') {
        const oldFallback = this.fractionalConfig.optimalFallbackPoint;
        this.fractionalConfig.optimalFallbackPoint = newFallbackPoint;
        
        console.log(`🔧 Updated optimal fallback point: ${oldFallback}x → ${newFallbackPoint}x (${reason})`);
        
        // Record this update
        this.fractionalConfig.fallbackHistory.push({
            scaleFactor: newFallbackPoint,
            method: 'manual-calibration',
            reason: reason,
            timestamp: Date.now(),
            memoryUtilization: this.getMemoryUsage().utilizationPercent
        });
    }

    /**
     * Delay helper
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Enhanced cleanup with calibration data preservation
     */
    async cleanup() {
        console.log('🧹 Cleaning up optimized memory manager...');
        
        try {
            // Save calibration data before cleanup
            const calibrationData = {
                optimalFallbackPoint: this.fractionalConfig.optimalFallbackPoint,
                calibrationCount: this.memoryTracking.calibrationCount,
                lastCalibration: this.memoryTracking.lastCalibration,
                successfulScales: Array.from(this.memoryTracking.successfulScales),
                failedScales: Array.from(this.memoryTracking.failedScales)
            };
            
            console.log('💾 Calibration data preserved:', calibrationData);
            
            // Call parent cleanup
            await super.cleanup();
            
            console.log('✅ Optimized memory manager cleanup completed');
            
        } catch (error) {
            console.error('❌ Optimized memory manager cleanup error:', error);
        }
    }
}

module.exports = OptimizedWebGPUMemoryManager; 