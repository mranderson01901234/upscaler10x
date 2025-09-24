/**
 * CPU Tiled Image Processor - Handles large images by breaking them into tiles
 * This processor provides memory benefits by processing images in smaller chunks using CPU
 * Serves as a fallback when WebGPU is not available but still provides tiled processing benefits
 */

const sharp = require('sharp');
const path = require('path');

class CPUTiledProcessor {
    constructor() {
        // Tiling configuration
        this.config = {
            defaultTileSize: 1024,      // 1024x1024 tiles
            overlapSize: 64,            // 64px overlap to prevent seams
            maxTileSize: 2048,          // Maximum tile size for very large images
            minTileSize: 512,           // Minimum tile size
            memoryLimitGB: 4.0,         // Memory limit for CPU processing
            maxConcurrentTiles: 1       // Process tiles sequentially to avoid memory issues
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
        
        // Estimate memory usage for CPU processing (less than WebGPU but still significant)
        const estimatedMemoryGB = (outputPixels * 4) / (1024 * 1024 * 1024);
        
        // Use tiled processing for:
        // 1. Scale factors > 4x (to avoid Sharp quantization issues)
        // 2. Estimated memory > limit
        // 3. Large output images (> 50MP)
        const shouldUseTiled = scaleFactor > 4 || 
                              estimatedMemoryGB > this.config.memoryLimitGB ||
                              outputPixels > 50000000;
        
        console.log(`🎯 CPU Tiled processing decision: ${shouldUseTiled}`);
        console.log(`   Scale factor: ${scaleFactor}x (tiled threshold: 4x)`);
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
        
        console.log(`🧩 CPU Tile configuration:`);
        console.log(`   Input tile size: ${inputTileSize}×${inputTileSize} (${overlapInput}px overlap)`);
        console.log(`   Output tile size: ${tileSize}×${tileSize} (${this.config.overlapSize}px overlap)`);
        console.log(`   Grid: ${tilesX}×${tilesY} = ${totalTiles} tiles`);
        console.log(`   Estimated processing time: ${(totalTiles * 3).toFixed(1)}s`);
        
        return config;
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
     * Process a single tile using CPU (Sharp)
     */
    async processTile(tileData, scaleFactor, options, onProgress) {
        const { buffer, width, height, tileX, tileY } = tileData;
        const tileId = `${tileX}-${tileY}`;
        
        console.log(`🚀 Processing CPU tile ${tileId} (${width}×${height}) with ${scaleFactor}x scaling`);
        
        const startTime = Date.now();
        
        try {
            const targetWidth = Math.round(width * scaleFactor);
            const targetHeight = Math.round(height * scaleFactor);
            
            // Process tile with Sharp CPU processing
            const processedBuffer = await sharp(buffer)
                .resize(targetWidth, targetHeight, {
                    kernel: sharp.kernel.lanczos3,
                    fit: 'fill'
                })
                .png()
                .toBuffer();
            
            const processingTime = Date.now() - startTime;
            console.log(`✅ CPU Tile ${tileId} processed in ${processingTime}ms`);
            
            // Update stats
            this.processingStats.processedTiles++;
            const avgTime = this.processingStats.averageTileTime;
            const count = this.processingStats.processedTiles;
            this.processingStats.averageTileTime = (avgTime * (count - 1) + processingTime) / count;
            
            return {
                success: true,
                buffer: processedBuffer,
                data: processedBuffer,
                width: targetWidth,
                height: targetHeight,
                tileX,
                tileY,
                originalX: tileData.x,
                originalY: tileData.y,
                processingTime,
                method: 'cpu-tiled'
            };
            
        } catch (error) {
            console.error(`❌ Failed to process CPU tile ${tileId}:`, error);
            throw error;
        }
    }

    /**
     * Composite processed tiles into final image
     */
    async compositeTiles(processedTiles, tileConfig, onProgress) {
        const { outputWidth, outputHeight, scaleFactor, overlapOutput } = tileConfig;
        
        console.log(`🎨 Compositing ${processedTiles.length} CPU tiles into ${outputWidth}×${outputHeight} image`);
        
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
                    onProgress(progress, `Compositing CPU tile ${i + 1}/${processedTiles.length}`);
                }
            }
            
            // Perform composite operation
            console.log(`🎨 Compositing ${compositeOps.length} CPU tile operations...`);
            
            const finalBuffer = await canvas
                .composite(compositeOps)
                .png()
                .toBuffer();
            
            console.log(`✅ CPU Compositing completed: ${finalBuffer.length} bytes`);
            
            return finalBuffer;
            
        } catch (error) {
            console.error('❌ Failed to composite CPU tiles:', error);
            throw error;
        }
    }

    /**
     * Process image using CPU tiled approach
     */
    async processImageTiled(imageBuffer, scaleFactor, options = {}, onProgress) {
        const startTime = Date.now();
        const sessionId = `cpu_tiled_${Date.now()}`;
        
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
            memoryPeakUsage: 0
        };
        
        console.log(`🚀 Starting CPU tiled processing (${sessionId})`);
        
        try {
            if (onProgress) onProgress(5, 'Analyzing image for CPU tiled processing...');
            
            // Get image metadata
            const metadata = await sharp(imageBuffer).metadata();
            const { width, height } = metadata;
            
            // Calculate tile configuration
            const tileConfig = this.calculateTileConfiguration(width, height, scaleFactor);
            this.processingStats.totalTiles = tileConfig.totalTiles;
            
            if (onProgress) onProgress(10, `Processing ${tileConfig.totalTiles} CPU tiles...`);
            
            // Extract and process tiles
            const processedTiles = [];
            
            for (let tileY = 0; tileY < tileConfig.tilesY; tileY++) {
                for (let tileX = 0; tileX < tileConfig.tilesX; tileX++) {
                    const tileIndex = tileY * tileConfig.tilesX + tileX;
                    const progressBase = 10 + (tileIndex / tileConfig.totalTiles) * 70;
                    
                    if (onProgress) {
                        onProgress(progressBase, `Processing CPU tile ${tileIndex + 1}/${tileConfig.totalTiles}...`);
                    }
                    
                    // Extract tile
                    const tileData = await this.extractTile(imageBuffer, tileConfig, tileX, tileY);
                    
                    // Process tile with CPU
                    const processedTile = await this.processTile(tileData, scaleFactor, options, onProgress);
                    
                    processedTiles.push(processedTile);
                    
                    // Force garbage collection after each tile to manage memory
                    if (global.gc) {
                        global.gc();
                    }
                }
            }
            
            if (onProgress) onProgress(85, 'Compositing CPU tiles into final image...');
            
            // Composite tiles into final image
            const finalBuffer = await this.compositeTiles(processedTiles, tileConfig, onProgress);
            
            const totalTime = Date.now() - startTime;
            this.processingStats.totalProcessingTime = totalTime;
            
            console.log(`✅ CPU Tiled processing completed in ${totalTime}ms`);
            console.log(`📊 Processing stats:`);
            console.log(`   Total tiles: ${this.processingStats.totalTiles}`);
            console.log(`   Average tile time: ${this.processingStats.averageTileTime.toFixed(1)}ms`);
            console.log(`   Total time: ${totalTime}ms`);
            console.log(`   Throughput: ${(this.processingStats.totalTiles / (totalTime / 1000)).toFixed(1)} tiles/sec`);
            
            if (onProgress) onProgress(100, `CPU tiled processing completed in ${totalTime}ms`);
            
            return {
                success: true,
                data: finalBuffer,
                buffer: finalBuffer,
                width: tileConfig.outputWidth,
                height: tileConfig.outputHeight,
                processingTime: totalTime,
                method: 'cpu-tiled',
                algorithm: 'lanczos3',
                tilesProcessed: this.processingStats.totalTiles,
                averageTileTime: this.processingStats.averageTileTime,
                format: options.format || 'png',
                extension: options.format || 'png'
            };
            
        } catch (error) {
            console.error(`❌ CPU tiled processing failed (${sessionId}):`, error);
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
        console.log('🧹 Cleaning up CPU tiled processor resources...');
        
        try {
            // Reset processing state
            this.currentSession = null;
            
            console.log('✅ CPU tiled processor cleanup completed');
            
        } catch (error) {
            console.error('❌ CPU tiled processor cleanup error:', error);
        }
    }
}

module.exports = CPUTiledProcessor; 