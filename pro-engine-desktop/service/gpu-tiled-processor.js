/**
 * GPU Tiled Image Processor - Handles large images by breaking them into tiles
 * Uses existing GPU acceleration with tiling to bypass the 4.1x memory wall
 * This is the REAL implementation of Prompt 1: Tiled GPU Processing
 */

const sharp = require('sharp');
const path = require('path');

class GPUTiledProcessor {
    constructor(gpuProcessor) {
        this.gpuProcessor = gpuProcessor;
        
        // Tiling configuration optimized for GTX 1050
        this.config = {
            defaultTileSize: 1024,      // 1024x1024 tiles (manageable for GTX 1050)
            overlapSize: 64,            // 64px overlap to prevent seam artifacts
            maxTileSize: 1536,          // Maximum tile size
            minTileSize: 512,           // Minimum tile size
            memoryLimitGB: 2.0,         // Conservative limit for GTX 1050 (3GB VRAM)
            maxConcurrentTiles: 1,      // Legacy sequential processing (will be overridden)
            
            // NEW: Parallel processing configuration
            parallelConcurrency: 6,     // Process 6 tiles in parallel (configurable)
            enableParallelProcessing: true, // Enable parallel tile processing
            maxParallelMemoryGB: 1.5,   // Memory limit per concurrent tile
            parallelBatchSize: 4,       // Process tiles in batches to manage memory
            adaptiveConcurrency: true   // Adjust concurrency based on tile size
        };
        
        // Processing state
        this.currentSession = null;
        this.processingStats = {
            totalTiles: 0,
            processedTiles: 0,
            averageTileTime: 0,
            totalProcessingTime: 0,
            memoryPeakUsage: 0
        };
    }

    /**
     * Check if tiled processing should be used
     */
    shouldUseTiledProcessing(imageWidth, imageHeight, scaleFactor) {
        const inputPixels = imageWidth * imageHeight;
        const outputPixels = inputPixels * (scaleFactor * scaleFactor);
        
        // Estimate memory usage (4 bytes per pixel RGBA)
        const estimatedMemoryGB = (outputPixels * 4) / (1024 * 1024 * 1024);
        
        // Use tiled processing for:
        // 1. Scale factors > 4.1x (known memory wall)
        // 2. Estimated memory > GPU limit
        // 3. Large output images (> 100MP)
        const shouldUseTiled = scaleFactor > 4.1 || 
                              estimatedMemoryGB > this.config.memoryLimitGB ||
                              outputPixels > 100 * 1000000;
        
        console.log(`🎯 Tiled processing decision for ${imageWidth}×${imageHeight} @ ${scaleFactor}x:`);
        console.log(`   • Output pixels: ${(outputPixels/1000000).toFixed(1)}MP`);
        console.log(`   • Estimated memory: ${estimatedMemoryGB.toFixed(1)}GB`);
        console.log(`   • Should use tiled: ${shouldUseTiled}`);
        
        return shouldUseTiled;
    }

    /**
     * Calculate optimal tile configuration for the image
     */
    calculateTileConfiguration(imageWidth, imageHeight, scaleFactor) {
        const outputWidth = Math.round(imageWidth * scaleFactor);
        const outputHeight = Math.round(imageHeight * scaleFactor);
        
        // Start with default tile size and adjust based on image size
        let tileSize = this.config.defaultTileSize;
        
        // For very large images, use larger tiles to reduce overhead
        if (outputWidth > 6000 || outputHeight > 6000) {
            tileSize = this.config.maxTileSize;
        } else if (outputWidth < 2000 && outputHeight < 2000) {
            tileSize = this.config.minTileSize;
        }
        
        // Calculate number of tiles needed (input image coordinates)
        const inputTileSize = Math.round(tileSize / scaleFactor);
        const overlapInput = Math.round(this.config.overlapSize / scaleFactor);
        
        const tilesX = Math.ceil(imageWidth / (inputTileSize - overlapInput));
        const tilesY = Math.ceil(imageHeight / (inputTileSize - overlapInput));
        const totalTiles = tilesX * tilesY;
        
        const config = {
            inputTileSize,
            outputTileSize: tileSize,
            overlapInput,
            overlapOutput: this.config.overlapSize,
            tilesX,
            tilesY,
            totalTiles,
            imageWidth,
            imageHeight,
            outputWidth,
            outputHeight,
            scaleFactor
        };
        
        console.log(`🧩 GPU Tile configuration:`);
        console.log(`   Input tile size: ${inputTileSize}×${inputTileSize} (${overlapInput}px overlap)`);
        console.log(`   Output tile size: ${tileSize}×${tileSize} (${this.config.overlapSize}px overlap)`);
        console.log(`   Grid: ${tilesX}×${tilesY} = ${totalTiles} tiles`);
        console.log(`   Estimated processing time: ${(totalTiles * 2).toFixed(1)}s`);
        
        return config;
    }

