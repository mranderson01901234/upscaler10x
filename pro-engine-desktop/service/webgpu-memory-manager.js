/**
 * WebGPU Memory Manager - GPU Memory Optimization System
 * Handles buffer pool management, memory limits, garbage collection, and usage monitoring
 */

class WebGPUMemoryManager {
    constructor(adapter, device) {
        this.adapter = adapter;
        this.device = device;
        this.initialized = false;
        
        // Memory limits and tracking
        this.memoryLimits = {
            maxBufferSize: 0,
            maxStorageBufferSize: 0,
            maxUniformBufferSize: 0,
            totalGPUMemory: 0,
            safeMemoryLimit: 0
        };
        
        // Buffer pool management
        this.bufferPools = {
            input: new Map(),      // Input image buffers
            output: new Map(),     // Output image buffers  
            uniform: new Map(),    // Uniform parameter buffers
            staging: new Map(),    // Staging buffers for data transfer
            compute: new Map()     // General compute buffers
        };
        
        // Memory usage tracking
        this.memoryUsage = {
            allocated: 0,
            inUse: 0,
            pooled: 0,
            peak: 0,
            allocations: 0,
            deallocations: 0
        };
        
        // Buffer lifecycle tracking
        this.activeBuffers = new Map();
        this.bufferHistory = [];
        
        // Garbage collection settings
        this.gcSettings = {
            enabled: true,
            threshold: 0.8, // Trigger GC at 80% memory usage
            interval: 30000, // Run GC every 30 seconds
            maxPoolSize: 50, // Maximum buffers per pool
            maxIdleTime: 60000 // Release buffers idle for 60 seconds
        };
        
        this.gcTimer = null;
    }

