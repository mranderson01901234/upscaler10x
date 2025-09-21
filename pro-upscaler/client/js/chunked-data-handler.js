/**
 * chunked-data-handler.js
 * Handles large image results without creating massive canvases
 */

export class ChunkedDataHandler {
  constructor() {
    this.maxCanvasDimension = 32767;
    this.maxSafePixels = 500000000; // ~500MP
  }

  /**
   * Create chunked data structure for large images
   */
  createChunkedData(tiles, outputWidth, outputHeight) {
    return {
      width: outputWidth,
      height: outputHeight,
      tiles: tiles.map((tile, index) => ({
        index,
        x: tile.outputX,
        y: tile.outputY,
        width: tile.outputWidth,
        height: tile.outputHeight,
        canvas: tile.canvas,
        imageData: tile.processedData
      })),
      
      // Dynamic chunk extraction
      getChunk: (x, y, width, height) => {
        return this.extractChunk(tiles, x, y, width, height);
      },
      
      // Metadata
      isChunked: true,
      totalPixels: outputWidth * outputHeight,
      exceedsLimits: this.exceedsCanvasLimits(outputWidth, outputHeight)
    };
  }

  /**
   * Check if dimensions exceed canvas limits
   */
  exceedsCanvasLimits(width, height) {
    const totalPixels = width * height;
    const exceedsDimensionLimits = width > this.maxCanvasDimension || height > this.maxCanvasDimension;
    const exceedsMemoryLimits = totalPixels > this.maxSafePixels;
    
    return exceedsDimensionLimits || exceedsMemoryLimits;
  }

  /**
   * Extract a chunk from tiles without creating full canvas
   */
  extractChunk(tiles, x, y, width, height) {
    // Find relevant tiles
    const relevantTiles = tiles.filter(tile => 
      !(tile.outputX + tile.outputWidth <= x || 
        tile.outputX >= x + width || 
        tile.outputY + tile.outputHeight <= y || 
        tile.outputY >= y + height)
    );
    
    // Create chunk canvas
    const chunkCanvas = document.createElement('canvas');
    chunkCanvas.width = width;
    chunkCanvas.height = height;
    const ctx = chunkCanvas.getContext('2d');
    
    // Composite tiles
    relevantTiles.forEach(tile => {
      const srcX = Math.max(0, x - tile.outputX);
      const srcY = Math.max(0, y - tile.outputY);
      const dstX = Math.max(0, tile.outputX - x);
      const dstY = Math.max(0, tile.outputY - y);
      const copyWidth = Math.min(tile.outputWidth - srcX, width - dstX);
      const copyHeight = Math.min(tile.outputHeight - srcY, height - dstY);
      
      if (copyWidth > 0 && copyHeight > 0) {
        ctx.drawImage(tile.canvas, srcX, srcY, copyWidth, copyHeight, dstX, dstY, copyWidth, copyHeight);
      }
    });
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Create smart preview for display
   */
  createPreview(originalCanvas, targetWidth, targetHeight, previewSize = 1024) {
    const aspectRatio = targetHeight / targetWidth;
    
    const previewCanvas = document.createElement('canvas');
    if (aspectRatio > 1) {
      // Portrait
      previewCanvas.height = previewSize;
      previewCanvas.width = Math.round(previewSize / aspectRatio);
    } else {
      // Landscape
      previewCanvas.width = previewSize;
      previewCanvas.height = Math.round(previewSize * aspectRatio);
    }
    
    const ctx = previewCanvas.getContext('2d');
    ctx.drawImage(originalCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    
    // Add preview indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    return previewCanvas;
  }

  /**
   * Store virtual canvas with chunked data
   */
  storeVirtualCanvas(chunkedData) {
    const virtualCanvas = document.createElement('canvas');
    virtualCanvas.width = chunkedData.width;
    virtualCanvas.height = chunkedData.height;
    virtualCanvas.chunkedData = chunkedData;
    
    console.log(`💾 Stored virtual canvas: ${virtualCanvas.width}×${virtualCanvas.height} (${chunkedData.tiles.length} tiles)`);
    
    return virtualCanvas;
  }
} 