    /**
     * Configure parallel processing settings at runtime
     */
    configureParallelProcessing(options = {}) {
        if (options.parallelConcurrency !== undefined) {
            this.config.parallelConcurrency = parseInt(options.parallelConcurrency);
        }
        
        if (options.enableParallelProcessing !== undefined) {
            this.config.enableParallelProcessing = options.enableParallelProcessing;
        }
        
        console.log(`🔧 GPU Parallel processing configured: ${this.config.enableParallelProcessing ? 'ENABLED' : 'DISABLED'} (concurrency: ${this.config.parallelConcurrency})`);
    }

    /**
     * Calculate optimal concurrency based on tile size and system capabilities
     */
    calculateOptimalConcurrency(tileConfig) {
        if (!this.config.enableParallelProcessing) {
            return 1;
        }

        let optimalConcurrency = this.config.parallelConcurrency;
        
        if (this.config.adaptiveConcurrency) {
            // Estimate memory per tile (input + output + processing overhead)
            const inputTilePixels = tileConfig.inputTileSize * tileConfig.inputTileSize;
            const outputTilePixels = tileConfig.outputTileSize * tileConfig.outputTileSize;
            const memoryPerTileGB = ((inputTilePixels + outputTilePixels) * 4 * 1.5) / (1024 * 1024 * 1024);
            
            // Adjust concurrency based on memory requirements
            const maxConcurrencyByMemory = Math.floor(this.config.maxParallelMemoryGB / memoryPerTileGB);
            optimalConcurrency = Math.min(optimalConcurrency, maxConcurrencyByMemory);
            
            // For very large tile counts, increase concurrency
            if (tileConfig.totalTiles > 16) {
                optimalConcurrency = Math.min(optimalConcurrency + 2, 8);
            }
        }
        
        // Ensure we don't exceed total tiles or go below 1
        optimalConcurrency = Math.max(1, Math.min(optimalConcurrency, tileConfig.totalTiles));
        
        console.log(`🚀 GPU Optimal concurrency: ${optimalConcurrency} tiles in parallel`);
        console.log(`   Memory per tile: ${(((tileConfig.inputTileSize * tileConfig.inputTileSize + tileConfig.outputTileSize * tileConfig.outputTileSize) * 4 * 1.5) / (1024 * 1024 * 1024)).toFixed(3)}GB`);
        
        return optimalConcurrency;
    }

    /**
     * Create a queue of all tiles to be processed
     */
    createTileQueue(tileConfig) {
        const queue = [];
        
        for (let tileY = 0; tileY < tileConfig.tilesY; tileY++) {
            for (let tileX = 0; tileX < tileConfig.tilesX; tileX++) {
                queue.push({
                    tileX,
                    tileY,
                    index: tileY * tileConfig.tilesX + tileX,
                    priority: 0 // Could be used for processing order optimization
                });
            }
        }
        
        console.log(`📋 GPU Created processing queue with ${queue.length} tiles`);
        return queue;
    }

