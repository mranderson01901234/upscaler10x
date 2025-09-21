/**
 * ultra-fast-progressive-upscaler.js
 * Complete implementation of the sub-5-second upscaling system
 */

export class UltraFastProgressiveUpscaler {
  constructor() {
    this.scaleFactor = 4;
    this.maxCanvasDimension = 32767;
    this.useEnhancedMode = false;
    this.enhancedUpscaler = null;
  }

  /**
   * Main upscaling method
   */
  async enhance(imageData, progressCallback = null) {
    const startTime = performance.now();
    
    if (progressCallback) progressCallback(0, 'Starting ultra-fast processing...');
    
    const targetWidth = imageData.width * this.scaleFactor;
    const targetHeight = imageData.height * this.scaleFactor;
    
    console.log(`⚡ Ultra-fast upscaling: ${imageData.width}×${imageData.height} → ${targetWidth}×${targetHeight}`);
    
    // Check canvas limits
    if (targetWidth > this.maxCanvasDimension || targetHeight > this.maxCanvasDimension) {
      console.log(`⚠️ Output size ${targetWidth}×${targetHeight} exceeds canvas limits - Using chunked processing`);
      
      if (this.enhancedUpscaler && this.enhancedUpscaler.isInitialized) {
        return await this.enhancedUpscaler.enhance(imageData, progressCallback);
      } else {
        throw new Error(`Canvas size limit exceeded: ${targetWidth}×${targetHeight} > ${this.maxCanvasDimension}px`);
      }
    }
    
    if (progressCallback) progressCallback(20, `Upscaling to ${targetWidth}×${targetHeight}...`);
    
    // Use progressive upscaling
    const upscaledImageData = this.upscaleImageData(imageData, targetWidth, targetHeight);
    
    const processingTime = performance.now() - startTime;
    console.log(`🚀 Ultra-fast processing complete: ${processingTime.toFixed(2)}ms`);
    
    if (progressCallback) progressCallback(100, `Complete! Processed in ${processingTime.toFixed(0)}ms`);
    
    return {
      imageData: upscaledImageData,
      width: targetWidth,
      height: targetHeight,
      processingTime
    };
  }

  /**
   * Progressive 2x upscaling implementation
   */
  upscaleImageData(imageData, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Create source canvas
    const srcCanvas = document.createElement('canvas');
    const srcCtx = srcCanvas.getContext('2d');
    srcCanvas.width = imageData.width;
    srcCanvas.height = imageData.height;
    srcCtx.putImageData(imageData, 0, 0);

    // Configure high-quality upscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Use progressive upscaling for better quality on large scale factors
    const scaleX = targetWidth / imageData.width;
    const scaleY = targetHeight / imageData.height;

    if (scaleX > 2 || scaleY > 2) {
      // Multi-stage upscaling for better quality
      this.progressiveUpscale(srcCanvas, canvas, imageData.width, imageData.height, targetWidth, targetHeight);
    } else {
      // Direct upscaling for smaller scale factors
      ctx.drawImage(srcCanvas, 0, 0, imageData.width, imageData.height, 0, 0, targetWidth, targetHeight);
    }

    return ctx.getImageData(0, 0, targetWidth, targetHeight);
  }

  /**
   * Progressive upscaling in 2x stages - THE KEY TO SPEED
   */
  progressiveUpscale(srcCanvas, destCanvas, srcWidth, srcHeight, targetWidth, targetHeight) {
    const destCtx = destCanvas.getContext('2d');
    
    // Calculate intermediate steps
    const scaleX = targetWidth / srcWidth;
    const scaleY = targetHeight / srcHeight;
    const maxScale = Math.max(scaleX, scaleY);
    
    if (maxScale <= 2) {
      // Direct upscaling
      destCtx.drawImage(srcCanvas, 0, 0, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);
      return;
    }

    // Multi-stage upscaling - ITERATIVE 2X PROCESSING
    let currentCanvas = srcCanvas;
    let currentWidth = srcWidth;
    let currentHeight = srcHeight;
    let step = 0;

    while (currentWidth < targetWidth || currentHeight < targetHeight) {
      step++;
      console.log(`📊 Progressive step ${step}: ${currentWidth}×${currentHeight} → ...`);
      
      // Calculate next stage (2x max per stage)
      const nextWidth = Math.min(currentWidth * 2, targetWidth);
      const nextHeight = Math.min(currentHeight * 2, targetHeight);

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = nextWidth;
      tempCanvas.height = nextHeight;

      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      tempCtx.drawImage(currentCanvas, 0, 0, currentWidth, currentHeight, 0, 0, nextWidth, nextHeight);

      console.log(`✅ Progressive step ${step}: ${currentWidth}×${currentHeight} → ${nextWidth}×${nextHeight}`);
      
      currentCanvas = tempCanvas;
      currentWidth = nextWidth;
      currentHeight = nextHeight;
    }

    // Final copy to destination
    destCtx.drawImage(currentCanvas, 0, 0);
    console.log(`🎯 Progressive upscaling complete: ${step} steps`);
  }

  /**
   * Set enhanced upscaler for large images
   */
  setEnhancedUpscaler(enhancedUpscaler) {
    this.enhancedUpscaler = enhancedUpscaler;
    this.useEnhancedMode = true;
  }

  /**
   * Set scale factor
   */
  setScaleFactor(factor) {
    this.scaleFactor = factor;
  }
} 