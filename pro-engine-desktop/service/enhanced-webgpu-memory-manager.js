/**
 * Enhanced WebGPU Memory Manager - Optimized for High-Scale Image Processing
 * Features fractional scaling support, aggressive cleanup, and memory-aware fallbacks
 */

const WebGPUMemoryManager = require('./webgpu-memory-manager');

class EnhancedWebGPUMemoryManager extends WebGPUMemoryManager {
    constructor(adapter, device) {
        super(adapter, device);
        
        // Enhanced configuration for high-scale processing
        this.enhancedConfig = {
            fractionalScalingEnabled: true,
            aggressiveCleanupEnabled: true,
            memoryPressureThreshold: 0.75,  // Start aggressive cleanup at 75%
            criticalMemoryThreshold: 0.90,  // CPU fallback at 90%
            bufferReuseEnabled: true,
            progressiveGCEnabled: true,
            adaptiveScalingEnabled: true
        };
        
        // Fractional scaling buffer pools
        this.fractionalPools = {
            '1.1x': new Map(),  // 1.21x memory usage
            '1.5x': new Map(),  // 2.25x memory usage
            '2.0x': new Map()   // 4.0x memory usage (existing)
        };
        
        // Memory optimization tracking
        this.optimizationStats = {
            bufferReuses: 0,
            aggressiveCleanups: 0,
            memoryOptimizationsApplied: 0,
            cpuFallbacks: 0,
            totalMemorySaved: 0
        };
        
        // Adaptive scaling configuration
        this.adaptiveConfig = {
            memoryLimits: {
                '1.1x': { maxScale: 50, memoryMultiplier: 1.21 },
                '1.5x': { maxScale: 15, memoryMultiplier: 2.25 },
                '2.0x': { maxScale: 4, memoryMultiplier: 4.0 }
            }
        };
    }

