/**
 * image-presentation-manager.js
 * Optimal image display system for ultra-fast visual feedback
 */

export class ImagePresentationManager {
  constructor() {
    this.currentResult = null;
    this.previewSize = 1024;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
  }

  /**
   * Present upscaled image with optimal performance
   */
  presentUpscaledImage(result, containerElement) {
    this.currentResult = result;
    
    // Clear previous content
    containerElement.innerHTML = '';
    
    if (result.isVirtual) {
      this.presentVirtualResult(result, containerElement);
    } else {
      this.presentDirectResult(result, containerElement);
    }
    
    this.setupImageControls(containerElement);
  }

  /**
   * Present virtual result with smart preview
   */
  presentVirtualResult(result, container) {
    const { displayCanvas, dimensions, megapixels, processingTime } = result;
    
    // Create presentation container
    const presentationDiv = document.createElement('div');
    presentationDiv.className = 'image-presentation virtual-result';
    presentationDiv.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;

    // Result info header
    const infoHeader = document.createElement('div');
    infoHeader.className = 'result-info';
    infoHeader.style.cssText = `
      text-align: center;
      color: white;
      font-family: 'Segoe UI', sans-serif;
    `;
    infoHeader.innerHTML = `
      <h2 style="margin: 0 0 10px 0; font-size: 1.8em; background: linear-gradient(45deg, #FFD700, #FFA500); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        ⚡ Ultra-Fast Upscaling Complete!
      </h2>
      <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; font-size: 1.1em;">
        <span><strong>📏 Dimensions:</strong> ${dimensions.width}×${dimensions.height}</span>
        <span><strong>🔍 Resolution:</strong> ${megapixels}MP</span>
        <span><strong>⏱️ Time:</strong> ${processingTime.toFixed(0)}ms</span>
      </div>
    `;

    // Preview canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'preview-container';
    canvasContainer.style.cssText = `
      position: relative;
      border: 3px solid rgba(255, 215, 0, 0.8);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      background: white;
    `;

    // Add preview canvas
    displayCanvas.style.cssText = `
      display: block;
      max-width: 100%;
      height: auto;
      cursor: zoom-in;
    `;
    canvasContainer.appendChild(displayCanvas);

    // Preview indicator overlay
    const previewIndicator = document.createElement('div');
    previewIndicator.className = 'preview-indicator';
    previewIndicator.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 100, 255, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    previewIndicator.textContent = '🖼️ Smart Preview';
    canvasContainer.appendChild(previewIndicator);

    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    actionButtons.style.cssText = `
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
    `;

    const downloadBtn = this.createActionButton('💾 Download Full Resolution', 'download', () => {
      this.downloadFullResolution();
    });

    const viewDetailsBtn = this.createActionButton('📊 View Details', 'info', () => {
      this.showResultDetails();
    });

    const compareBtn = this.createActionButton('🔍 Compare Original', 'compare', () => {
      this.showComparison();
    });

    actionButtons.appendChild(downloadBtn);
    actionButtons.appendChild(viewDetailsBtn);
    actionButtons.appendChild(compareBtn);

    // Assemble presentation
    presentationDiv.appendChild(infoHeader);
    presentationDiv.appendChild(canvasContainer);
    presentationDiv.appendChild(actionButtons);

    container.appendChild(presentationDiv);
    
    console.log(`🖼️ Presented virtual result: ${dimensions.width}×${dimensions.height} with smart preview`);
  }

