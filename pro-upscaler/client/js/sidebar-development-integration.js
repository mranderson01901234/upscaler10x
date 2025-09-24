/**
 * Sidebar Development Integration Script
 * Connects the new enterprise sidebar elements to the actual Pro Upscaler processing system
 */

class SidebarDevelopmentIntegration {
    constructor() {
        this.presentationManager = null;
        this.isInitialized = false;
        this.originalElements = new Map();
        
        this.initialize();
    }
    
    initialize() {
        if (this.isInitialized) return;
        
        // Wait for DOM and main app to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
        
        this.isInitialized = true;
    }
    
    setup() {
        // Get reference to the main presentation manager
        this.getPresentationManager();
        
        // Connect new sidebar elements to real functionality
        this.connectNewElements();
        
        // Setup file handling integration
        this.setupFileHandling();
        
        // Setup settings synchronization
        this.setupSettingsSync();
        
        console.log('🔗 Sidebar Development Integration initialized');
    }
    
    /**
     * Get reference to the presentation manager
     */
    getPresentationManager() {
        // Try multiple ways to get the presentation manager
        if (window.app && window.app.presentationManager) {
            this.presentationManager = window.app.presentationManager;
            console.log('✅ Found presentation manager via window.app');
        } else if (window.presentationManager) {
            this.presentationManager = window.presentationManager;
            console.log('✅ Found presentation manager via window');
        } else {
            // Create a new instance if needed
            if (typeof ImagePresentationManager !== 'undefined') {
                this.presentationManager = new ImagePresentationManager();
                console.log('✅ Created new presentation manager instance');
            } else {
                console.warn('⚠️ ImagePresentationManager not available');
            }
        }
    }
    
    /**
     * Connect new sidebar elements to real functionality
     */
    connectNewElements() {
        // Connect the new processing button
        const newProcessButton = document.getElementById('new-start-processing');
        if (newProcessButton && this.presentationManager) {
            newProcessButton.addEventListener('click', () => {
                this.handleNewProcessingClick();
            });
            console.log('🔗 Connected new processing button');
        }
        
        // Connect new toggle switches
        this.setupToggleFunctionality();
        
        // Connect new selects
        this.setupSelectFunctionality();
        
        // Connect browse button
        const newBrowseButton = document.getElementById('new-browse-location');
        if (newBrowseButton && this.presentationManager) {
            newBrowseButton.addEventListener('click', () => {
                this.handleBrowseLocation();
            });
        }
    }
    
    /**
     * Handle new processing button click
     */
    async handleNewProcessingClick() {
        console.log('🚀 New processing button clicked');
        
        if (!this.presentationManager) {
            console.error('❌ Presentation manager not available');
            this.logTestResult('❌ Processing failed - Presentation manager not available', 'fail');
            return;
        }
        
        // Sync settings from new sidebar to original elements
        this.syncNewToOriginal();
        
        // Call the real processing method
        try {
            await this.presentationManager.handleProcessing();
            this.logTestResult('✅ Processing started successfully', 'pass');
        } catch (error) {
            console.error('❌ Processing error:', error);
            this.logTestResult(`❌ Processing error: ${error.message}`, 'fail');
        }
    }
    