    /**
     * Initialize memory manager
     */
    async initialize() {
        console.log('🧠 Initializing WebGPU Memory Manager...');
        
        try {
            // Get memory limits from adapter
            await this.detectMemoryLimits();
            
            // Initialize buffer pools
            this.initializeBufferPools();
            
            // Start garbage collection if enabled
            if (this.gcSettings.enabled) {
                this.startGarbageCollection();
            }
            
            this.initialized = true;
            console.log('✅ WebGPU Memory Manager initialized');
            console.log(`📊 GPU Memory Limits: ${this.formatBytes(this.memoryLimits.safeMemoryLimit)} safe limit`);
            
        } catch (error) {
            console.error('❌ Memory Manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Detect GPU memory limits
     */
    async detectMemoryLimits() {
        if (this.adapter.limits) {
            this.memoryLimits.maxBufferSize = this.adapter.limits.maxBufferSize || 1024 * 1024 * 1024; // 1GB default
            this.memoryLimits.maxStorageBufferSize = this.adapter.limits.maxStorageBufferBindingSize || 128 * 1024 * 1024; // 128MB default
            this.memoryLimits.maxUniformBufferSize = this.adapter.limits.maxUniformBufferBindingSize || 64 * 1024; // 64KB default
        } else {
            // Conservative defaults if limits not available
            this.memoryLimits.maxBufferSize = 512 * 1024 * 1024; // 512MB
            this.memoryLimits.maxStorageBufferSize = 64 * 1024 * 1024; // 64MB
            this.memoryLimits.maxUniformBufferSize = 16 * 1024; // 16KB
        }

        // Estimate total GPU memory based on max buffer size
        if (this.memoryLimits.maxBufferSize >= 1024 * 1024 * 1024) {
            this.memoryLimits.totalGPUMemory = 4 * 1024 * 1024 * 1024; // 4GB estimate
        } else if (this.memoryLimits.maxBufferSize >= 512 * 1024 * 1024) {
            this.memoryLimits.totalGPUMemory = 2 * 1024 * 1024 * 1024; // 2GB estimate
        } else {
            this.memoryLimits.totalGPUMemory = 1 * 1024 * 1024 * 1024; // 1GB estimate
        }

        // Set safe memory limit (70% of estimated total)
        this.memoryLimits.safeMemoryLimit = Math.floor(this.memoryLimits.totalGPUMemory * 0.7);
        
        console.log('📊 Detected GPU Memory Limits:');
        console.log(`  Max Buffer Size: ${this.formatBytes(this.memoryLimits.maxBufferSize)}`);
        console.log(`  Max Storage Buffer: ${this.formatBytes(this.memoryLimits.maxStorageBufferSize)}`);
        console.log(`  Estimated GPU Memory: ${this.formatBytes(this.memoryLimits.totalGPUMemory)}`);
        console.log(`  Safe Memory Limit: ${this.formatBytes(this.memoryLimits.safeMemoryLimit)}`);
    }

    /**
     * Initialize buffer pools
     */
    initializeBufferPools() {
        // Pre-allocate common buffer sizes for each pool type
        const commonSizes = [
            1024 * 1024,      // 1MB
            4 * 1024 * 1024,  // 4MB
            16 * 1024 * 1024, // 16MB
            64 * 1024 * 1024, // 64MB
            256 * 1024 * 1024 // 256MB
        ];

        for (const poolName of Object.keys(this.bufferPools)) {
            for (const size of commonSizes) {
                if (size <= this.memoryLimits.safeMemoryLimit / 10) { // Don't pre-allocate more than 10% of safe limit
                    this.bufferPools[poolName].set(size, []);
                }
            }
        }

        console.log('✅ Buffer pools initialized');
    }

    /**
     * Get buffer from pool or create new one
     */
    async getBuffer(type, size, usage) {
        if (!this.initialized) {
            throw new Error('Memory manager not initialized');
        }

        // Check if we have enough memory available
        if (this.memoryUsage.allocated + size > this.memoryLimits.safeMemoryLimit) {
            console.warn('⚠️ Memory limit approaching, triggering garbage collection...');
            await this.runGarbageCollection();
            
            // Check again after GC
            if (this.memoryUsage.allocated + size > this.memoryLimits.safeMemoryLimit) {
                throw new Error(`Insufficient GPU memory: requested ${this.formatBytes(size)}, available ${this.formatBytes(this.memoryLimits.safeMemoryLimit - this.memoryUsage.allocated)}`);
            }
        }

        const pool = this.bufferPools[type];
        if (!pool) {
            throw new Error(`Invalid buffer type: ${type}`);
        }

        // Try to find a suitable buffer in the pool
        let buffer = this.findPooledBuffer(pool, size);
        
        if (buffer) {
            // Reuse existing buffer
            console.log(`♻️ Reusing ${type} buffer: ${this.formatBytes(size)}`);
            this.memoryUsage.inUse += size;
            this.memoryUsage.pooled -= size;
        } else {
            // Create new buffer
            buffer = await this.createNewBuffer(size, usage || this.getDefaultUsage(type));
            console.log(`🆕 Created new ${type} buffer: ${this.formatBytes(size)}`);
            this.memoryUsage.allocated += size;
            this.memoryUsage.inUse += size;
            this.memoryUsage.allocations++;
        }

        // Track buffer usage
        const bufferId = this.generateBufferId();
        this.activeBuffers.set(bufferId, {
            buffer,
            type,
            size,
            created: Date.now(),
            lastUsed: Date.now()
        });

        // Update peak memory usage
        if (this.memoryUsage.allocated > this.memoryUsage.peak) {
            this.memoryUsage.peak = this.memoryUsage.allocated;
        }

        // Add buffer metadata
        buffer._memoryManagerId = bufferId;
        buffer._size = size;
        buffer._type = type;

        return buffer;
    }

    /**
     * Find suitable buffer from pool
     */
    findPooledBuffer(pool, requestedSize) {
        // Look for exact size match first
        const exactSizeBuffers = pool.get(requestedSize);
        if (exactSizeBuffers && exactSizeBuffers.length > 0) {
            return exactSizeBuffers.pop();
        }

        // Look for slightly larger buffer (up to 2x size)
        const maxAcceptableSize = requestedSize * 2;
        const sortedSizes = Array.from(pool.keys()).sort((a, b) => a - b);
        
        for (const size of sortedSizes) {
            if (size >= requestedSize && size <= maxAcceptableSize) {
                const buffers = pool.get(size);
                if (buffers && buffers.length > 0) {
                    return buffers.pop();
                }
            }
        }

        return null;
    }

    /**
     * Create new WebGPU buffer
     */
    async createNewBuffer(size, usage) {
        try {
            const buffer = this.device.createBuffer({
                size: size,
                usage: usage,
                mappedAtCreation: false
            });

            return buffer;
        } catch (error) {
            console.error('❌ Failed to create buffer:', error);
            throw new Error(`Buffer creation failed: ${error.message}`);
        }
    }

    /**
     * Get default usage flags for buffer type
     */
    getDefaultUsage(type) {
        const GPUBufferUsage = {
            STORAGE: 0x80,
            UNIFORM: 0x40,
            COPY_SRC: 0x04,
            COPY_DST: 0x08,
            MAP_READ: 0x01,
            MAP_WRITE: 0x02
        };

        switch (type) {
            case 'input':
                return GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
            case 'output':
                return GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
            case 'uniform':
                return GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
            case 'staging':
                return GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ;
            case 'compute':
                return GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
            default:
                return GPUBufferUsage.STORAGE;
        }
    }

    /**
     * Release buffer back to pool
     */
    async releaseBuffer(buffer) {
        if (!buffer || !buffer._memoryManagerId) {
            console.warn('⚠️ Attempted to release invalid buffer');
            return;
        }

        const bufferId = buffer._memoryManagerId;
        const bufferInfo = this.activeBuffers.get(bufferId);
        
        if (!bufferInfo) {
            console.warn('⚠️ Buffer not found in active buffers');
            return;
        }

        const { type, size } = bufferInfo;
        const pool = this.bufferPools[type];
        
        if (!pool) {
            console.warn(`⚠️ Invalid buffer type for pooling: ${type}`);
            buffer.destroy();
            return;
        }

        // Update memory usage
        this.memoryUsage.inUse -= size;
        
        // Check if pool is full
        const poolSize = Array.from(pool.values()).reduce((total, buffers) => total + buffers.length, 0);
        
        if (poolSize >= this.gcSettings.maxPoolSize) {
            // Pool is full, destroy buffer
            buffer.destroy();
            this.memoryUsage.allocated -= size;
            this.memoryUsage.deallocations++;
            console.log(`🗑️ Destroyed ${type} buffer (pool full): ${this.formatBytes(size)}`);
        } else {
            // Return to pool
            if (!pool.has(size)) {
                pool.set(size, []);
            }
            pool.get(size).push(buffer);
            this.memoryUsage.pooled += size;
            console.log(`♻️ Returned ${type} buffer to pool: ${this.formatBytes(size)}`);
        }

        // Remove from active buffers
        this.activeBuffers.delete(bufferId);
        
        // Add to history for debugging
        this.bufferHistory.push({
            id: bufferId,
            type,
            size,
            created: bufferInfo.created,
            released: Date.now(),
            lifetime: Date.now() - bufferInfo.created
        });

        // Keep history size manageable
        if (this.bufferHistory.length > 1000) {
            this.bufferHistory.splice(0, 500);
        }
    }

    /**
     * Release multiple buffers
     */
    async releaseBuffers(buffers) {
        for (const buffer of buffers) {
            await this.releaseBuffer(buffer);
        }
    }

    /**
     * Start garbage collection timer
     */
    startGarbageCollection() {
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
        }

        this.gcTimer = setInterval(() => {
            this.runGarbageCollection().catch(error => {
                console.error('❌ Garbage collection error:', error);
            });
        }, this.gcSettings.interval);

        console.log('🗑️ Garbage collection started');
    }

    /**
     * Run garbage collection
     */
    async runGarbageCollection() {
        console.log('🗑️ Running garbage collection...');
        
        const startTime = Date.now();
        let releasedMemory = 0;
        let releasedBuffers = 0;

        // Release idle buffers from pools
        for (const [poolName, pool] of Object.entries(this.bufferPools)) {
            for (const [size, buffers] of pool) {
                const buffersToKeep = [];
                
                for (const buffer of buffers) {
                    const bufferAge = Date.now() - (buffer._lastUsed || buffer._created || Date.now());
                    
                    if (bufferAge > this.gcSettings.maxIdleTime) {
                        // Buffer is idle, destroy it
                        buffer.destroy();
                        releasedMemory += size;
                        releasedBuffers++;
                        this.memoryUsage.allocated -= size;
                        this.memoryUsage.pooled -= size;
                        this.memoryUsage.deallocations++;
                    } else {
                        buffersToKeep.push(buffer);
                    }
                }
                
                pool.set(size, buffersToKeep);
            }
        }

        // Check memory pressure and release more if needed
        const memoryPressure = this.memoryUsage.allocated / this.memoryLimits.safeMemoryLimit;
        
        if (memoryPressure > this.gcSettings.threshold) {
            console.log(`⚠️ High memory pressure: ${(memoryPressure * 100).toFixed(1)}%`);
            
            // Release additional buffers from largest pools first
            const poolSizes = [];
            for (const [poolName, pool] of Object.entries(this.bufferPools)) {
                const poolMemory = Array.from(pool.entries()).reduce((total, [size, buffers]) => {
                    return total + (size * buffers.length);
                }, 0);
                poolSizes.push({ poolName, poolMemory, pool });
            }
            
            poolSizes.sort((a, b) => b.poolMemory - a.poolMemory);
            
            // Release buffers from largest pools until pressure is reduced
            for (const { poolName, pool } of poolSizes) {
                if (memoryPressure <= this.gcSettings.threshold * 0.8) break;
                
                for (const [size, buffers] of pool) {
                    const releaseCount = Math.ceil(buffers.length * 0.3); // Release 30% of buffers
                    
                    for (let i = 0; i < releaseCount && buffers.length > 0; i++) {
                        const buffer = buffers.pop();
                        buffer.destroy();
                        releasedMemory += size;
                        releasedBuffers++;
                        this.memoryUsage.allocated -= size;
                        this.memoryUsage.pooled -= size;
                        this.memoryUsage.deallocations++;
                    }
                }
            }
        }

        const gcTime = Date.now() - startTime;
        
        if (releasedBuffers > 0) {
            console.log(`✅ GC completed: released ${releasedBuffers} buffers (${this.formatBytes(releasedMemory)}) in ${gcTime}ms`);
        }
    }

    /**
     * Get current memory usage
     */
    getMemoryUsage() {
        return {
            ...this.memoryUsage,
            limits: this.memoryLimits,
            utilizationPercent: (this.memoryUsage.allocated / this.memoryLimits.safeMemoryLimit) * 100,
            poolStats: this.getPoolStats(),
            activeBufferCount: this.activeBuffers.size
        };
    }

    /**
     * Get buffer pool statistics
     */
    getPoolStats() {
        const stats = {};
        
        for (const [poolName, pool] of Object.entries(this.bufferPools)) {
            let totalBuffers = 0;
            let totalMemory = 0;
            
            for (const [size, buffers] of pool) {
                totalBuffers += buffers.length;
                totalMemory += size * buffers.length;
            }
            
            stats[poolName] = {
                bufferCount: totalBuffers,
                memoryUsed: totalMemory,
                sizeBuckets: pool.size
            };
        }
        
        return stats;
    }

    /**
     * Generate unique buffer ID
     */
    generateBufferId() {
        return `buffer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Format bytes for human-readable output
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get memory manager statistics for debugging
     */
    getDebugStats() {
        return {
            memoryUsage: this.getMemoryUsage(),
            activeBuffers: Array.from(this.activeBuffers.entries()).map(([id, info]) => ({
                id,
                type: info.type,
                size: info.size,
                age: Date.now() - info.created
            })),
            recentHistory: this.bufferHistory.slice(-10),
            gcSettings: this.gcSettings
        };
    }

    /**
     * Cleanup all resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up GPU memory manager...');
        
        try {
            // Stop garbage collection
            if (this.gcTimer) {
                clearInterval(this.gcTimer);
                this.gcTimer = null;
            }
            
            // Destroy all active buffers
            for (const [bufferId, bufferInfo] of this.activeBuffers) {
                try {
                    bufferInfo.buffer.destroy();
                } catch (error) {
                    console.warn(`Warning: Failed to destroy buffer ${bufferId}:`, error);
                }
            }
            
            // Destroy all pooled buffers
            for (const [poolName, pool] of Object.entries(this.bufferPools)) {
                for (const [size, buffers] of pool) {
                    for (const buffer of buffers) {
                        try {
                            buffer.destroy();
                        } catch (error) {
                            console.warn(`Warning: Failed to destroy pooled buffer:`, error);
                        }
                    }
                }
                pool.clear();
            }
            
            // Clear tracking
            this.activeBuffers.clear();
            this.bufferHistory = [];
            
            // Reset memory usage
            this.memoryUsage = {
                allocated: 0,
                inUse: 0,
                pooled: 0,
                peak: 0,
                allocations: 0,
                deallocations: 0
            };
            
            this.initialized = false;
            console.log('✅ GPU memory manager cleanup completed');
            
        } catch (error) {
            console.error('❌ Memory manager cleanup error:', error);
        }
    }
}

module.exports = WebGPUMemoryManager; 