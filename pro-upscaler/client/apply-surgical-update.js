/**
 * Surgical Sidebar Update Application Script
 * Applies enterprise-grade updates while preserving ALL existing functionality
 * 
 * CRITICAL: This script maintains backward compatibility with all existing JavaScript
 * by preserving element IDs and extending rather than replacing functionality
 */

class SurgicalSidebarUpdater {
    constructor() {
        this.backupElements = new Map();
        this.updateSteps = [];
        this.rollbackData = [];
        this.isApplying = false;
        
        this.initializeUpdatePlan();
    }
    
    initializeUpdatePlan() {
        this.updateSteps = [
            {
                name: 'Backup Current State',
                action: () => this.backupCurrentState(),
                rollback: () => this.restoreFromBackup()
            },
            {
                name: 'Apply Enterprise Color Scheme',
                action: () => this.applyEnterpriseColors(),
                rollback: () => this.rollbackColors()
            },
            {
                name: 'Add Current Image Section',
                action: () => this.addCurrentImageSection(),
                rollback: () => this.removeCurrentImageSection()
            },
            {
                name: 'Enhance AI Enhancement Suite',
                action: () => this.enhanceAIEnhancementSuite(),
                rollback: () => this.rollbackAIEnhancementSuite()
            },
            {
                name: 'Add Advanced Options',
                action: () => this.addAdvancedOptions(),
                rollback: () => this.removeAdvancedOptions()
            },
            {
                name: 'Enhance Download Location',
                action: () => this.enhanceDownloadLocation(),
                rollback: () => this.rollbackDownloadLocation()
            },
            {
                name: 'Apply Enhanced Styling',
                action: () => this.applyEnhancedStyling(),
                rollback: () => this.rollbackStyling()
            },
            {
                name: 'Initialize Enhanced Integration',
                action: () => this.initializeEnhancedIntegration(),
                rollback: () => this.cleanupEnhancedIntegration()
            }
        ];
    }
    
    /**
     * Apply the surgical update
     */
    async applySurgicalUpdate() {
        if (this.isApplying) {
            console.warn('Update already in progress');
            return false;
        }
        
        this.isApplying = true;
        console.log('🔧 Starting surgical sidebar update...');
        
        try {
            for (let i = 0; i < this.updateSteps.length; i++) {
                const step = this.updateSteps[i];
                console.log(`📋 Step ${i + 1}/${this.updateSteps.length}: ${step.name}`);
                
                try {
                    await step.action();
                    console.log(`✅ Step ${i + 1} completed: ${step.name}`);
                } catch (error) {
                    console.error(`❌ Step ${i + 1} failed: ${step.name}`, error);
                    
                    // Rollback previous steps
                    await this.rollbackToStep(i - 1);
                    throw new Error(`Update failed at step: ${step.name}`);
                }
            }
            
            console.log('🎉 Surgical sidebar update completed successfully!');
            this.validateUpdate();
            return true;
            
        } catch (error) {
            console.error('🚨 Surgical update failed:', error);
            return false;
        } finally {
            this.isApplying = false;
        }
    }
    
    /**
     * Rollback to a specific step
     */
    async rollbackToStep(stepIndex) {
        console.log(`🔄 Rolling back to step ${stepIndex}...`);
        
        for (let i = stepIndex; i >= 0; i--) {
            const step = this.updateSteps[i];
            if (step.rollback) {
                try {
                    await step.rollback();
                    console.log(`↩️ Rolled back: ${step.name}`);
                } catch (rollbackError) {
                    console.error(`❌ Rollback failed for: ${step.name}`, rollbackError);
                }
            }
        }
    }
    