    /**
     * Setup toggle functionality for new switches
     */
    setupToggleFunctionality() {
        const toggles = document.querySelectorAll('#new-sidebar .toggle-switch');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const isActive = toggle.classList.contains('active');
                
                if (isActive) {
                    toggle.classList.remove('active');
                } else {
                    toggle.classList.add('active');
                }
                
                // Flash sync indicator
                this.flashSyncIndicator();
                
                // Log the change
                const toggleId = toggle.id;
                const newState = toggle.classList.contains('active');
                console.log(`🔄 Toggle ${toggleId}: ${newState}`);
                this.logTestResult(`🔄 Toggle ${toggleId}: ${newState ? 'ON' : 'OFF'}`, 'info');
            });
        });
    }
    
    /**
     * Setup select functionality
     */
    setupSelectFunctionality() {
        const selects = document.querySelectorAll('#new-sidebar .form-select');
        selects.forEach(select => {
            select.addEventListener('change', () => {
                console.log(`🔄 Select ${select.id}: ${select.value}`);
                this.logTestResult(`🔄 Select ${select.id}: ${select.value}`, 'info');
                
                // Sync to original if it exists
                this.syncSelectToOriginal(select);
                
                this.flashSyncIndicator();
            });
        });
    }
    
    /**
     * Sync new sidebar settings to original elements
     */
    syncNewToOriginal() {
        // Sync scale factor
        const newScaleFactor = document.getElementById('new-scale-factor');
        const originalScaleFactor = document.getElementById('scale-factor');
        if (newScaleFactor && originalScaleFactor) {
            originalScaleFactor.value = newScaleFactor.value;
            console.log(`🔄 Synced scale factor: ${newScaleFactor.value}`);
        }
        
        // Sync output format
        const newOutputFormat = document.getElementById('new-output-format');
        const originalOutputFormat = document.getElementById('output-format');
        if (newOutputFormat && originalOutputFormat) {
            // Map new format values to original
            let originalValue = newOutputFormat.value;
            if (newOutputFormat.value === 'jpeg' || newOutputFormat.value === 'png' || newOutputFormat.value === 'tiff') {
                originalValue = newOutputFormat.value;
            } else {
                originalValue = 'jpeg'; // Default fallback
            }
            originalOutputFormat.value = originalValue;
            console.log(`🔄 Synced output format: ${originalValue}`);
        }
        
        // Sync AI enhancement toggle
        const newAiToggle = document.getElementById('new-ai-enhancement-toggle');
        const originalAiToggle = document.getElementById('ai-enhancement-toggle');
        if (newAiToggle && originalAiToggle) {
            const isActive = newAiToggle.classList.contains('active');
            originalAiToggle.checked = isActive;
            console.log(`🔄 Synced AI enhancement: ${isActive}`);
        }
        
        // Sync download location
        const newDownloadLocation = document.getElementById('new-download-location');
        const originalDownloadLocation = document.getElementById('download-location');
        if (newDownloadLocation && originalDownloadLocation) {
            originalDownloadLocation.value = newDownloadLocation.value;
            console.log(`🔄 Synced download location: ${newDownloadLocation.value}`);
        }
    }
    
    /**
     * Sync individual select to original
     */
    syncSelectToOriginal(select) {
        const selectId = select.id.replace('new-', '');
        const originalSelect = document.getElementById(selectId);
        
        if (originalSelect) {
            originalSelect.value = select.value;
            originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    /**
     * Setup file handling integration
     */
    setupFileHandling() {
        // Monitor file input changes to update current image display
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.updateCurrentImageDisplay(e.target.files[0]);
                }
            });
        }
        
        // Also monitor drag/drop on upload area
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.updateCurrentImageDisplay(files[0]);
                }
            });
        }
    }
    
    /**
     * Update current image display in new sidebar
     */
    updateCurrentImageDisplay(file) {
        const fileName = document.getElementById('new-current-file-name');
        const fileDetails = document.getElementById('new-current-file-details');
        
        if (fileName) {
            fileName.textContent = file.name;
        }
        
        if (fileDetails) {
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            const format = file.type.split('/')[1]?.toUpperCase() || 'Unknown';
            
            // Get dimensions when image loads
            const img = new Image();
            img.onload = () => {
                const megapixels = ((img.width * img.height) / 1000000).toFixed(1);
                fileDetails.textContent = `${img.width}×${img.height} • ${sizeInMB}MB • ${format} • ${megapixels}MP`;
                
                // Enable the new processing button
                const newProcessButton = document.getElementById('new-start-processing');
                if (newProcessButton) {
                    newProcessButton.disabled = false;
                    newProcessButton.textContent = 'Start AI Processing';
                }
                
                this.logTestResult(`📷 Image loaded: ${file.name} (${img.width}×${img.height})`, 'pass');
            };
            img.onerror = () => {
                fileDetails.textContent = `${sizeInMB}MB • ${format}`;
            };
            img.src = URL.createObjectURL(file);
        }
    }
    
    /**
     * Handle browse location
     */
    handleBrowseLocation() {
        // Trigger the original browse button
        const originalBrowseButton = document.getElementById('browse-location');
        if (originalBrowseButton) {
            originalBrowseButton.click();
            
            // Monitor for location changes
            setTimeout(() => {
                const originalLocation = document.getElementById('download-location');
                const newLocation = document.getElementById('new-download-location');
                const displayMain = document.getElementById('new-download-display-main');
                const displaySub = document.getElementById('new-download-display-sub');
                
                if (originalLocation && newLocation) {
                    newLocation.value = originalLocation.value;
                    
                    if (displayMain && displaySub) {
                        const pathParts = originalLocation.value.split('/');
                        const folderName = pathParts[pathParts.length - 1] || 'ProUpscaler';
                        
                        displayMain.textContent = folderName;
                        displaySub.textContent = `~/${originalLocation.value}`;
                    }
                    
                    this.logTestResult(`📁 Download location updated: ${originalLocation.value}`, 'info');
                }
            }, 100);
        }
    }
    
    /**
     * Setup settings synchronization
     */
    setupSettingsSync() {
        // Extend the main app's getCurrentSettings method to include new settings
        if (window.app && typeof window.app.getCurrentSettings === 'function') {
            const originalGetCurrentSettings = window.app.getCurrentSettings.bind(window.app);
            
            window.app.getCurrentSettings = () => {
                const originalSettings = originalGetCurrentSettings();
                
                // Add enhanced settings from new sidebar
                const enhancementType = document.getElementById('new-enhancement-type')?.value || 'Super Resolution';
                const backgroundProcessing = document.getElementById('new-background-processing')?.value || 'Keep Original';
                
                // Get advanced options
                const faceEnhancement = document.getElementById('new-face-enhancement-toggle')?.classList.contains('active') || false;
                const artifactRemoval = document.getElementById('new-artifact-removal-toggle')?.classList.contains('active') || false;
                const colorCorrection = document.getElementById('new-color-correction-toggle')?.classList.contains('active') || false;
                const hdrEnhancement = document.getElementById('new-hdr-enhancement-toggle')?.classList.contains('active') || false;
                
                return {
                    ...originalSettings,
                    enhancementType,
                    backgroundProcessing,
                    advancedOptions: {
                        faceEnhancement,
                        artifactRemoval,
                        colorCorrection,
                        hdrEnhancement
                    }
                };
            };
            
            console.log('🔗 Extended getCurrentSettings method with new sidebar data');
        }
    }
    
    /**
     * Flash sync indicator
     */
    flashSyncIndicator() {
        const syncIndicator = document.getElementById('syncIndicator');
        if (syncIndicator) {
            syncIndicator.classList.add('active');
            setTimeout(() => {
                syncIndicator.classList.remove('active');
            }, 500);
        }
    }
    
    /**
     * Log test result
     */
    logTestResult(message, type = 'info') {
        const testResults = document.getElementById('testResults');
        if (testResults) {
            const resultDiv = document.createElement('div');
            resultDiv.className = `test-result ${type}`;
            resultDiv.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
            
            testResults.appendChild(resultDiv);
            testResults.scrollTop = testResults.scrollHeight;
        }
        
        // Also log to console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    /**
     * Get all enhanced settings
     */
    getEnhancedSettings() {
        if (window.app && typeof window.app.getCurrentSettings === 'function') {
            return window.app.getCurrentSettings();
        }
        
        // Fallback - read directly from elements
        return {
            scaleFactor: parseInt(document.getElementById('new-scale-factor')?.value || '8'),
            outputFormat: document.getElementById('new-output-format')?.value || 'jpeg',
            aiEnhancement: document.getElementById('new-ai-enhancement-toggle')?.classList.contains('active') || false,
            enhancementType: document.getElementById('new-enhancement-type')?.value || 'Super Resolution',
            backgroundProcessing: document.getElementById('new-background-processing')?.value || 'Keep Original',
            advancedOptions: {
                faceEnhancement: document.getElementById('new-face-enhancement-toggle')?.classList.contains('active') || false,
                artifactRemoval: document.getElementById('new-artifact-removal-toggle')?.classList.contains('active') || false,
                colorCorrection: document.getElementById('new-color-correction-toggle')?.classList.contains('active') || false,
                hdrEnhancement: document.getElementById('new-hdr-enhancement-toggle')?.classList.contains('active') || false
            }
        };
    }
}

