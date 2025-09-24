/**
 * WebGPU Tiled Image Processor - Handles large images by breaking them into tiles
 * This processor bypasses WebGPU memory limits by processing images in smaller chunks
 */

const sharp = require('sharp');
const path = require('path');

class WebGPUTiledProcessor {
    constructor(webgpuProcessor, memoryManager) {
        this.webgpuProcessor = webgpuProcessor;
        this.memoryManager = memoryManager;
        
        // Tiling configuration
        this.config = {
            defaultTileSize: 1024,      // 1024x1024 tiles
            overlapSize: 64,            // 64px overlap to prevent seams
            maxTileSize: 2048,          // Maximum tile size for very large images
            minTileSize: 512,           // Minimum tile size
            memoryLimitGB: 2.0,         // Conservative memory limit for GTX 1050
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
            memoryPeakUsage: 0,
            
            // NEW: Parallel processing stats
            concurrentTilesProcessed: 0,
            parallelBatches: 0,
            averageBatchTime: 0,
            peakConcurrency: 0
        };
    }

    /**
     * Check if tiled processing should be used
     */
    shouldUseTiledProcessing(imageWidth, imageHeight, scaleFactor) {
        const inputPixels = imageWidth * imageHeight;
        const outputPixels = inputPixels * (scaleFactor * scaleFactor);
        
        // Estimate memory usage (RGBA channels * 4 bytes per f32)
        const estimatedMemoryGB = (outputPixels * 4 * 4) / (1024 * 1024 * 1024);
        
        // Use tiled processing for:
        // 1. Scale factors > 4.1x (known memory wall)
        // 2. Estimated memory > limit
        // 3. Large output images (> 50MP)
        const shouldUseTiled = scaleFactor > 4.1 || 
                              estimatedMemoryGB > this.config.memoryLimitGB ||
                              outputPixels > 50000000;
        
        console.log(`🎯 Tiled processing decision: ${shouldUseTiled}`);
        console.log(`   Scale factor: ${scaleFactor}x`);
        console.log(`   Input: ${imageWidth}×${imageHeight} (${(inputPixels/1000000).toFixed(1)}MP)`);
        console.log(`   Output: ${Math.round(imageWidth * scaleFactor)}×${Math.round(imageHeight * scaleFactor)} (${(outputPixels/1000000).toFixed(1)}MP)`);
        console.log(`   Estimated memory: ${estimatedMemoryGB.toFixed(2)}GB`);
        
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
        if (outputWidth > 8000 || outputHeight > 8000) {
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
        
        console.log(`🧩 Tile configuration:`);
        console.log(`   Input tile size: ${inputTileSize}×${inputTileSize} (${overlapInput}px overlap)`);
        console.log(`   Output tile size: ${tileSize}×${tileSize} (${this.config.overlapSize}px overlap)`);
        console.log(`   Grid: ${tilesX}×${tilesY} = ${totalTiles} tiles`);
        console.log(`   Estimated processing time: ${(totalTiles * 2).toFixed(1)}s`);
        
        return config;
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
            const memoryPerTileGB = ((inputTilePixels + outputTilePixels) * 4 * 4 * 1.5) / (1024 * 1024 * 1024);
            
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
        
        console.log(`🚀 Optimal concurrency: ${optimalConcurrency} tiles in parallel`);
        console.log(`   Memory per tile: ${(((tileConfig.inputTileSize * tileConfig.inputTileSize + tileConfig.outputTileSize * tileConfig.outputTileSize) * 4 * 4 * 1.5) / (1024 * 1024 * 1024)).toFixed(3)}GB`);
        
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
        
        console.log(`📋 Created processing queue with ${queue.length} tiles`);
        return queue;
    }

    /**
     * Process tiles in parallel using worker pool pattern
     */
    async processWorkerPool(imageBuffer, tileConfig, scaleFactor, options, onProgress) {
        const concurrency = this.calculateOptimalConcurrency(tileConfig);
        const tileQueue = this.createTileQueue(tileConfig);
        const processedTiles = [];
        let completedTiles = 0;
        
        console.log(`🏭 Starting worker pool with ${concurrency} concurrent workers`);
        
        // Create worker promises
        const workers = Array(concurrency).fill().map(async (_, workerId) => {
            console.log(`👷 Worker ${workerId} started`);
            
            while (tileQueue.length > 0) {
                // Get next tile from queue (thread-safe in Node.js single-threaded environment)
                const tileInfo = tileQueue.shift();
                if (!tileInfo) break;
                
                const startTime = Date.now();
                
                try {
                    console.log(`👷 Worker ${workerId} processing tile ${tileInfo.tileX},${tileInfo.tileY} (${tileInfo.index + 1}/${tileConfig.totalTiles})`);
                    
                    // Extract tile
                    const tileData = await this.extractTile(imageBuffer, tileConfig, tileInfo.tileX, tileInfo.tileY);
                    
                    // Process tile with WebGPU
                    const processedTile = await this.processTile(tileData, scaleFactor, options, (progress, message) => {
                        if (onProgress) {
                            const overallProgress = 10 + (completedTiles / tileConfig.totalTiles) * 70;
                            onProgress(overallProgress, `Worker ${workerId}: ${message}`);
                        }
                    });
                    
                    processedTiles.push(processedTile);
                    completedTiles++;
                    
                    const tileTime = Date.now() - startTime;
                    console.log(`✅ Worker ${workerId} completed tile ${tileInfo.tileX},${tileInfo.tileY} in ${tileTime}ms (${completedTiles}/${tileConfig.totalTiles})`);
                    
                    // Update progress
                    if (onProgress) {
                        const progress = 10 + (completedTiles / tileConfig.totalTiles) * 70;
                        onProgress(progress, `Completed ${completedTiles}/${tileConfig.totalTiles} tiles (${concurrency} workers)`);
                    }
                    
                    // Force garbage collection after each tile
                    if (global.gc && completedTiles % 2 === 0) {
                        global.gc();
                    }
                    
                } catch (error) {
                    console.error(`❌ Worker ${workerId} failed on tile ${tileInfo.tileX},${tileInfo.tileY}:`, error);
                    throw error;
                }
            }
            
            console.log(`👷 Worker ${workerId} finished`);
        });
        
        // Wait for all workers to complete
        await Promise.all(workers);
        
        // Update stats
        this.processingStats.peakConcurrency = concurrency;
        this.processingStats.concurrentTilesProcessed = processedTiles.length;
        
        console.log(`🏭 Worker pool completed: ${processedTiles.length} tiles processed with ${concurrency} workers`);
        
        return processedTiles;
    }

    /**
     * Process tiles in batches for memory management
     */
    async processTilesBatch(imageBuffer, tileConfig, scaleFactor, options, onProgress) {
        const batchSize = this.config.parallelBatchSize;
        const totalTiles = tileConfig.totalTiles;
        const batches = Math.ceil(totalTiles / batchSize);
        
        console.log(`📦 Processing ${totalTiles} tiles in ${batches} batches of ${batchSize}`);
        
        const allProcessedTiles = [];
        let completedTiles = 0;
        
        for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
            const batchStart = batchIndex * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, totalTiles);
            const batchTiles = batchEnd - batchStart;
            
            console.log(`📦 Processing batch ${batchIndex + 1}/${batches}: tiles ${batchStart + 1}-${batchEnd}`);
            
            const batchStartTime = Date.now();
            
            // Create a subset configuration for this batch
            const batchQueue = [];
            let tileIndex = 0;
            
            for (let tileY = 0; tileY < tileConfig.tilesY; tileY++) {
                for (let tileX = 0; tileX < tileConfig.tilesX; tileX++) {
                    if (tileIndex >= batchStart && tileIndex < batchEnd) {
                        batchQueue.push({ tileX, tileY, index: tileIndex });
                    }
                    tileIndex++;
                }
            }
            
            // Process batch in parallel
            const batchProcessedTiles = [];
            const concurrency = Math.min(this.calculateOptimalConcurrency(tileConfig), batchTiles);
            
            const batchWorkers = Array(concurrency).fill().map(async (_, workerId) => {
                while (batchQueue.length > 0) {
                    const tileInfo = batchQueue.shift();
                    if (!tileInfo) break;
                    
                    try {
                        // Extract and process tile
                        const tileData = await this.extractTile(imageBuffer, tileConfig, tileInfo.tileX, tileInfo.tileY);
                        const processedTile = await this.processTile(tileData, scaleFactor, options, onProgress);
                        
                        batchProcessedTiles.push(processedTile);
                        completedTiles++;
                        
                        if (onProgress) {
                            const progress = 10 + (completedTiles / totalTiles) * 70;
                            onProgress(progress, `Batch ${batchIndex + 1}/${batches}: ${completedTiles}/${totalTiles} tiles`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ Batch ${batchIndex + 1} worker ${workerId} failed:`, error);
                        throw error;
                    }
                }
            });
            
            await Promise.all(batchWorkers);
            
            allProcessedTiles.push(...batchProcessedTiles);
            
            const batchTime = Date.now() - batchStartTime;
            console.log(`✅ Batch ${batchIndex + 1}/${batches} completed in ${batchTime}ms (${batchTiles} tiles)`);
            
            // Update batch stats
            this.processingStats.parallelBatches++;
            const avgBatchTime = this.processingStats.averageBatchTime;
            const batchCount = this.processingStats.parallelBatches;
            this.processingStats.averageBatchTime = (avgBatchTime * (batchCount - 1) + batchTime) / batchCount;
            
            // Force garbage collection between batches
            if (global.gc) {
                global.gc();
            }
            
            if (this.memoryManager) {
                await this.memoryManager.runGarbageCollection();
            }
        }
        
        console.log(`📦 All ${batches} batches completed: ${allProcessedTiles.length} tiles processed`);
        
        return allProcessedTiles;
    }

    /**
     * Extract tile from source image
     */
    async extractTile(imageBuffer, tileConfig, tileX, tileY) {
        const { inputTileSize, overlapInput, imageWidth, imageHeight } = tileConfig;
        
        // Calculate tile boundaries with overlap
        const startX = Math.max(0, tileX * (inputTileSize - overlapInput) - overlapInput);
        const startY = Math.max(0, tileY * (inputTileSize - overlapInput) - overlapInput);
        
        const endX = Math.min(imageWidth, startX + inputTileSize + overlapInput);
        const endY = Math.min(imageHeight, startY + inputTileSize + overlapInput);
        
        const actualWidth = endX - startX;
        const actualHeight = endY - startY;
        
        console.log(`🔪 Extracting tile ${tileX},${tileY}: ${startX},${startY} → ${endX},${endY} (${actualWidth}×${actualHeight})`);
        
        try {
            // Extract tile using Sharp
            const tileBuffer = await sharp(imageBuffer)
                .extract({
                    left: startX,
                    top: startY,
                    width: actualWidth,
                    height: actualHeight
                })
                .png() // Use PNG to preserve quality between tiles
                .toBuffer();
            
            return {
                buffer: tileBuffer,
                x: startX,
                y: startY,
                width: actualWidth,
                height: actualHeight,
                tileX,
                tileY
            };
            
        } catch (error) {
            console.error(`❌ Failed to extract tile ${tileX},${tileY}:`, error);
            throw error;
        }
    }

    /**
     * Process a single tile using WebGPU
     */
    async processTile(tileData, scaleFactor, options, onProgress) {
        const { buffer, width, height, tileX, tileY } = tileData;
        const tileId = `${tileX}-${tileY}`;
        
        console.log(`🚀 Processing tile ${tileId} (${width}×${height}) with ${scaleFactor}x scaling`);
        
        const startTime = Date.now();
        
        try {
            // Process tile with WebGPU (should now fit in memory)
            const result = await this.webgpuProcessor.processImage(
                buffer,
                scaleFactor,
                {
                    ...options,
                    algorithm: options.algorithm || 'bicubic'
                },
                (progress, message) => {
                    if (onProgress) {
                        onProgress(progress, `Processing tile ${tileId}: ${message}`);
                    }
                }
            );
            
            const processingTime = Date.now() - startTime;
            console.log(`✅ Tile ${tileId} processed in ${processingTime}ms`);
            
            // Update stats
            this.processingStats.processedTiles++;
            const avgTime = this.processingStats.averageTileTime;
            const count = this.processingStats.processedTiles;
            this.processingStats.averageTileTime = (avgTime * (count - 1) + processingTime) / count;
            
            return {
                ...result,
                tileX,
                tileY,
                originalX: tileData.x,
                originalY: tileData.y,
                processingTime
            };
            
        } catch (error) {
            console.error(`❌ Failed to process tile ${tileId}:`, error);
            throw error;
        }
    }

    /**
     * Composite processed tiles into final image
     */
    async compositeTiles(processedTiles, tileConfig, onProgress) {
        const { outputWidth, outputHeight, scaleFactor, overlapOutput } = tileConfig;
        
        console.log(`🎨 Compositing ${processedTiles.length} tiles into ${outputWidth}×${outputHeight} image`);
        
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
                            .extract({
                                left: cropLeft,
                                top: cropTop,
                                width: Math.max(1, cropWidth),
                                height: Math.max(1, cropHeight)
                            })
                            .toBuffer();
                    }
                }
                
                compositeOps.push({
                    input: tileBuffer,
                    top: outputY,
                    left: outputX
                });
                
                if (onProgress) {
                    const progress = Math.round((i + 1) / processedTiles.length * 100);
                    onProgress(progress, `Compositing tile ${i + 1}/${processedTiles.length}`);
                }
            }
            
            // Perform composite operation
            console.log(`🎨 Compositing ${compositeOps.length} tile operations...`);
            
            const finalBuffer = await canvas
                .composite(compositeOps)
                .png()
                .toBuffer();
            
            console.log(`✅ Compositing completed: ${finalBuffer.length} bytes`);
            
            return finalBuffer;
            
        } catch (error) {
            console.error('❌ Failed to composite tiles:', error);
            throw error;
        }
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
        
        console.log(`🔧 Parallel processing configured: ${this.config.enableParallelProcessing ? 'ENABLED' : 'DISABLED'} (concurrency: ${this.config.parallelConcurrency})`);
    }

    /**
     * Process image using tiled approach
     */
    async processImageTiled(imageBuffer, scaleFactor, options = {}, onProgress) {
        const startTime = Date.now();
        const sessionId = `tiled_${Date.now()}`;
        
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
        
        console.log(`🚀 Starting tiled WebGPU processing (${sessionId})`);
        
        try {
            // Configure parallel processing based on options
            this.configureParallelProcessing(options);
            
            if (onProgress) onProgress(5, 'Analyzing image for tiled processing...');
            
            // Get image metadata
            const metadata = await sharp(imageBuffer).metadata();
            const { width, height } = metadata;
            
            // Calculate tile configuration
            const tileConfig = this.calculateTileConfiguration(width, height, scaleFactor);
            this.processingStats.totalTiles = tileConfig.totalTiles;
            
            if (onProgress) onProgress(10, `Processing ${tileConfig.totalTiles} tiles...`);
            
            // Choose processing strategy based on configuration
            let processedTiles;
            
            if (this.config.enableParallelProcessing && tileConfig.totalTiles > 1) {
                console.log(`🚀 Using PARALLEL processing for ${tileConfig.totalTiles} tiles`);
                
                // Use batched parallel processing for better memory management
                if (tileConfig.totalTiles > this.config.parallelBatchSize * 2) {
                    console.log(`📦 Using BATCHED parallel processing`);
                    processedTiles = await this.processTilesBatch(imageBuffer, tileConfig, scaleFactor, options, onProgress);
                } else {
                    console.log(`🏭 Using WORKER POOL parallel processing`);
                    processedTiles = await this.processWorkerPool(imageBuffer, tileConfig, scaleFactor, options, onProgress);
                }
            } else {
                console.log(`⚡ Using SEQUENTIAL processing (fallback)`);
                
                // Fallback to sequential processing
                processedTiles = [];
                
                for (let tileY = 0; tileY < tileConfig.tilesY; tileY++) {
                    for (let tileX = 0; tileX < tileConfig.tilesX; tileX++) {
                        const tileIndex = tileY * tileConfig.tilesX + tileX;
                        const progressBase = 10 + (tileIndex / tileConfig.totalTiles) * 70;
                        
                        if (onProgress) {
                            onProgress(progressBase, `Processing tile ${tileIndex + 1}/${tileConfig.totalTiles}...`);
                        }
                        
                        // Extract tile
                        const tileData = await this.extractTile(imageBuffer, tileConfig, tileX, tileY);
                        
                        // Process tile with WebGPU
                        const processedTile = await this.processTile(tileData, scaleFactor, options, onProgress);
                        
                        processedTiles.push(processedTile);
                        
                        // Force garbage collection after each tile to manage memory
                        if (global.gc) {
                            global.gc();
                        }
                        
                        // Release any temporary buffers
                        if (this.memoryManager) {
                            await this.memoryManager.runGarbageCollection();
                        }
                    }
                }
            }
            
            if (onProgress) onProgress(85, 'Compositing tiles into final image...');
            
            // Composite tiles into final image
            const finalBuffer = await this.compositeTiles(processedTiles, tileConfig, onProgress);
            
            const totalTime = Date.now() - startTime;
            this.processingStats.totalProcessingTime = totalTime;
            
            console.log(`✅ Tiled WebGPU processing completed in ${totalTime}ms`);
            console.log(`📊 Processing stats:`);
            console.log(`   Total tiles: ${this.processingStats.totalTiles}`);
            console.log(`   Average tile time: ${this.processingStats.averageTileTime.toFixed(1)}ms`);
            console.log(`   Total time: ${totalTime}ms`);
            console.log(`   Throughput: ${(this.processingStats.totalTiles / (totalTime / 1000)).toFixed(1)} tiles/sec`);
            
            // Parallel processing stats
            if (this.config.enableParallelProcessing && this.processingStats.peakConcurrency > 1) {
                console.log(`🚀 Parallel processing stats:`);
                console.log(`   Peak concurrency: ${this.processingStats.peakConcurrency} workers`);
                console.log(`   Concurrent tiles processed: ${this.processingStats.concurrentTilesProcessed}`);
                if (this.processingStats.parallelBatches > 0) {
                    console.log(`   Parallel batches: ${this.processingStats.parallelBatches}`);
                    console.log(`   Average batch time: ${this.processingStats.averageBatchTime.toFixed(1)}ms`);
                }
                const speedupFactor = this.processingStats.peakConcurrency;
                const estimatedSequentialTime = totalTime * speedupFactor;
                console.log(`   Estimated speedup: ${speedupFactor.toFixed(1)}x (vs ~${(estimatedSequentialTime/1000).toFixed(1)}s sequential)`);
            }
            
            if (onProgress) onProgress(100, `Tiled processing completed in ${totalTime}ms`);
            
            return {
                success: true,
                data: finalBuffer,
                buffer: finalBuffer,
                width: tileConfig.outputWidth,
                height: tileConfig.outputHeight,
                processingTime: totalTime,
                method: 'webgpu-tiled-parallel',
                algorithm: options.algorithm || 'bicubic',
                tilesProcessed: this.processingStats.totalTiles,
                averageTileTime: this.processingStats.averageTileTime,
                
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
            console.error(`❌ Tiled processing failed (${sessionId}):`, error);
            throw error;
        } finally {
            this.currentSession = null;
        }
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return {
            ...this.processingStats,
            currentSession: this.currentSession?.id || null,
            config: this.config
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up tiled processor resources...');
        
        try {
            // Reset processing state
            this.currentSession = null;
            
            console.log('✅ Tiled processor cleanup completed');
            
        } catch (error) {
            console.error('❌ Tiled processor cleanup error:', error);
        }
    }
}

module.exports = WebGPUTiledProcessor; 