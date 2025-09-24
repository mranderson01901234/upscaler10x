/**
 * Enhanced Sidebar Integration Script
 * Extends existing functionality while maintaining full backward compatibility
 * Surgical update approach - preserves all existing element IDs and methods
 */

class EnhancedSidebarIntegration {
    constructor() {
        this.isInitialized = false;
        this.newElements = {};
        this.advancedSettings = {
            faceEnhancement: false,
            artifactRemoval: false,
            colorCorrection: false,
            hdrEnhancement: false,
            enhancementType: 'Super Resolution',
            backgroundProcessing: 'Keep Original'
        };
        
        this.initialize();
    }
    
    initialize() {
        if (this.isInitialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEnhancements());
        } else {
            this.setupEnhancements();
        }
        
        this.isInitialized = true;
    }
    
    setupEnhancements() {
        this.setupCurrentImageSection();
        this.setupAdvancedToggles();
        this.setupEnhancedDownloadLocation();
        this.setupNewSettingsHandlers();
        this.extendExistingMethods();
        
        console.log('✅ Enhanced Sidebar Integration initialized');
    }
    
    /**
     * Setup Current Image section with file information display
     */
    setupCurrentImageSection() {
        const currentFileName = document.getElementById('current-file-name');
        const currentFileDetails = document.getElementById('current-file-details');
        
        if (currentFileName && currentFileDetails) {
            this.newElements.currentFileName = currentFileName;
            this.newElements.currentFileDetails = currentFileDetails;
            
            // Hook into existing file handling
            this.hookIntoFileHandling();
        }
    }
    
    /**
     * Hook into existing file handling to update current image display
     */
    hookIntoFileHandling() {
        // Monitor file input changes
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.updateCurrentImageDisplay(e.target.files[0]);
                }
            });
        }
        
        // Monitor original image updates in presentation manager
        if (window.ImagePresentationManager) {
            const originalDisplayImage = this.displayOriginalImage;
            window.ImagePresentationManager.prototype.displayOriginalImage = function(file) {
                // Call original method
                const result = originalDisplayImage.call(this, file);
                
                // Update our enhanced display
                if (window.enhancedSidebar) {
                    window.enhancedSidebar.updateCurrentImageDisplay(file);
                }
                
                return result;
            };
        }
    }
    
    /**
     * Update current image display with file information
     */
    updateCurrentImageDisplay(file) {
        if (!file) return;
        
        const fileName = this.newElements.currentFileName;
        const fileDetails = this.newElements.currentFileDetails;
        
        if (fileName) {
            fileName.textContent = file.name;
        }
        
        if (fileDetails) {
            // Calculate file details
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            const format = file.type.split('/')[1]?.toUpperCase() || 'Unknown';
            
            // Get dimensions if available (will be updated when image loads)
            this.getImageDimensions(file).then(dimensions => {
                if (dimensions) {
                    const megapixels = ((dimensions.width * dimensions.height) / 1000000).toFixed(1);
                    fileDetails.textContent = `${dimensions.width}×${dimensions.height} • ${sizeInMB}MB • ${format} • ${megapixels}MP`;
                } else {
                    fileDetails.textContent = `${sizeInMB}MB • ${format}`;
                }
            });
        }
    }
    
    /**
     * Get image dimensions from file
     */
    getImageDimensions(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(file);
        });
    }
    
    /**
     * Setup advanced toggle switches
     */
    setupAdvancedToggles() {
        const toggles = [
            { id: 'face-enhancement-toggle', setting: 'faceEnhancement' },
            { id: 'artifact-removal-toggle', setting: 'artifactRemoval' },
            { id: 'color-correction-toggle', setting: 'colorCorrection' },
            { id: 'hdr-enhancement-toggle', setting: 'hdrEnhancement' }
        ];
        
        toggles.forEach(({ id, setting }) => {
            const element = document.getElementById(id) || document.getElementById(`new-${id}`);
            if (element) {
                element.addEventListener('click', () => {
                    element.classList.toggle('active');
                    this.advancedSettings[setting] = element.classList.contains('active');
                    this.onAdvancedSettingChange(setting, this.advancedSettings[setting]);
                });
                
                this.newElements[setting] = element;
            }
        });
    }
    
    /**
     * Setup enhanced download location with visual display
     */
    setupEnhancedDownloadLocation() {
        const browseButton = document.getElementById('new-browse-location') || document.getElementById('browse-location');
        const hiddenInput = document.getElementById('new-download-location') || document.getElementById('download-location');
        const displayMain = document.getElementById('new-download-display-main');
        const displaySub = document.getElementById('new-download-display-sub');
        
        if (browseButton && hiddenInput) {
            browseButton.addEventListener('click', () => {
                this.handleDownloadLocationBrowse(hiddenInput, displayMain, displaySub);
            });
            
            this.newElements.downloadLocation = {
                input: hiddenInput,
                browse: browseButton,
                displayMain,
                displaySub
            };
        }
    }
    
    /**
     * Handle download location browse with enhanced display
     */
    handleDownloadLocationBrowse(input, displayMain, displaySub) {
        // In a real implementation, this would open a native folder dialog
        // For now, we'll simulate the selection
        const newPath = prompt('Enter download location:', input.value);
        
        if (newPath && newPath !== input.value) {
            input.value = newPath;
            
            if (displayMain && displaySub) {
                const pathParts = newPath.split('/');
                const folderName = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
                
                displayMain.textContent = folderName;
                displaySub.textContent = `~/${newPath}`;
            }
            
            // Trigger change event for compatibility
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    /**
     * Setup handlers for new settings
     */
    setupNewSettingsHandlers() {
        // Enhancement Type
        const enhancementType = document.getElementById('new-enhancement-type') || document.getElementById('enhancement-type');
        if (enhancementType) {
            enhancementType.addEventListener('change', (e) => {
                this.advancedSettings.enhancementType = e.target.value;
                this.onAdvancedSettingChange('enhancementType', e.target.value);
            });
            this.newElements.enhancementType = enhancementType;
        }
        
        // Background Processing
        const backgroundProcessing = document.getElementById('new-background-processing') || document.getElementById('background-processing');
        if (backgroundProcessing) {
            backgroundProcessing.addEventListener('change', (e) => {
                this.advancedSettings.backgroundProcessing = e.target.value;
                this.onAdvancedSettingChange('backgroundProcessing', e.target.value);
            });
            this.newElements.backgroundProcessing = backgroundProcessing;
        }
    }
    
    /**
     * Extend existing methods to include new settings
     */
    extendExistingMethods() {
        // Extend getCurrentSettings if it exists on window.app
        if (window.app && typeof window.app.getCurrentSettings === 'function') {
            const originalGetCurrentSettings = window.app.getCurrentSettings;
            
            window.app.getCurrentSettings = () => {
                const originalSettings = originalGetCurrentSettings.call(window.app);
                
                // Add enhanced settings
                return {
                    ...originalSettings,
                    ...this.advancedSettings,
                    // Ensure backward compatibility
                    enhancementType: this.getEnhancementType(),
                    backgroundProcessing: this.getBackgroundProcessing(),
                    advancedOptions: {
                        faceEnhancement: this.advancedSettings.faceEnhancement,
                        artifactRemoval: this.advancedSettings.artifactRemoval,
                        colorCorrection: this.advancedSettings.colorCorrection,
                        hdrEnhancement: this.advancedSettings.hdrEnhancement
                    }
                };
            };
        }
        
        // Extend ImagePresentationManager if available
        if (window.ImagePresentationManager && window.ImagePresentationManager.prototype) {
            this.extendImagePresentationManager();
        }
    }
    
    /**
     * Extend ImagePresentationManager with enhanced functionality
     */
    extendImagePresentationManager() {
        const prototype = window.ImagePresentationManager.prototype;
        
        // Store original methods
        const originalHandleFile = prototype.handleFile;
        const originalUpdateProcessingButton = prototype.updateProcessingButton;
        
        // Enhanced handleFile
        if (originalHandleFile) {
            prototype.handleFile = function(file) {
                // Call original method
                const result = originalHandleFile.call(this, file);
                
                // Update enhanced current image display
                if (window.enhancedSidebar) {
                    window.enhancedSidebar.updateCurrentImageDisplay(file);
                }
                
                return result;
            };
        }
        
        // Enhanced updateProcessingButton
        if (originalUpdateProcessingButton) {
            prototype.updateProcessingButton = function(enabled) {
                // Call original method
                originalUpdateProcessingButton.call(this, enabled);
                
                // Update new action button if it exists
                const newActionButton = document.getElementById('new-start-processing');
                if (newActionButton) {
                    newActionButton.disabled = !enabled;
                    if (enabled) {
                        newActionButton.textContent = 'Start AI Processing';
                    } else {
                        newActionButton.textContent = 'Upload Image First';
                    }
                }
            };
        }
    }
    
    /**
     * Get enhancement type setting
     */
    getEnhancementType() {
        const element = this.newElements.enhancementType;
        return element ? element.value : this.advancedSettings.enhancementType;
    }
    
    /**
     * Get background processing setting
     */
    getBackgroundProcessing() {
        const element = this.newElements.backgroundProcessing;
        return element ? element.value : this.advancedSettings.backgroundProcessing;
    }
    
    /**
     * Handle advanced setting changes
     */
    onAdvancedSettingChange(setting, value) {
        console.log(`Enhanced setting changed: ${setting} = ${value}`);
        
        // Update estimated output if applicable
        this.updateEstimatedOutput();
        
        // Trigger custom event for other components
        document.dispatchEvent(new CustomEvent('enhancedSettingChange', {
            detail: { setting, value, allSettings: this.advancedSettings }
        }));
    }
    
    /**
     * Update estimated output display
     */
    updateEstimatedOutput() {
        const estimatedOutput = document.getElementById('new-estimated-output');
        if (estimatedOutput) {
            // Calculate estimated file size based on settings
            let multiplier = 1;
            
            // Increase estimate based on advanced options
            if (this.advancedSettings.faceEnhancement) multiplier += 0.2;
            if (this.advancedSettings.artifactRemoval) multiplier += 0.1;
            if (this.advancedSettings.colorCorrection) multiplier += 0.1;
            if (this.advancedSettings.hdrEnhancement) multiplier += 0.3;
            
            // Get scale factor
            const scaleFactorElement = document.getElementById('scale-factor') || document.getElementById('new-scale-factor');
            const scaleFactor = scaleFactorElement ? parseInt(scaleFactorElement.value) : 8;
            
            // Estimate based on scale factor and enhancements
            const baseSize = 2; // MB base estimate
            const estimatedSize = (baseSize * scaleFactor * multiplier).toFixed(1);
            
            estimatedOutput.textContent = `${estimatedSize} MB`;
        }
    }
    
    /**
     * Get all current settings (enhanced version)
     */
    getAllSettings() {
        // Get original settings
        const originalSettings = window.app && window.app.getCurrentSettings ? 
            window.app.getCurrentSettings() : {};
        
        // Return enhanced settings
        return {
            ...originalSettings,
            ...this.advancedSettings,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Reset all enhanced settings to defaults
     */
    resetEnhancedSettings() {
        this.advancedSettings = {
            faceEnhancement: false,
            artifactRemoval: false,
            colorCorrection: false,
            hdrEnhancement: false,
            enhancementType: 'Super Resolution',
            backgroundProcessing: 'Keep Original'
        };
        
        // Update UI elements
        Object.entries(this.newElements).forEach(([key, element]) => {
            if (element && element.classList && element.classList.contains('toggle-switch')) {
                element.classList.remove('active');
            } else if (element && element.tagName === 'SELECT') {
                if (key === 'enhancementType') element.value = 'Super Resolution';
                if (key === 'backgroundProcessing') element.value = 'Keep Original';
            }
        });
        
        this.updateEstimatedOutput();
    }
}

// Initialize enhanced sidebar integration
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedSidebar = new EnhancedSidebarIntegration();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedSidebarIntegration;
} 