  /**
   * Present direct result
   */
  presentDirectResult(result, container) {
    const { displayCanvas, dimensions, megapixels, processingTime } = result;
    
    // Create presentation container
    const presentationDiv = document.createElement('div');
    presentationDiv.className = 'image-presentation direct-result';
    presentationDiv.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      padding: 20px;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;

    // Result info header
    const infoHeader = document.createElement('div');
    infoHeader.innerHTML = `
      <h2 style="margin: 0 0 10px 0; color: white; text-align: center; font-size: 1.8em;">
        ✅ Direct Processing Complete!
      </h2>
      <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; color: white; font-size: 1.1em;">
        <span><strong>📏 Dimensions:</strong> ${dimensions.width}×${dimensions.height}</span>
        <span><strong>🔍 Resolution:</strong> ${megapixels}MP</span>
        <span><strong>⏱️ Time:</strong> ${processingTime.toFixed(0)}ms</span>
      </div>
    `;

    // Canvas container with zoom functionality
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
      position: relative;
      border: 3px solid rgba(255, 255, 255, 0.8);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      background: white;
      cursor: zoom-in;
    `;

    displayCanvas.style.cssText = `
      display: block;
      max-width: 100%;
      height: auto;
      transition: transform 0.3s ease;
    `;
    canvasContainer.appendChild(displayCanvas);

    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.style.cssText = `
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
    `;

    const downloadBtn = this.createActionButton('💾 Download Result', 'download', () => {
      this.downloadDirectResult();
    });

    const zoomBtn = this.createActionButton('🔍 Zoom View', 'zoom', () => {
      this.toggleZoom(displayCanvas);
    });

    actionButtons.appendChild(downloadBtn);
    actionButtons.appendChild(zoomBtn);

    // Assemble presentation
    presentationDiv.appendChild(infoHeader);
    presentationDiv.appendChild(canvasContainer);
    presentationDiv.appendChild(actionButtons);

    container.appendChild(presentationDiv);
    
    console.log(`🖼️ Presented direct result: ${dimensions.width}×${dimensions.height}`);
  }

  /**
   * Create styled action button
   */
  createActionButton(text, type, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `action-btn ${type}-btn`;
    
    const baseStyle = `
      padding: 12px 24px;
      border: none;
      border-radius: 25px;
      font-weight: bold;
      font-size: 1em;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    
    switch (type) {
      case 'download':
        button.style.cssText = baseStyle + `
          background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
          color: white;
        `;
        break;
      case 'info':
        button.style.cssText = baseStyle + `
          background: linear-gradient(45deg, #A8E6CF, #7FDBFF);
          color: #333;
        `;
        break;
      case 'compare':
        button.style.cssText = baseStyle + `
          background: linear-gradient(45deg, #FFD93D, #FF6B6B);
          color: white;
        `;
        break;
      case 'zoom':
        button.style.cssText = baseStyle + `
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
        `;
        break;
    }
    
    button.addEventListener('mouseover', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    });
    
    button.addEventListener('click', onClick);
    
    return button;
  }

  /**
   * Setup image interaction controls
   */
  setupImageControls(container) {
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        this.downloadFullResolution();
      }
      if (e.key === 'z' && e.ctrlKey) {
        e.preventDefault();
        this.toggleZoom();
      }
    });
    
    // Add mouse wheel zoom
    container.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        this.handleZoom(e.deltaY < 0 ? 1.1 : 0.9);
      }
    });
  }

  /**
   * Download full resolution result
   */
  async downloadFullResolution() {
    if (!this.currentResult) return;
    
    // Import the upscaler class dynamically
    const { PerformanceOptimizedUpscaler } = await import('./performance-optimized-upscaler.js');
    const upscaler = new PerformanceOptimizedUpscaler();
    await upscaler.downloadFullResolution(this.currentResult);
  }

  /**
   * Download direct result
   */
  downloadDirectResult() {
    if (!this.currentResult || !this.currentResult.displayCanvas) return;
    
    this.downloadCanvas(this.currentResult.displayCanvas);
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
      console.log(`✅ Downloaded: ${filename || `upscaled-${canvas.width}x${canvas.height}.png`}`);
    }, 'image/png');
  }

  /**
   * Show result details modal
   */
  showResultDetails() {
    if (!this.currentResult) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 15px;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    `;
    
    const { dimensions, megapixels, processingTime, isVirtual } = this.currentResult;
    
    content.innerHTML = `
      <h2 style="margin-top: 0; color: #333;">📊 Processing Details</h2>
      <div style="line-height: 1.8; color: #666;">
        <p><strong>📏 Dimensions:</strong> ${dimensions.width} × ${dimensions.height} pixels</p>
        <p><strong>🔍 Resolution:</strong> ${megapixels} megapixels</p>
        <p><strong>⏱️ Processing Time:</strong> ${processingTime.toFixed(2)}ms</p>
        <p><strong>💾 Storage Type:</strong> ${isVirtual ? 'Virtual Canvas (Large Image)' : 'Direct Canvas'}</p>
        <p><strong>🖼️ Display:</strong> ${isVirtual ? 'Smart Preview (1024px)' : 'Full Resolution'}</p>
        <p><strong>📊 Memory Usage:</strong> ~${(dimensions.width * dimensions.height * 4 / 1024 / 1024).toFixed(1)}MB</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 20px;
      ">Close</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Show before/after comparison
   */
  showComparison() {
    console.log('🔍 Comparison view - feature coming soon!');
  }

  /**
   * Toggle zoom functionality
   */
  toggleZoom(canvas) {
    if (!canvas) return;
    
    this.zoomLevel = this.zoomLevel === 1 ? 2 : 1;
    canvas.style.transform = `scale(${this.zoomLevel})`;
    canvas.style.cursor = this.zoomLevel > 1 ? 'zoom-out' : 'zoom-in';
  }

  /**
   * Handle zoom with mouse wheel
   */
  handleZoom(factor) {
    this.zoomLevel *= factor;
    this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel));
    
    const canvas = document.querySelector('.image-presentation canvas');
    if (canvas) {
      canvas.style.transform = `scale(${this.zoomLevel})`;
    }
  }
} 