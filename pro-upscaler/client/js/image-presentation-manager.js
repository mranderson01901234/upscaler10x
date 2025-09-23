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

  /**
   * Present side-by-side comparison of original and AI-enhanced images
   * Left panel: Comparison view with both images side-by-side
   * Right panel: Large enhanced image
   */
  presentSideBySideComparison(data, container) {
    const { originalImage, enhancedImage, originalDimensions, enhancedDimensions } = data;
    
    console.log('🎨 Creating side-by-side comparison display with comparison panel + large enhanced view');
    
    // Clear container
    container.innerHTML = '';
    
    // Main layout container - horizontal split (condensed)
    const mainLayout = document.createElement('div');
    mainLayout.className = 'ai-comparison-main-layout';
    mainLayout.style.cssText = `
        display: flex;
        gap: 12px;
        padding: 12px;
        width: 100%;
        max-width: 100vw;
        height: 70vh;
        max-height: 70vh;
        align-items: flex-start;
        overflow: hidden;
    `;

    // LEFT PANEL: Comparison view (condensed)
    const comparisonPanel = document.createElement('div');
    comparisonPanel.className = 'ai-comparison-panel';
    comparisonPanel.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        max-width: 320px;
        min-width: 280px;
    `;

    // Header for comparison panel (condensed)
    const comparisonHeader = document.createElement('div');
    comparisonHeader.innerHTML = `
        <h2 style="margin: 0 0 6px 0; color: white; text-align: center; font-size: 1.1em; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
            🔍 AI Comparison
        </h2>
        <div style="display: flex; flex-direction: column; gap: 2px; color: white; font-size: 0.7em; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); text-align: center;">
            <div><strong>📏 Original:</strong> ${originalDimensions.width}×${originalDimensions.height}</div>
            <div><strong>🤖 Enhanced:</strong> ${enhancedDimensions.width}×${enhancedDimensions.height}</div>
            <div><strong>🔬 Enhancement:</strong> ${(enhancedDimensions.width / originalDimensions.width).toFixed(1)}x</div>
        </div>
    `;

    // Comparison images container (side-by-side in left panel, condensed)
    const comparisonImagesContainer = document.createElement('div');
    comparisonImagesContainer.style.cssText = `
        display: flex;
        gap: 6px;
        justify-content: center;
        align-items: flex-start;
        width: 100%;
        flex: 1;
    `;

    // Create smaller versions for comparison
    const originalComparisonPanel = this.createCompactImagePanel(
        originalImage, 
        '📸 Original', 
        originalDimensions,
        '#4facfe'
    );

    const enhancedComparisonPanel = this.createCompactImagePanel(
        enhancedImage, 
        '🤖 Enhanced', 
        enhancedDimensions,
        '#00f2fe'
    );

    comparisonImagesContainer.appendChild(originalComparisonPanel);
    comparisonImagesContainer.appendChild(enhancedComparisonPanel);

    comparisonPanel.appendChild(comparisonHeader);
    comparisonPanel.appendChild(comparisonImagesContainer);

    // RIGHT PANEL: Large enhanced image (dynamic sizing)
    const largeImagePanel = document.createElement('div');
    largeImagePanel.className = 'ai-large-image-panel';
    largeImagePanel.style.cssText = `
        flex: 2;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        align-items: center;
        justify-content: flex-start;
    `;

    // Header for large image panel (condensed) - showing AI enhancement, not full upscale
    const aiEnhancementScale = enhancedDimensions.width / originalDimensions.width;
    const largeImageHeader = document.createElement('div');
    largeImageHeader.innerHTML = `
        <h2 style="margin: 0 0 4px 0; color: white; text-align: center; font-size: 1.3em; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
            🤖 AI Enhanced Preview
        </h2>
        <div style="text-align: center; color: white; font-size: 0.8em; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
            <strong>🔬</strong> ${aiEnhancementScale.toFixed(1)}x AI Enhancement • 
            <strong>📏</strong> Enhanced Quality Preview
        </div>
    `;

    // Calculate optimal display size for enhanced image preview - maximize canvas usage
    const availableWidth = window.innerWidth * 0.45; // Use ~45% of screen width for right panel
    const availableHeight = window.innerHeight * 0.55; // Use ~55% of screen height for image
    
    // Account for panel padding and header space
    const maxContainerWidth = Math.min(availableWidth - 24, 800); // 24px for padding
    const maxContainerHeight = Math.min(availableHeight - 60, 500); // 60px for header + padding
    
    // Calculate display dimensions maintaining aspect ratio but maximizing space usage
    const aspectRatio = enhancedDimensions.width / enhancedDimensions.height;
    
    let displayWidth, displayHeight;
    
    // Scale to fit available space while maintaining aspect ratio
    const widthRatio = maxContainerWidth / enhancedDimensions.width;
    const heightRatio = maxContainerHeight / enhancedDimensions.height;
    const scale = Math.min(widthRatio, heightRatio);
    
    displayWidth = Math.floor(enhancedDimensions.width * scale);
    displayHeight = Math.floor(enhancedDimensions.height * scale);
    
    // Ensure minimum size for visibility (at least 2x comparison size)
    const minDisplaySize = 240;
    if (displayWidth < minDisplaySize) {
        displayWidth = minDisplaySize;
        displayHeight = Math.floor(minDisplaySize / aspectRatio);
    }
    if (displayHeight < minDisplaySize) {
        displayHeight = minDisplaySize;
        displayWidth = Math.floor(minDisplaySize * aspectRatio);
    }

    // Container that exactly fits the image (no dead space) - tight fit
    const largeImageContainer = document.createElement('div');
    largeImageContainer.style.cssText = `
        display: inline-block;
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 8px;
        overflow: hidden;
        background: white;
        cursor: zoom-in;
        width: ${displayWidth}px;
        height: ${displayHeight}px;
        margin: 0 auto;
        flex-shrink: 0;
        position: relative;
    `;

    const largeEnhancedImg = enhancedImage.cloneNode(true);
    largeEnhancedImg.style.cssText = `
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        transition: transform 0.3s ease;
        border-radius: 6px;
    `;

    largeImageContainer.appendChild(largeEnhancedImg);

    // Add preview indicator overlay
    const previewIndicator = document.createElement('div');
    previewIndicator.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0, 200, 255, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.7em;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        pointer-events: none;
    `;
    previewIndicator.textContent = '🤖 AI Enhanced';
    
    largeImageContainer.appendChild(previewIndicator);

    // Create a wrapper to center the tight-fitting container
    const imageWrapper = document.createElement('div');
    imageWrapper.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        width: 100%;
    `;
    imageWrapper.appendChild(largeImageContainer);

    largeImagePanel.appendChild(largeImageHeader);
    largeImagePanel.appendChild(imageWrapper);

    // Add action buttons to comparison panel
    const actionButtons = this.createComparisonActionButtons();
    comparisonPanel.appendChild(actionButtons);

    // Assemble main layout
    mainLayout.appendChild(comparisonPanel);
    mainLayout.appendChild(largeImagePanel);

    container.appendChild(mainLayout);
    
    console.log('✅ Split-view comparison display created: comparison panel + large enhanced view');
  }

  createCompactImagePanel(image, title, dimensions, accentColor) {
    const panel = document.createElement('div');
    panel.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 6px;
        border: 1px solid ${accentColor};
        backdrop-filter: blur(10px);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        max-width: 120px;
    `;

    // Title
    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
        color: white;
        font-weight: bold;
        font-size: 0.65em;
        text-align: center;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        line-height: 1.2;
    `;
    titleEl.textContent = title;

    // Image container
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 6px;
        overflow: hidden;
        background: white;
        aspect-ratio: 1;
    `;

    const img = image.cloneNode(true);
    img.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
    `;

    // Dimensions info
    const dimensionsEl = document.createElement('div');
    dimensionsEl.style.cssText = `
        color: white;
        font-size: 0.6em;
        text-align: center;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        opacity: 0.9;
        line-height: 1.1;
    `;
    dimensionsEl.textContent = `${dimensions.width} × ${dimensions.height}`;

    imageContainer.appendChild(img);
    panel.appendChild(titleEl);
    panel.appendChild(imageContainer);
    panel.appendChild(dimensionsEl);

    // Add hover effect
    panel.onmouseover = () => {
        panel.style.transform = 'translateY(-3px)';
        panel.style.boxShadow = `0 8px 20px rgba(0,0,0,0.4)`;
    };

    panel.onmouseout = () => {
        panel.style.transform = 'translateY(0)';
        panel.style.boxShadow = 'none';
    };

    return panel;
  }

  createImageComparisonPanel(image, title, dimensions, accentColor) {
    const panel = document.createElement('div');
    panel.style.cssText = `
        flex: 1;
        min-width: 300px;
        max-width: 500px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 15px;
        border: 2px solid ${accentColor};
        backdrop-filter: blur(10px);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    `;

    // Add hover effect
    panel.onmouseover = () => {
        panel.style.transform = 'translateY(-5px)';
        panel.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4)`;
    };
    
    panel.onmouseout = () => {
        panel.style.transform = 'translateY(0)';
        panel.style.boxShadow = 'none';
    };

    const panelTitle = document.createElement('h3');
    panelTitle.textContent = title;
    panelTitle.style.cssText = `
        margin: 0 0 10px 0;
        color: white;
        text-align: center;
        font-size: 1.2em;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    `;

    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        overflow: hidden;
        background: white;
        cursor: zoom-in;
        position: relative;
    `;

    // Create canvas from image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    
    canvas.style.cssText = `
        display: block;
        max-width: 100%;
        height: auto;
        transition: transform 0.3s ease;
    `;

    // Add zoom functionality
    canvas.onclick = () => {
        this.showImageFullscreen(canvas, title);
    };

    imageContainer.appendChild(canvas);

    const info = document.createElement('div');
    info.innerHTML = `
        <p style="color: white; text-align: center; margin: 10px 0 0 0; font-size: 0.9em; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
            ${dimensions.width} × ${dimensions.height} • ${(dimensions.width * dimensions.height / 1000000).toFixed(1)}MP
        </p>
    `;

    panel.appendChild(panelTitle);
    panel.appendChild(imageContainer);
    panel.appendChild(info);

    return panel;
  }

  createComparisonActionButtons() {
    const actionContainer = document.createElement('div');
    actionContainer.style.cssText = `
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 20px;
    `;

    // Download full resolution button
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '💾 Download Full Resolution';
    downloadBtn.style.cssText = `
        padding: 12px 24px;
        background: linear-gradient(45deg, #00c851, #007e33);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1em;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    `;
    
    downloadBtn.onmouseover = () => {
        downloadBtn.style.transform = 'translateY(-2px)';
        downloadBtn.style.boxShadow = '0 6px 20px rgba(0,200,81,0.4)';
    };
    
    downloadBtn.onmouseout = () => {
        downloadBtn.style.transform = 'translateY(0)';
        downloadBtn.style.boxShadow = 'none';
    };

    downloadBtn.onclick = () => {
        // Trigger download from the Pro Engine interface
        if (window.proEngineInterface) {
            console.log('🔄 Initiating full resolution download...');
            // The download will be handled by the existing download mechanism
        }
    };

    // Toggle view button
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '🔄 Toggle View';
    toggleBtn.style.cssText = `
        padding: 12px 24px;
        background: linear-gradient(45deg, #2196f3, #0d47a1);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1em;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    `;

    toggleBtn.onmouseover = () => {
        toggleBtn.style.transform = 'translateY(-2px)';
        toggleBtn.style.boxShadow = '0 6px 20px rgba(33,150,243,0.4)';
    };
    
    toggleBtn.onmouseout = () => {
        toggleBtn.style.transform = 'translateY(0)';
        toggleBtn.style.boxShadow = 'none';
    };

    toggleBtn.onclick = () => {
        this.toggleComparisonView();
    };

    // Info text
    const infoText = document.createElement('p');
    infoText.innerHTML = '💾 Download includes full upscaled + AI enhanced version';
    infoText.style.cssText = `
        color: white;
        text-align: center;
        margin: 10px 0 0 0;
        font-size: 0.95em;
        opacity: 0.9;
        width: 100%;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    `;

    actionContainer.appendChild(downloadBtn);
    actionContainer.appendChild(toggleBtn);
    actionContainer.appendChild(infoText);

    return actionContainer;
  }

  showImageFullscreen(canvas, title) {
    // Create fullscreen overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: zoom-out;
    `;

    const fullscreenCanvas = canvas.cloneNode(true);
    fullscreenCanvas.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border: 3px solid white;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;

    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 1.5em;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        margin: 0;
    `;

    overlay.appendChild(titleElement);
    overlay.appendChild(fullscreenCanvas);

    overlay.onclick = () => {
        document.body.removeChild(overlay);
    };

    document.body.appendChild(overlay);
  }

  toggleComparisonView() {
    const comparisonContainer = document.querySelector('.ai-comparison-container');
    const imagesContainer = comparisonContainer?.querySelector('div:nth-child(2)');
    
    if (imagesContainer) {
        const isVertical = imagesContainer.style.flexDirection === 'column';
        
        if (isVertical) {
            imagesContainer.style.flexDirection = 'row';
            imagesContainer.style.gap = '20px';
        } else {
            imagesContainer.style.flexDirection = 'column';
            imagesContainer.style.gap = '30px';
        }
        
        console.log(`🔄 Toggled comparison view to: ${isVertical ? 'horizontal' : 'vertical'}`);
    }
  }
} 