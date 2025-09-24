/**
 * ultra-fast-integration-system.js
 * Complete integration that fixes performance and provides optimal presentation
 */

import { PerformanceOptimizedUpscaler } from './performance-optimized-upscaler.js';
import { ImagePresentationManager } from './image-presentation-manager.js';

export class UltraFastIntegrationSystem {
  constructor() {
    this.upscaler = new PerformanceOptimizedUpscaler();
    this.presentationManager = new ImagePresentationManager();
    this.isProcessing = false;
  }

  /**
   * Process and present image with optimal performance
   */
  async processAndPresentImage(imageData, scaleFactor, containerElement, progressCallback = null) {
    if (this.isProcessing) {
      console.warn('⚠️ Processing already in progress');
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      console.log(`🚀 Starting ultra-fast processing: ${imageData.width}×${imageData.height} → ${scaleFactor}x`);

      // Process image with performance optimizations
      const result = await this.upscaler.processImage(imageData, scaleFactor, (progress, message) => {
        if (progressCallback) {
          progressCallback(progress, message);
        }
        this.updateProgressUI(progress, message);
      });

      const totalTime = performance.now() - startTime;
      console.log(`✅ Complete processing pipeline: ${totalTime.toFixed(2)}ms`);

      // Present result with optimal display system
      this.presentationManager.presentUpscaledImage(result, containerElement);

      // Update final status
      if (progressCallback) {
        progressCallback(100, `Complete! Total time: ${totalTime.toFixed(0)}ms`);
      }

      return result;

    } catch (error) {
      console.error('❌ Processing failed:', error);
      this.showError(error.message, containerElement);
      throw error;

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Update progress UI
   */
  updateProgressUI(progress, message) {
    // Update any progress indicators in the UI
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressTitle = document.getElementById('progress-title');
    const progressDescription = document.getElementById('progress-description');
    
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    
    if (progressText) {
      progressText.textContent = message;
    }
    
    // Update the main progress display elements
    if (progressPercentage) {
      progressPercentage.textContent = `${Math.round(progress)}%`;
    }
    
    if (progressTitle && progress < 100) {
      progressTitle.textContent = 'Processing...';
    } else if (progressTitle && progress >= 100) {
      progressTitle.textContent = 'Complete!';
    }
    
    if (progressDescription) {
      progressDescription.textContent = message || '';
    }
  }

  /**
   * Show error message
   */
  showError(message, container) {
    container.innerHTML = `
      <div style="
        padding: 20px;
        background: linear-gradient(135deg, #ff6b6b, #ee5a52);
        color: white;
        border-radius: 15px;
        text-align: center;
        font-family: 'Segoe UI', sans-serif;
      ">
        <h2 style="margin: 0 0 10px 0;">❌ Processing Failed</h2>
        <p style="margin: 0; opacity: 0.9;">${message}</p>
      </div>
    `;
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      upscalerReady: !!this.upscaler,
      presentationReady: !!this.presentationManager
    };
  }
} 