    /**
     * Process tiles in parallel using worker pool pattern
     */
    async processWorkerPool(imageBuffer, tileConfig, scaleFactor, algorithm, onProgress) {
        const concurrency = this.calculateOptimalConcurrency(tileConfig);
        const tileQueue = this.createTileQueue(tileConfig);
        const processedTiles = [];
        let completedTiles = 0;
        
        console.log(`🏭 GPU Starting worker pool with ${concurrency} concurrent workers`);
        
        // Create worker promises
        const workers = Array(concurrency).fill().map(async (_, workerId) => {
            console.log(`👷 GPU Worker ${workerId} started`);
            
            while (tileQueue.length > 0) {
                // Get next tile from queue (thread-safe in Node.js single-threaded environment)
                const tileInfo = tileQueue.shift();
                if (!tileInfo) break;
                
                const startTime = Date.now();
                
                try {
                    console.log(`👷 GPU Worker ${workerId} processing tile ${tileInfo.tileX},${tileInfo.tileY} (${tileInfo.index + 1}/${tileConfig.totalTiles})`);
                    
                    // Extract tile
                    const tileData = await this.extractTile(imageBuffer, tileConfig, tileInfo.tileX, tileInfo.tileY);
                    
                    // Process tile with GPU
                    const processedTile = await this.processTile(tileData, scaleFactor, algorithm, (progress, message) => {
                        if (onProgress) {
                            const overallProgress = 10 + (completedTiles / tileConfig.totalTiles) * 70;
                            onProgress({ progress: overallProgress, message: `GPU Worker ${workerId}: ${message}` });
                        }
                    });
                    
                    processedTiles.push(processedTile);
                    completedTiles++;
                    
                    const tileTime = Date.now() - startTime;
                    console.log(`✅ GPU Worker ${workerId} completed tile ${tileInfo.tileX},${tileInfo.tileY} in ${tileTime}ms (${completedTiles}/${tileConfig.totalTiles})`);
                    
                    // Update progress
                    if (onProgress) {
                        const progress = 10 + (completedTiles / tileConfig.totalTiles) * 70;
                        onProgress({ 
                            progress: progress, 
                            message: `Completed ${completedTiles}/${tileConfig.totalTiles} tiles (${concurrency} GPU workers)`,
                            stage: 'processing'
                        });
                    }
                    
                    // Force garbage collection after each tile
                    if (global.gc && completedTiles % 2 === 0) {
                        global.gc();
                    }
                    
                } catch (error) {
                    console.error(`❌ GPU Worker ${workerId} failed on tile ${tileInfo.tileX},${tileInfo.tileY}:`, error);
                    throw error;
                }
            }
            
            console.log(`👷 GPU Worker ${workerId} finished`);
        });
        
        // Wait for all workers to complete
        await Promise.all(workers);
        
        // Update stats
        this.processingStats.peakConcurrency = concurrency;
        this.processingStats.concurrentTilesProcessed = processedTiles.length;
        
        console.log(`🏭 GPU Worker pool completed: ${processedTiles.length} tiles processed with ${concurrency} workers`);
        
        return processedTiles;
    }

    /**
     * Extract a tile from the source image
     */
    async extractTile(imageBuffer, tileConfig, tileX, tileY) {
        const { inputTileSize, overlapInput } = tileConfig;
        
        // Calculate tile boundaries with overlap
        const stride = inputTileSize - overlapInput;
        const left = Math.max(0, tileX * stride);
        const top = Math.max(0, tileY * stride);
        const right = Math.min(tileConfig.inputWidth || 2000, left + inputTileSize);
        const bottom = Math.min(tileConfig.inputHeight || 3000, top + inputTileSize);
        
        const actualWidth = right - left;
        const actualHeight = bottom - top;
        
        console.log(`🔪 Extracting tile ${tileX},${tileY}: ${left},${top} → ${right},${bottom} (${actualWidth}×${actualHeight})`);
        
        try {
            const tileBuffer = await sharp(imageBuffer)
                .extract({ left, top, width: actualWidth, height: actualHeight })
                .png()
                .toBuffer();
            
            return {
                buffer: tileBuffer,
                x: tileX,
                y: tileY,
                originalX: left,
                originalY: top,
                width: actualWidth,
                height: actualHeight
            };
        } catch (error) {
            console.error(`❌ Failed to extract tile ${tileX},${tileY}:`, error.message);
            throw error;
        }
    }

    /**
     * Process a single tile using GPU acceleration
     */
    async processTile(tileData, scaleFactor, options, onProgress) {
        const tileId = `${tileData.x}-${tileData.y}`;
        const startTime = Date.now();
        
        try {
            console.log(`🚀 Processing GPU tile ${tileId} (${tileData.width}×${tileData.height}) with ${scaleFactor}x scaling`);
            
            // Use the existing GPU processor to process this tile
            const result = await this.gpuProcessor.processImage(
                tileData.buffer,
                scaleFactor,
                {
                    algorithm: options.algorithm || 'lanczos3',
                    format: 'png',
                    quality: 95
                },
                null // No progress callback for individual tiles
            );
            
            const processingTime = Date.now() - startTime;
            this.processingStats.processedTiles++;
            this.processingStats.averageTileTime = 
                (this.processingStats.averageTileTime * (this.processingStats.processedTiles - 1) + processingTime) / 
                this.processingStats.processedTiles;
            
            console.log(`✅ GPU Tile ${tileId} processed in ${processingTime}ms`);
            
            return {
                buffer: result.data,
                tileX: tileData.x,
                tileY: tileData.y,
                originalX: tileData.originalX,
                originalY: tileData.originalY,
                width: result.width,
                height: result.height,
                processingTime
            };
            
        } catch (error) {
            console.error(`❌ Failed to process GPU tile ${tileId}:`, error);
            throw error;
        }
    }