    /**
     * Initialize enhanced memory manager
     */
    async initialize() {
        await super.initialize();
        
        // Initialize fractional scaling pools
        await this.initializeFractionalPools();
        
        // Setup enhanced garbage collection
        this.setupEnhancedGC();
        
        console.log('✅ Enhanced WebGPU Memory Manager initialized');
        console.log(`🔧 Fractional scaling: ${this.enhancedConfig.fractionalScalingEnabled ? 'Enabled' : 'Disabled'}`);
        console.log(`🧹 Aggressive cleanup: ${this.enhancedConfig.aggressiveCleanupEnabled ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * Initialize fractional scaling buffer pools
     */
    async initializeFractionalPools() {
        const commonSizes = [
            512 * 512 * 4 * 4,      // 4MB - small tiles
            1024 * 1024 * 4 * 4,    // 16MB - medium tiles
            2000 * 3000 * 4 * 4,    // 96MB - standard test image
            4000 * 6000 * 4 * 4     // 384MB - 2x scaled image
        ];

        for (const [scaleKey, pool] of Object.entries(this.fractionalPools)) {
            const multiplier = this.adaptiveConfig.memoryLimits[scaleKey].memoryMultiplier;
            
            for (const baseSize of commonSizes) {
                const scaledSize = Math.floor(baseSize * multiplier);
                if (scaledSize <= this.memoryLimits.safeMemoryLimit / 20) { // Don't pre-allocate more than 5%
                    pool.set(scaledSize, []);
                }
            }
        }

        console.log('✅ Fractional scaling buffer pools initialized');
    }

    /**
     * Setup enhanced garbage collection with progressive cleanup
     */
    setupEnhancedGC() {
        // More aggressive GC settings
        this.gcSettings.threshold = 0.7; // Start at 70% instead of 80%
        this.gcSettings.interval = 15000; // Run every 15 seconds instead of 30
        this.gcSettings.maxIdleTime = 30000; // Release buffers after 30 seconds instead of 60
        
        // Progressive cleanup based on memory pressure
        this.progressiveGCTimer = setInterval(() => {
            this.runProgressiveCleanup().catch(error => {
                console.error('❌ Progressive cleanup error:', error);
            });
        }, 5000); // Check every 5 seconds
        
        console.log('🗑️ Enhanced garbage collection configured');
    }

    /**
     * Get optimal buffer for fractional scaling
     */
    async getFractionalBuffer(scaleFactor, inputSize, usage) {
        const scaleKey = this.selectOptimalScaleKey(scaleFactor);
        const multiplier = this.adaptiveConfig.memoryLimits[scaleKey].memoryMultiplier;
        const requiredSize = Math.floor(inputSize * multiplier);
        
        // Check memory availability first
        if (!await this.checkMemoryAvailability(requiredSize)) {
            throw new Error(`Insufficient memory for ${scaleKey} scaling: ${this.formatBytes(requiredSize)} required`);
        }
        
        // Try to get buffer from fractional pool
        const pool = this.fractionalPools[scaleKey];
        let buffer = this.findPooledBuffer(pool, requiredSize);
        
        if (buffer) {
            console.log(`♻️ Reused ${scaleKey} buffer: ${this.formatBytes(requiredSize)}`);
            this.optimizationStats.bufferReuses++;
            this.memoryUsage.inUse += requiredSize;
            this.memoryUsage.pooled -= requiredSize;
        } else {
            // Create new buffer
            buffer = await this.createNewBuffer(requiredSize, usage);
            console.log(`🆕 Created new ${scaleKey} buffer: ${this.formatBytes(requiredSize)}`);
            this.memoryUsage.allocated += requiredSize;
            this.memoryUsage.inUse += requiredSize;
            this.memoryUsage.allocations++;
        }

        // Track buffer with scale information
        const bufferId = this.generateBufferId();
        this.activeBuffers.set(bufferId, {
            buffer,
            type: `fractional-${scaleKey}`,
            size: requiredSize,
            scaleFactor,
            created: Date.now(),
            lastUsed: Date.now()
        });

        buffer._memoryManagerId = bufferId;
        buffer._size = requiredSize;
        buffer._type = `fractional-${scaleKey}`;
        buffer._scaleFactor = scaleFactor;

        return buffer;
    }

    /**
     * Select optimal scale key based on scale factor
     */
    selectOptimalScaleKey(scaleFactor) {
        if (scaleFactor <= 1.2) return '1.1x';
        if (scaleFactor <= 1.8) return '1.5x';
        return '2.0x';
    }

    /**
     * Check memory availability with optimization suggestions
     */
    async checkMemoryAvailability(requiredSize) {
        const currentUsage = this.memoryUsage.allocated;
        const availableMemory = this.memoryLimits.safeMemoryLimit - currentUsage;
        const memoryPressure = currentUsage / this.memoryLimits.safeMemoryLimit;
        
        console.log(`🧠 Memory check: need ${this.formatBytes(requiredSize)}, available ${this.formatBytes(availableMemory)}, pressure ${(memoryPressure*100).toFixed(1)}%`);
        
        if (requiredSize <= availableMemory) {
            return true;
        }
        
        // Try aggressive cleanup if memory pressure is high
        if (memoryPressure > this.enhancedConfig.memoryPressureThreshold) {
            console.log('🧹 High memory pressure, running aggressive cleanup...');
            await this.runAggressiveCleanup();
            
            const newAvailable = this.memoryLimits.safeMemoryLimit - this.memoryUsage.allocated;
            if (requiredSize <= newAvailable) {
                this.optimizationStats.aggressiveCleanups++;
                return true;
            }
        }
        
        return false;
    }

    /**
     * Run aggressive cleanup to free memory
     */
    async runAggressiveCleanup() {
        console.log('🧹 Running aggressive memory cleanup...');
        
        const startTime = Date.now();
        let releasedMemory = 0;
        let releasedBuffers = 0;

        // Release all pooled buffers immediately
        for (const [poolName, pool] of Object.entries(this.bufferPools)) {
            for (const [size, buffers] of pool) {
                for (const buffer of buffers) {
                    try {
                        buffer.destroy();
                        releasedMemory += size;
                        releasedBuffers++;
                        this.memoryUsage.allocated -= size;
                        this.memoryUsage.pooled -= size;
                        this.memoryUsage.deallocations++;
                    } catch (error) {
                        console.warn('Warning: Failed to destroy pooled buffer:', error);
                    }
                }
                pool.set(size, []);
            }
        }

        // Release fractional pooled buffers
        for (const [scaleKey, pool] of Object.entries(this.fractionalPools)) {
            for (const [size, buffers] of pool) {
                for (const buffer of buffers) {
                    try {
                        buffer.destroy();
                        releasedMemory += size;
                        releasedBuffers++;
                        this.memoryUsage.allocated -= size;
                        this.memoryUsage.pooled -= size;
                        this.memoryUsage.deallocations++;
                    } catch (error) {
                        console.warn('Warning: Failed to destroy fractional buffer:', error);
                    }
                }
                pool.set(size, []);
            }
        }

        // Force GPU synchronization and cleanup
        if (this.device && this.device.queue) {
            await this.device.queue.onSubmittedWorkDone();
        }

        const cleanupTime = Date.now() - startTime;
        this.optimizationStats.totalMemorySaved += releasedMemory;
        
        console.log(`✅ Aggressive cleanup completed: released ${releasedBuffers} buffers (${this.formatBytes(releasedMemory)}) in ${cleanupTime}ms`);
    }

    /**
     * Run progressive cleanup based on memory pressure
     */
    async runProgressiveCleanup() {
        const memoryPressure = this.memoryUsage.allocated / this.memoryLimits.safeMemoryLimit;
        
        if (memoryPressure < 0.6) {
            return; // No cleanup needed
        }
        
        if (memoryPressure > 0.9) {
            // Critical memory pressure - run full aggressive cleanup
            await this.runAggressiveCleanup();
        } else if (memoryPressure > 0.75) {
            // High memory pressure - release oldest pooled buffers
            await this.releaseOldestPooledBuffers(0.5); // Release 50% of pooled buffers
        } else {
            // Moderate memory pressure - standard GC
            await this.runGarbageCollection();
        }
    }

    /**
     * Release oldest pooled buffers
     */
    async releaseOldestPooledBuffers(percentage) {
        let releasedMemory = 0;
        let releasedBuffers = 0;
        
        // Process regular pools
        for (const [poolName, pool] of Object.entries(this.bufferPools)) {
            for (const [size, buffers] of pool) {
                const releaseCount = Math.floor(buffers.length * percentage);
                
                for (let i = 0; i < releaseCount; i++) {
                    const buffer = buffers.shift(); // Remove from beginning (oldest)
                    if (buffer) {
                        try {
                            buffer.destroy();
                            releasedMemory += size;
                            releasedBuffers++;
                            this.memoryUsage.allocated -= size;
                            this.memoryUsage.pooled -= size;
                            this.memoryUsage.deallocations++;
                        } catch (error) {
                            console.warn('Warning: Failed to destroy buffer:', error);
                        }
                    }
                }
            }
        }
        
        // Process fractional pools
        for (const [scaleKey, pool] of Object.entries(this.fractionalPools)) {
            for (const [size, buffers] of pool) {
                const releaseCount = Math.floor(buffers.length * percentage);
                
                for (let i = 0; i < releaseCount; i++) {
                    const buffer = buffers.shift();
                    if (buffer) {
                        try {
                            buffer.destroy();
                            releasedMemory += size;
                            releasedBuffers++;
                            this.memoryUsage.allocated -= size;
                            this.memoryUsage.pooled -= size;
                            this.memoryUsage.deallocations++;
                        } catch (error) {
                            console.warn('Warning: Failed to destroy fractional buffer:', error);
                        }
                    }
                }
            }
        }
        
        if (releasedBuffers > 0) {
            console.log(`🧹 Progressive cleanup: released ${releasedBuffers} buffers (${this.formatBytes(releasedMemory)})`);
        }
    }

    /**
     * Release buffer with enhanced pooling
     */
    async releaseFractionalBuffer(buffer) {
        if (!buffer || !buffer._memoryManagerId) {
            console.warn('⚠️ Attempted to release invalid fractional buffer');
            return;
        }

        const bufferId = buffer._memoryManagerId;
        const bufferInfo = this.activeBuffers.get(bufferId);
        
        if (!bufferInfo) {
            console.warn('⚠️ Fractional buffer not found in active buffers');
            return;
        }

        const { type, size, scaleFactor } = bufferInfo;
        const scaleKey = this.selectOptimalScaleKey(scaleFactor);
        const pool = this.fractionalPools[scaleKey];
        
        if (!pool) {
            console.warn(`⚠️ Invalid fractional pool: ${scaleKey}`);
            buffer.destroy();
            return;
        }

        // Update memory usage
        this.memoryUsage.inUse -= size;
        
        // Check if we should pool or destroy the buffer
        const memoryPressure = this.memoryUsage.allocated / this.memoryLimits.safeMemoryLimit;
        const poolSize = Array.from(pool.values()).reduce((total, buffers) => total + buffers.length, 0);
        
        if (memoryPressure > 0.8 || poolSize >= this.gcSettings.maxPoolSize) {
            // High memory pressure or pool full - destroy buffer
            buffer.destroy();
            this.memoryUsage.allocated -= size;
            this.memoryUsage.deallocations++;
            console.log(`🗑️ Destroyed ${scaleKey} buffer (memory pressure): ${this.formatBytes(size)}`);
        } else {
            // Return to fractional pool
            if (!pool.has(size)) {
                pool.set(size, []);
            }
            pool.get(size).push(buffer);
            this.memoryUsage.pooled += size;
            console.log(`♻️ Returned ${scaleKey} buffer to pool: ${this.formatBytes(size)}`);
        }

        // Remove from active buffers
        this.activeBuffers.delete(bufferId);
    }

    /**
     * Determine optimal scaling strategy based on memory constraints
     */
    async determineOptimalScalingStrategy(targetScale, imageWidth, imageHeight) {
        const inputPixels = imageWidth * imageHeight;
        const outputPixels = inputPixels * (targetScale * targetScale);
        
        // Calculate memory requirements for different strategies
        const strategies = {
            '2.0x_progressive': this.calculateProgressiveMemory(targetScale, inputPixels, 2.0),
            '1.5x_progressive': this.calculateProgressiveMemory(targetScale, inputPixels, 1.5),
            '1.1x_progressive': this.calculateProgressiveMemory(targetScale, inputPixels, 1.1),
            'cpu_fallback': this.calculateCPUMemory(outputPixels)
        };
        
        const availableMemory = this.memoryLimits.safeMemoryLimit - this.memoryUsage.allocated;
        
        // Select optimal strategy
        for (const [strategy, memoryRequired] of Object.entries(strategies)) {
            if (memoryRequired <= availableMemory) {
                console.log(`🎯 Selected strategy: ${strategy} (${this.formatBytes(memoryRequired)} memory)`);
                return {
                    strategy,
                    memoryRequired,
                    estimatedStages: this.calculateStages(targetScale, strategy),
                    fallbackAvailable: strategies.cpu_fallback <= availableMemory * 2
                };
            }
        }
        
        // All WebGPU strategies exceed memory - recommend CPU fallback
        console.log(`⚠️ All WebGPU strategies exceed memory limit, recommending CPU fallback`);
        return {
            strategy: 'cpu_fallback',
            memoryRequired: strategies.cpu_fallback,
            estimatedStages: 1,
            fallbackAvailable: true
        };
    }

    /**
     * Calculate progressive memory requirements
     */
    calculateProgressiveMemory(targetScale, inputPixels, stepSize) {
        let maxMemory = 0;
        let currentScale = 1.0;
        const channels = 4; // RGBA
        const bytesPerChannel = 4; // f32
        
        while (currentScale < targetScale) {
            const nextScale = Math.min(currentScale * stepSize, targetScale);
            const currentPixels = inputPixels * (currentScale * currentScale);
            const nextPixels = inputPixels * (nextScale * nextScale);
            
            // Memory for input + output + overhead
            const stageMemory = (currentPixels + nextPixels) * channels * bytesPerChannel * 1.2;
            maxMemory = Math.max(maxMemory, stageMemory);
            
            currentScale = nextScale;
        }
        
        return maxMemory;
    }

    /**
     * Calculate CPU memory requirements (lower overhead)
     */
    calculateCPUMemory(outputPixels) {
        const channels = 4;
        const bytesPerChannel = 4;
        return outputPixels * channels * bytesPerChannel * 1.5; // Lower overhead than WebGPU
    }

    /**
     * Calculate number of stages for strategy
     */
    calculateStages(targetScale, strategy) {
        const stepSize = strategy.includes('2.0x') ? 2.0 : 
                        strategy.includes('1.5x') ? 1.5 : 
                        strategy.includes('1.1x') ? 1.1 : 1.0;
        
        if (stepSize === 1.0) return 1; // CPU fallback
        
        return Math.ceil(Math.log(targetScale) / Math.log(stepSize));
    }

    /**
     * Get enhanced memory statistics
     */
    getEnhancedMemoryStats() {
        const baseStats = this.getMemoryUsage();
        
        return {
            ...baseStats,
            enhancedConfig: this.enhancedConfig,
            optimizationStats: this.optimizationStats,
            fractionalPools: Object.fromEntries(
                Object.entries(this.fractionalPools).map(([key, pool]) => [
                    key, {
                        bufferCount: Array.from(pool.values()).reduce((sum, buffers) => sum + buffers.length, 0),
                        memoryUsed: Array.from(pool.entries()).reduce((sum, [size, buffers]) => sum + (size * buffers.length), 0)
                    }
                ])
            ),
            memoryPressure: (this.memoryUsage.allocated / this.memoryLimits.safeMemoryLimit),
            recommendations: this.generateMemoryRecommendations()
        };
    }

    /**
     * Generate memory optimization recommendations
     */
    generateMemoryRecommendations() {
        const memoryPressure = this.memoryUsage.allocated / this.memoryLimits.safeMemoryLimit;
        const recommendations = [];
        
        if (memoryPressure > 0.9) {
            recommendations.push('CRITICAL: Switch to CPU fallback immediately');
            recommendations.push('Enable aggressive cleanup for future operations');
        } else if (memoryPressure > 0.75) {
            recommendations.push('HIGH: Use 1.1x fractional scaling for next operations');
            recommendations.push('Consider running aggressive cleanup');
        } else if (memoryPressure > 0.6) {
            recommendations.push('MODERATE: Use 1.5x fractional scaling');
            recommendations.push('Monitor memory usage closely');
        } else {
            recommendations.push('LOW: 2x scaling safe, optimal performance available');
        }
        
        if (this.optimizationStats.bufferReuses < this.optimizationStats.allocations * 0.3) {
            recommendations.push('Consider increasing buffer pool sizes for better reuse');
        }
        
        return recommendations;
    }

    /**
     * Cleanup enhanced resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up enhanced WebGPU memory manager...');
        
        try {
            // Stop progressive GC timer
            if (this.progressiveGCTimer) {
                clearInterval(this.progressiveGCTimer);
                this.progressiveGCTimer = null;
            }
            
            // Cleanup fractional pools
            for (const [scaleKey, pool] of Object.entries(this.fractionalPools)) {
                for (const [size, buffers] of pool) {
                    for (const buffer of buffers) {
                        try {
                            buffer.destroy();
                        } catch (error) {
                            console.warn(`Warning: Failed to destroy ${scaleKey} buffer:`, error);
                        }
                    }
                }
                pool.clear();
            }
            
            // Call parent cleanup
            await super.cleanup();
            
            console.log('✅ Enhanced memory manager cleanup completed');
            
        } catch (error) {
            console.error('❌ Enhanced memory manager cleanup error:', error);
        }
    }
}

module.exports = EnhancedWebGPUMemoryManager; 