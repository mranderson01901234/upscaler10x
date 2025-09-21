/**
 * ultra-fast-upscaler-integration.js
 * Complete integration example showing how to use the system
 */

import { UltraFastProgressiveUpscaler } from './ultra-fast-progressive-upscaler.js';
import { ChunkedDataHandler } from './chunked-data-handler.js';

export class UltraFastUpscalerSystem {
  constructor() {
    this.progressiveUpscaler = new UltraFastProgressiveUpscaler();
    this.chunkedHandler = new ChunkedDataHandler();
    this.fullResolutionCanvas = null;
  }

  /**
   * Process image with automatic canvas limit handling
   */
  async processImage(imageData, scaleFactor, progressCallback = null) {
    const startTime = performance.now();
    
    this.progressiveUpscaler.setScaleFactor(scaleFactor);
    
    const targetWidth = imageData.width * scaleFactor;
    const targetHeight = imageData.height * scaleFactor;
    
    console.log(`🚀 Processing: ${imageData.width}×${imageData.height} → ${targetWidth}×${targetHeight} (${scaleFactor}x)`);
    
    try {
      // Attempt progressive upscaling
      const result = await this.progressiveUpscaler.enhance(imageData, progressCallback);
      
      // Store result
      if (result.chunkedData) {
        // Large image with chunked data
        this.fullResolutionCanvas = this.chunkedHandler.storeVirtualCanvas(result.chunkedData);
        const previewCanvas = this.chunkedHandler.createPreview(
          this.createCanvasFromImageData(imageData), 
          targetWidth, 
          targetHeight
        );
        
        return {
          canvas: previewCanvas,
          fullResolutionCanvas: this.fullResolutionCanvas,
          isChunked: true,
          dimensions: { width: targetWidth, height: targetHeight },
          processingTime: result.processingTime
        };
      } else {
        // Regular result
        const canvas = this.createCanvasFromImageData(result.imageData);
        this.fullResolutionCanvas = canvas;
        
        return {
          canvas,
          fullResolutionCanvas: this.fullResolutionCanvas,
          isChunked: false,
          dimensions: { width: targetWidth, height: targetHeight },
          processingTime: result.processingTime
        };
      }
      
    } catch (error) {
      console.error('❌ Processing failed:', error);
      throw error;
    }
  }

  /**
   * Download result with automatic format selection
   */
  async downloadResult(filename = null) {
    if (!this.fullResolutionCanvas) {
      throw new Error('No result to download');
    }
    
    if (this.fullResolutionCanvas.chunkedData) {
      // Chunked result - use server-side composition or WASM
      console.log('📦 Downloading chunked result...');
      await this.downloadChunkedResult(filename);
    } else {
      // Regular result - direct download
      console.log('💾 Downloading regular result...');
      this.downloadCanvas(this.fullResolutionCanvas, filename);
    }
  }

  /**
   * Download chunked result
   */
  async downloadChunkedResult(filename) {
    const chunkedData = this.fullResolutionCanvas.chunkedData;
    const { width, height } = chunkedData;
    
    console.log(`📊 Downloading ${width}×${height} chunked result (${chunkedData.tiles.length} tiles)`);
    
    // For demo purposes, create a simple reconstruction
    // In production, you'd use server-side composition or WASM
    const reconstructedCanvas = document.createElement('canvas');
    reconstructedCanvas.width = Math.min(width, 8192); // Limit for demo
    reconstructedCanvas.height = Math.min(height, 8192);
    
    const ctx = reconstructedCanvas.getContext('2d');
    
    // Reconstruct from tiles
    chunkedData.tiles.forEach(tile => {
      if (tile.x < reconstructedCanvas.width && tile.y < reconstructedCanvas.height) {
        const copyWidth = Math.min(tile.width, reconstructedCanvas.width - tile.x);
        const copyHeight = Math.min(tile.height, reconstructedCanvas.height - tile.y);
        
        if (copyWidth > 0 && copyHeight > 0) {
          ctx.drawImage(tile.canvas, 0, 0, copyWidth, copyHeight, tile.x, tile.y, copyWidth, copyHeight);
        }
      }
    });
    
    this.downloadCanvas(reconstructedCanvas, filename || `upscaled-${width}x${height}-partial.png`);
  }

  /**
   * Download canvas as file
   */
  downloadCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `upscaled-${canvas.width}x${canvas.height}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  /**
   * Create canvas from image data
   */
  createCanvasFromImageData(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Get processing statistics
   */
  getStats() {
    if (!this.fullResolutionCanvas) return null;
    
    const stats = {
      dimensions: `${this.fullResolutionCanvas.width}×${this.fullResolutionCanvas.height}`,
      megapixels: (this.fullResolutionCanvas.width * this.fullResolutionCanvas.height / 1000000).toFixed(1),
      isChunked: !!this.fullResolutionCanvas.chunkedData,
      memoryUsage: this.estimateMemoryUsage()
    };
    
    if (this.fullResolutionCanvas.chunkedData) {
      stats.tiles = this.fullResolutionCanvas.chunkedData.tiles.length;
      stats.exceedsLimits = this.fullResolutionCanvas.chunkedData.exceedsLimits;
    }
    
    return stats;
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    if (!this.fullResolutionCanvas) return '0MB';
    
    const pixels = this.fullResolutionCanvas.width * this.fullResolutionCanvas.height;
    const bytes = pixels * 4; // RGBA
    const mb = bytes / (1024 * 1024);
    
    return `${mb.toFixed(1)}MB`;
  }
} 