// Enhanced test functions that work with real functionality
function testSettingsSync() {
    const integration = window.sidebarIntegration;
    if (!integration) {
        logResult('❌ Sidebar integration not available', 'fail');
        return;
    }
    
    integration.logTestResult('🧪 Testing settings synchronization...', 'info');
    
    // Test sync from new to original
    integration.syncNewToOriginal();
    
    // Test settings retrieval
    const settings = integration.getEnhancedSettings();
    integration.logTestResult(`✅ Settings retrieved: ${JSON.stringify(settings, null, 2)}`, 'pass');
}

function testProcessingFlow() {
    const integration = window.sidebarIntegration;
    if (!integration) {
        logResult('❌ Sidebar integration not available', 'fail');
        return;
    }
    
    integration.logTestResult('🧪 Testing processing flow...', 'info');
    
    if (integration.presentationManager) {
        integration.logTestResult('✅ Presentation manager available', 'pass');
        
        if (integration.presentationManager.originalImage) {
            integration.logTestResult('✅ Original image loaded and ready for processing', 'pass');
        } else {
            integration.logTestResult('⚠️ No image loaded - upload an image first', 'info');
        }
    } else {
        integration.logTestResult('❌ Presentation manager not available', 'fail');
    }
}

function testFormBinding() {
    const integration = window.sidebarIntegration;
    if (!integration) {
        logResult('❌ Sidebar integration not available', 'fail');
        return;
    }
    
    integration.logTestResult('🧪 Testing form element binding...', 'info');
    
    // Test all form elements
    const elements = [
        'new-scale-factor',
        'new-output-format',
        'new-enhancement-type',
        'new-background-processing',
        'new-ai-enhancement-toggle',
        'new-start-processing'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            integration.logTestResult(`✅ Element found: ${id}`, 'pass');
        } else {
            integration.logTestResult(`❌ Element missing: ${id}`, 'fail');
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarIntegration = new SidebarDevelopmentIntegration();
    
    // Also make integration available globally for testing
    window.testSidebarIntegration = window.sidebarIntegration;
    
    console.log('🔧 Sidebar Development Integration loaded and ready');
}); 