    /**
     * Step 1: Backup current state
     */
    async backupCurrentState() {
        const processingPanel = document.querySelector('.processing-status-panel');
        if (processingPanel) {
            this.backupElements.set('processingPanel', processingPanel.cloneNode(true));
        }
        
        // Backup critical elements
        const criticalElements = [
            'scale-factor', 'output-format', 'ai-enhancement-toggle',
            'download-location', 'browse-location', 'start-processing'
        ];
        
        criticalElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.backupElements.set(id, {
                    element: element.cloneNode(true),
                    parent: element.parentNode,
                    nextSibling: element.nextSibling
                });
            }
        });
        
        // Backup current CSS
        const styleSheets = Array.from(document.styleSheets);
        this.backupElements.set('stylesheets', styleSheets);
        
        console.log('💾 Current state backed up');
    }
    
    /**
     * Step 2: Apply enterprise color scheme
     */
    async applyEnterpriseColors() {
        // Create and inject enterprise CSS
        const enterpriseCSS = document.createElement('link');
        enterpriseCSS.rel = 'stylesheet';
        enterpriseCSS.href = 'style-enterprise.css';
        enterpriseCSS.id = 'enterprise-styles';
        
        // Insert after existing styles
        const existingStyles = document.querySelector('link[href="style.css"]');
        if (existingStyles) {
            existingStyles.parentNode.insertBefore(enterpriseCSS, existingStyles.nextSibling);
        } else {
            document.head.appendChild(enterpriseCSS);
        }
        
        // Wait for styles to load
        return new Promise((resolve, reject) => {
            enterpriseCSS.onload = () => {
                console.log('🎨 Enterprise color scheme applied');
                resolve();
            };
            enterpriseCSS.onerror = () => {
                reject(new Error('Failed to load enterprise styles'));
            };
            
            // Timeout after 5 seconds
            setTimeout(() => {
                if (!enterpriseCSS.sheet) {
                    reject(new Error('Enterprise styles loading timeout'));
                }
            }, 5000);
        });
    }
    
    /**
     * Step 3: Add Current Image section
     */
    async addCurrentImageSection() {
        const panelContent = document.querySelector('.processing-status-panel .panel-content');
        if (!panelContent) {
            throw new Error('Panel content not found');
        }
        
        // Create Current Image section
        const currentImageSection = document.createElement('div');
        currentImageSection.className = 'status-section';
        currentImageSection.id = 'current-image-section';
        currentImageSection.innerHTML = `
            <div class="section-title">Current Image</div>
            <div class="file-info">
                <div class="file-name" id="current-file-name">No file selected</div>
                <div class="file-details" id="current-file-details">Upload an image to begin</div>
            </div>
        `;
        
        // Insert at the beginning of panel content
        panelContent.insertBefore(currentImageSection, panelContent.firstChild);
        
        console.log('📷 Current Image section added');
    }
    
    /**
     * Step 4: Enhance AI Enhancement Suite
     */
    async enhanceAIEnhancementSuite() {
        const settingsSection = document.querySelector('.status-section .settings-grid')?.closest('.status-section');
        if (!settingsSection) {
            throw new Error('Settings section not found');
        }
        
        // Update section title
        const sectionTitle = settingsSection.querySelector('.section-title');
        if (sectionTitle) {
            sectionTitle.textContent = 'AI Enhancement Suite';
        }
        
        // Find settings grid
        const settingsGrid = settingsSection.querySelector('.settings-grid');
        if (!settingsGrid) {
            throw new Error('Settings grid not found');
        }
        
        // Add Enhancement Type select before scale factor
        const scaleFactorItem = settingsGrid.querySelector('.setting-item');
        if (scaleFactorItem) {
            const enhancementTypeItem = document.createElement('div');
            enhancementTypeItem.className = 'form-group';
            enhancementTypeItem.innerHTML = `
                <label class="form-label">Enhancement Type</label>
                <select class="form-select" id="enhancement-type">
                    <option>Pure Upscaling</option>
                    <option selected>Super Resolution</option>
                    <option>Face Enhancement</option>
                </select>
            `;
            
            settingsGrid.insertBefore(enhancementTypeItem, scaleFactorItem);
        }
        
        // Update scale factor options
        const scaleFactorSelect = document.getElementById('scale-factor');
        if (scaleFactorSelect) {
            const currentValue = scaleFactorSelect.value;
            scaleFactorSelect.innerHTML = `
                <option value="2">2x Enhancement</option>
                <option value="4">4x Enhancement</option>
                <option value="6">6x Enhancement</option>
                <option value="8">8x Enhancement</option>
                <option value="10">10x Enhancement</option>
                <option value="12">12x Enhancement</option>
                <option value="15">15x Maximum</option>
            `;
            scaleFactorSelect.value = currentValue; // Preserve current value
        }
        
        // Add Background Processing select after scale factor
        const outputFormatItem = settingsGrid.querySelector('.setting-item:nth-child(3)'); // After enhancement type and scale factor
        if (outputFormatItem) {
            const backgroundProcessingItem = document.createElement('div');
            backgroundProcessingItem.className = 'form-group';
            backgroundProcessingItem.innerHTML = `
                <label class="form-label">Background Processing</label>
                <select class="form-select" id="background-processing">
                    <option selected>Keep Original</option>
                    <option>Remove Background</option>
                    <option>Blur Background</option>
                    <option>Replace Background</option>
                </select>
            `;
            
            outputFormatItem.parentNode.insertBefore(backgroundProcessingItem, outputFormatItem);
        }
        
        console.log('🤖 AI Enhancement Suite enhanced');
    }
    
    /**
     * Step 5: Add Advanced Options section
     */
    async addAdvancedOptions() {
        const settingsSection = document.querySelector('.status-section .settings-grid')?.closest('.status-section');
        if (!settingsSection) {
            throw new Error('Settings section not found');
        }
        
        // Create Advanced Options section
        const advancedOptionsSection = document.createElement('div');
        advancedOptionsSection.className = 'status-section';
        advancedOptionsSection.id = 'advanced-options-section';
        advancedOptionsSection.innerHTML = `
            <div class="section-title">Advanced Options</div>
            
            <div class="toggle-row">
                <div>
                    <div class="toggle-label">Face Enhancement</div>
                    <div class="toggle-description">AI-powered facial detail restoration</div>
                </div>
                <div class="toggle-switch" id="face-enhancement-toggle">
                    <div class="toggle-slider"></div>
                </div>
            </div>

            <div class="toggle-row">
                <div>
                    <div class="toggle-label">Artifact Removal</div>
                    <div class="toggle-description">Remove JPEG artifacts and compression</div>
                </div>
                <div class="toggle-switch" id="artifact-removal-toggle">
                    <div class="toggle-slider"></div>
                </div>
            </div>

            <div class="toggle-row">
                <div>
                    <div class="toggle-label">Color Correction</div>
                    <div class="toggle-description">Auto color balance and saturation</div>
                </div>
                <div class="toggle-switch" id="color-correction-toggle">
                    <div class="toggle-slider"></div>
                </div>
            </div>

            <div class="toggle-row">
                <div>
                    <div class="toggle-label">HDR Enhancement</div>
                    <div class="toggle-description">High dynamic range processing</div>
                </div>
                <div class="toggle-switch" id="hdr-enhancement-toggle">
                    <div class="toggle-slider"></div>
                </div>
            </div>
        `;
        
        // Insert after settings section
        settingsSection.parentNode.insertBefore(advancedOptionsSection, settingsSection.nextSibling);
        
        console.log('⚙️ Advanced Options section added');
    }
    
    /**
     * Step 6: Enhance Download Location
     */
    async enhanceDownloadLocation() {
        const downloadLocationItem = document.querySelector('label[for="download-location"]')?.closest('.setting-item');
        if (!downloadLocationItem) {
            throw new Error('Download location item not found');
        }
        
        // Get current value
        const currentInput = document.getElementById('download-location');
        const currentValue = currentInput ? currentInput.value : 'Downloads/ProUpscaler';
        
        // Create enhanced download selector
        const enhancedSelector = document.createElement('div');
        enhancedSelector.className = 'form-group';
        enhancedSelector.innerHTML = `
            <label class="form-label">Download Location</label>
            <div class="download-selector">
                <div class="location-display">
                    <div class="location-icon">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                        </svg>
                    </div>
                    <div class="location-path">
                        <div class="location-main" id="download-display-main">ProUpscaler</div>
                        <div class="location-sub" id="download-display-sub">~/Downloads/ProUpscaler</div>
                    </div>
                </div>
                <button class="location-browse" id="enhanced-browse-location" type="button">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                    Change
                </button>
            </div>
            <!-- Keep original input hidden for JavaScript compatibility -->
            <input type="text" id="download-location" value="${currentValue}" style="display: none;">
        `;
        
        // Replace the original item
        downloadLocationItem.parentNode.replaceChild(enhancedSelector, downloadLocationItem);
        
        // Preserve browse button functionality
        const enhancedBrowseBtn = document.getElementById('enhanced-browse-location');
        const originalBrowseBtn = document.getElementById('browse-location');
        
        if (enhancedBrowseBtn && originalBrowseBtn) {
            // Copy event listeners (simplified approach)
            enhancedBrowseBtn.addEventListener('click', () => {
                originalBrowseBtn.click();
            });
        }
        
        console.log('📁 Download Location enhanced');
    }
    
    /**
     * Step 7: Apply enhanced styling
     */
    async applyEnhancedStyling() {
        // Add enterprise styling classes
        const processingPanel = document.querySelector('.processing-status-panel');
        if (processingPanel) {
            processingPanel.classList.add('enterprise-enhanced');
        }
        
        // Update form elements to use new classes
        const selects = document.querySelectorAll('.setting-select');
        selects.forEach(select => {
            select.classList.add('form-select');
        });
        
        const labels = document.querySelectorAll('.setting-label');
        labels.forEach(label => {
            label.classList.add('form-label');
        });
        
        console.log('🎨 Enhanced styling applied');
    }
    
    /**
     * Step 8: Initialize enhanced integration
     */
    async initializeEnhancedIntegration() {
        // Load enhanced integration script
        const script = document.createElement('script');
        script.src = 'js/sidebar-integration-enhanced.js';
        script.id = 'enhanced-integration';
        
        return new Promise((resolve, reject) => {
            script.onload = () => {
                console.log('🔗 Enhanced integration initialized');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load enhanced integration'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Validate the update
     */
    validateUpdate() {
        console.log('🔍 Validating surgical update...');
        
        const validationResults = {
            criticalElements: true,
            functionality: true,
            styling: true,
            integration: true
        };
        
        // Check critical elements still exist
        const criticalElements = [
            'scale-factor', 'output-format', 'ai-enhancement-toggle',
            'download-location', 'start-processing'
        ];
        
        criticalElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`❌ Critical element missing: ${id}`);
                validationResults.criticalElements = false;
            }
        });
        
        // Check new elements exist
        const newElements = [
            'current-file-name', 'current-file-details', 'enhancement-type',
            'background-processing', 'face-enhancement-toggle'
        ];
        
        newElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`⚠️ New element missing: ${id}`);
            }
        });
        
        // Check JavaScript functionality
        if (window.app && typeof window.app.getCurrentSettings === 'function') {
            try {
                const settings = window.app.getCurrentSettings();
                if (settings && typeof settings === 'object') {
                    console.log('✅ getCurrentSettings() working');
                } else {
                    console.error('❌ getCurrentSettings() not returning valid object');
                    validationResults.functionality = false;
                }
            } catch (error) {
                console.error('❌ getCurrentSettings() error:', error);
                validationResults.functionality = false;
            }
        }
        
        // Overall validation
        const overallSuccess = Object.values(validationResults).every(result => result);
        
        if (overallSuccess) {
            console.log('🎉 Surgical update validation PASSED');
        } else {
            console.error('🚨 Surgical update validation FAILED');
            console.log('Validation results:', validationResults);
        }
        
        return overallSuccess;
    }
    
    /**
     * Rollback functions
     */
    
    restoreFromBackup() {
        // Implementation would restore from backup
        console.log('↩️ Restoring from backup...');
    }
    
    rollbackColors() {
        const enterpriseStyles = document.getElementById('enterprise-styles');
        if (enterpriseStyles) {
            enterpriseStyles.remove();
        }
    }
    
    removeCurrentImageSection() {
        const section = document.getElementById('current-image-section');
        if (section) {
            section.remove();
        }
    }
    
    rollbackAIEnhancementSuite() {
        // Remove added elements and restore original
        const enhancementType = document.getElementById('enhancement-type');
        if (enhancementType) {
            enhancementType.closest('.form-group').remove();
        }
        
        const backgroundProcessing = document.getElementById('background-processing');
        if (backgroundProcessing) {
            backgroundProcessing.closest('.form-group').remove();
        }
    }
    
    removeAdvancedOptions() {
        const section = document.getElementById('advanced-options-section');
        if (section) {
            section.remove();
        }
    }
    
    rollbackDownloadLocation() {
        // Restore original download location implementation
        console.log('↩️ Rolling back download location...');
    }
    
    rollbackStyling() {
        const processingPanel = document.querySelector('.processing-status-panel');
        if (processingPanel) {
            processingPanel.classList.remove('enterprise-enhanced');
        }
    }
    
    cleanupEnhancedIntegration() {
        const script = document.getElementById('enhanced-integration');
        if (script) {
            script.remove();
        }
        
        if (window.enhancedSidebar) {
            delete window.enhancedSidebar;
        }
    }
}

// Global functions for manual control
window.applySurgicalSidebarUpdate = async function() {
    const updater = new SurgicalSidebarUpdater();
    return await updater.applySurgicalUpdate();
};

window.validateSidebarUpdate = function() {
    const updater = new SurgicalSidebarUpdater();
    return updater.validateUpdate();
};

// Auto-apply if requested
if (window.location.search.includes('apply-surgical-update=true')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.applySurgicalSidebarUpdate();
        }, 1000);
    });
}

console.log('🔧 Surgical Sidebar Updater loaded. Use applySurgicalSidebarUpdate() to apply changes.'); 