    /**
     * Composite processed tiles into final image
     */
    async compositeTiles(processedTiles, tileConfig, onProgress) {
        const { outputWidth, outputHeight, scaleFactor, overlapOutput } = tileConfig;
        
        console.log(`🎨 Compositing ${processedTiles.length} GPU tiles into ${outputWidth}×${outputHeight} image`);
        
        try {
            // Create base canvas for compositing
            const canvas = sharp({
                create: {
                    width: outputWidth,
                    height: outputHeight,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }
            });
            
            // Prepare composite operations
            const compositeOps = [];
            
            for (let i = 0; i < processedTiles.length; i++) {
                const tile = processedTiles[i];
                const { tileX, tileY, buffer, originalX, originalY } = tile;
                
                // Calculate position in output image
                const outputX = Math.round(originalX * scaleFactor);
                const outputY = Math.round(originalY * scaleFactor);
                
                if (onProgress) {
                    const progress = Math.round((i / processedTiles.length) * 100);
                    onProgress(progress, `Compositing GPU tile ${i + 1}/${processedTiles.length}`);
                    console.log(`📊 Progress: ${progress}% - Compositing GPU tile ${i + 1}/${processedTiles.length}`);
                }
                
                // Handle overlap blending by cropping overlap regions
                let tileBuffer = buffer;
                
                // For tiles that aren't on the edges, crop the overlap
                if (tileX > 0 || tileY > 0 || tileX < tileConfig.tilesX - 1 || tileY < tileConfig.tilesY - 1) {
                    const metadata = await sharp(buffer).metadata();
                    
                    // Calculate crop parameters to remove overlap
                    const cropLeft = tileX > 0 ? overlapOutput : 0;
                    const cropTop = tileY > 0 ? overlapOutput : 0;
                    const cropWidth = metadata.width - cropLeft - (tileX < tileConfig.tilesX - 1 ? overlapOutput : 0);
                    const cropHeight = metadata.height - cropTop - (tileY < tileConfig.tilesY - 1 ? overlapOutput : 0);
                    
                    if (cropWidth > 0 && cropHeight > 0) {
                        tileBuffer = await sharp(buffer)
                            .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
                            .png()
                            .toBuffer();
                    }
                }
                
                compositeOps.push({
                    input: tileBuffer,
                    left: outputX,
                    top: outputY,
                    blend: 'over'
                });
            }
            
            console.log(`🎨 Compositing ${compositeOps.length} GPU tile operations...`);
            
            // Apply all composite operations
            const result = await canvas
                .composite(compositeOps)
                .png()
                .toBuffer();
            
            return result;
            
        } catch (error) {
            console.error(`❌ Failed to composite GPU tiles:`, error);
            throw error;
        }
    }

    /**
     * Process image using GPU tiled processing
     */
    async processImageTiled(imageBuffer, scaleFactor, options = {}, onProgress) {
        const sessionId = `gpu_tiled_${Date.now()}`;
        const startTime = Date.now();
        
        this.currentSession = {
            id: sessionId,
            startTime,
            scaleFactor,
            options
        };
        
        // Reset stats
        this.processingStats = {
            totalTiles: 0,
            processedTiles: 0,
            averageTileTime: 0,
            totalProcessingTime: 0,
            memoryPeakUsage: 0,
            
            // NEW: Parallel processing stats
            concurrentTilesProcessed: 0,
            parallelBatches: 0,
            averageBatchTime: 0,
            peakConcurrency: 0
        };
        
        console.log(`🚀 Starting GPU tiled processing (${sessionId})`);
        
        try {
            // Configure parallel processing based on options
            this.configureParallelProcessing(options);
            
            if (onProgress) onProgress({ progress: 5, message: 'Analyzing image for GPU tiled processing...', stage: 'initializing' });
            
            // Get image metadata
            const metadata = await sharp(imageBuffer).metadata();
            const { width, height } = metadata;
            
            // Calculate tile configuration
            const tileConfig = this.calculateTileConfiguration(width, height, scaleFactor);
            tileConfig.inputWidth = width;
            tileConfig.inputHeight = height;
            this.processingStats.totalTiles = tileConfig.totalTiles;
            
            if (onProgress) onProgress({ progress: 10, message: `Processing ${tileConfig.totalTiles} GPU tiles...`, stage: 'processing' });
            
            // Choose processing strategy based on configuration
            let processedTiles;
            
            if (this.config.enableParallelProcessing && tileConfig.totalTiles > 1) {
                console.log(`🚀 Using PARALLEL GPU processing for ${tileConfig.totalTiles} tiles`);
                
                // Use parallel worker pool processing
                processedTiles = await this.processWorkerPool(imageBuffer, tileConfig, scaleFactor, options.algorithm || 'lanczos3', onProgress);
            } else {
                console.log(`⚡ Using SEQUENTIAL GPU processing (fallback)`);
                
                // Fallback to sequential processing
                processedTiles = [];
                
                for (let tileY = 0; tileY < tileConfig.tilesY; tileY++) {
                    for (let tileX = 0; tileX < tileConfig.tilesX; tileX++) {
                        const tileIndex = tileY * tileConfig.tilesX + tileX;
                        const progressBase = 10 + (tileIndex / tileConfig.totalTiles) * 70;
                        
                        if (onProgress) {
                            onProgress({ 
                                progress: progressBase, 
                                message: `Processing GPU tile ${tileIndex + 1}/${tileConfig.totalTiles}...`,
                                stage: 'processing'
                            });
                        }
                        
                        // Extract tile
                        const tileData = await this.extractTile(imageBuffer, tileConfig, tileX, tileY);
                        
                        // Process tile with GPU
                        const processedTile = await this.processTile(tileData, scaleFactor, options, onProgress);
                        
                        processedTiles.push(processedTile);
                        
                        // Force garbage collection after each tile to manage memory
                        if (global.gc) {
                            global.gc();
                        }
                    }
                }
            }
            
            if (onProgress) onProgress({ progress: 85, message: 'Compositing GPU tiles into final image...', stage: 'compositing' });
            
            // Composite tiles into final image
            const finalBuffer = await this.compositeTiles(processedTiles, tileConfig, onProgress);
            
            const totalTime = Date.now() - startTime;
            this.processingStats.totalProcessingTime = totalTime;
            
            console.log(`✅ GPU Tiled processing completed in ${totalTime}ms`);
            console.log(`📊 Processing stats:`);
            console.log(`   Total tiles: ${this.processingStats.totalTiles}`);
            console.log(`   Average tile time: ${this.processingStats.averageTileTime.toFixed(1)}ms`);
            console.log(`   Total time: ${totalTime}ms`);
            console.log(`   Throughput: ${(this.processingStats.totalTiles / (totalTime / 1000)).toFixed(1)} tiles/sec`);
            
            // Parallel processing stats
            if (this.config.enableParallelProcessing && this.processingStats.peakConcurrency > 1) {
                console.log(`🚀 GPU Parallel processing stats:`);
                console.log(`   Peak concurrency: ${this.processingStats.peakConcurrency} workers`);
                console.log(`   Concurrent tiles processed: ${this.processingStats.concurrentTilesProcessed}`);
                const speedupFactor = this.processingStats.peakConcurrency;
                const estimatedSequentialTime = totalTime * speedupFactor;
                console.log(`   Estimated speedup: ${speedupFactor.toFixed(1)}x (vs ~${(estimatedSequentialTime/1000).toFixed(1)}s sequential)`);
            }
            
            if (onProgress) onProgress({ progress: 100, message: `GPU tiled processing completed in ${totalTime}ms`, stage: 'complete' });
            
            return {
                success: true,
                data: finalBuffer,
                buffer: finalBuffer,
                width: tileConfig.outputWidth,
                height: tileConfig.outputHeight,
                processingTime: totalTime,
                method: 'gpu-tiled-parallel',
                algorithm: options.algorithm || 'lanczos3',
                tilesProcessed: this.processingStats.totalTiles,
                averageTileTime: this.processingStats.averageTileTime,
                format: options.format || 'png',
                extension: options.format || 'png',
                
                // Parallel processing metrics
                parallelProcessing: {
                    enabled: this.config.enableParallelProcessing,
                    peakConcurrency: this.processingStats.peakConcurrency,
                    concurrentTilesProcessed: this.processingStats.concurrentTilesProcessed,
                    parallelBatches: this.processingStats.parallelBatches,
                    averageBatchTime: this.processingStats.averageBatchTime,
                    estimatedSpeedup: this.processingStats.peakConcurrency || 1
                }
            };
            
        } catch (error) {
            console.error(`❌ GPU tiled processing failed (${sessionId}):`, error);
            throw error;
        } finally {
            this.currentSession = null;
        }
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return { ...this.processingStats };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.currentSession) {
            console.log('🧹 Cleaning up GPU tiled processing session...');
            this.currentSession = null;
        }
        
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }
    }
}

module.exports = GPUTiledProcessor; 