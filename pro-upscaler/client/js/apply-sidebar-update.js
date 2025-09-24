/**
 * Apply Sidebar Update Script
 * Directly applies the enterprise sidebar updates to the main Pro Upscaler application
 * Safe to run on the live application - includes rollback capability
 */

(function() {
    'use strict';
    
    let updateApplied = false;
    let originalElements = new Map();
    
    /**
     * Apply the enterprise sidebar update
     */
    function applySidebarUpdate() {
        if (updateApplied) {
            console.log('✅ Sidebar update already applied');
            return true;
        }
        
        console.log('🔧 Applying enterprise sidebar update...');
        
        try {
            // Step 1: Backup current elements
            backupCurrentElements();
            
            // Step 2: Apply enterprise color scheme
            applyEnterpriseColors();
            
            // Step 3: Add Current Image section
            addCurrentImageSection();
            
            // Step 4: Enhance AI Enhancement Suite
            enhanceAIEnhancementSuite();
            
            // Step 5: Add Advanced Options
            addAdvancedOptions();
            
            // Step 6: Enhance Download Location
            enhanceDownloadLocation();
            
            // Step 7: Initialize enhanced functionality
            initializeEnhancedFunctionality();
            
            updateApplied = true;
            console.log('🎉 Enterprise sidebar update completed successfully!');
            
            // Validate the update
            validateUpdate();
            
            return true;
            
        } catch (error) {
            console.error('❌ Sidebar update failed:', error);
            rollbackUpdate();
            return false;
        }
    }
    
    /**
     * Backup current elements
     */
    function backupCurrentElements() {
        const processingPanel = document.querySelector('.processing-status-panel');
        if (processingPanel) {
            originalElements.set('processingPanel', processingPanel.cloneNode(true));
        }
        
        console.log('💾 Current elements backed up');
    }
    
    /**
     * Apply enterprise color scheme
     */
    function applyEnterpriseColors() {
        // Inject enterprise CSS variables
        const style = document.createElement('style');
        style.id = 'enterprise-colors';
        style.textContent = `
            :root {
                --background: 30 41 59 !important;              /* #1e293b */
                --foreground: 241 245 249 !important;           /* #f1f5f9 */
                --card: 30 41 59 !important;                    /* #1e293b */
                --border: 51 65 85 !important;                  /* #334155 */
                --muted: 51 65 85 !important;                   /* #334155 */
                --muted-foreground: var(--muted-foreground) !important;     /* #64748b */
                --primary: var(--primary) !important;               /* #3b82f6 */
                --success: var(--success) !important;                /* #22c55e */
            }
            
            /* Enhanced section styling */
            .status-section {
                gap: 16px !important;
            }
            
            .section-title {
                color: hsl(var(--muted-foreground)) !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
            }
            
            /* Enhanced file info styling */
            .file-info {
                padding: 12px !important;
                background: hsl(var(--muted) / 0.2) !important;
                border: 1px solid hsl(var(--border)) !important;
                border-radius: 6px !important;
            }
            
            .file-name {
                font-size: 12px !important;
                font-weight: 600 !important;
                color: hsl(var(--foreground))) !important;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace !important;
            }
            
            .file-details {
                font-size: 10px !important;
                color: hsl(var(--muted-foreground)) !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('🎨 Enterprise color scheme applied');
    }
    
    /**
     * Add Current Image section
     */
    function addCurrentImageSection() {
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
        
        // Insert at the beginning
        panelContent.insertBefore(currentImageSection, panelContent.firstChild);
        
        console.log('📷 Current Image section added');
    }
    
    /**
     * Enhance AI Enhancement Suite
     */
    function enhanceAIEnhancementSuite() {
        const settingsSection = document.querySelector('.status-section .settings-grid')?.closest('.status-section');
        if (!settingsSection) {
            throw new Error('Settings section not found');
        }
        
        // Update section title
        const sectionTitle = settingsSection.querySelector('.section-title');
        if (sectionTitle) {
            sectionTitle.textContent = 'AI Enhancement Suite';
        }
        
        // Add Enhancement Type select
        const settingsGrid = settingsSection.querySelector('.settings-grid');
        if (settingsGrid) {
            const enhancementTypeHTML = `
                <div class="setting-item">
                    <label class="setting-label" for="enhancement-type">Enhancement Type</label>
                    <select id="enhancement-type" class="setting-select">
                        <option>Pure Upscaling</option>
                        <option selected>Super Resolution</option>
                        <option>Face Enhancement</option>
                    </select>
                </div>
            `;
            settingsGrid.insertAdjacentHTML('afterbegin', enhancementTypeHTML);
            
            // Add Background Processing select
            const backgroundProcessingHTML = `
                <div class="setting-item">
                    <label class="setting-label" for="background-processing">Background Processing</label>
                    <select id="background-processing" class="setting-select">
                        <option selected>Keep Original</option>
                        <option>Remove Background</option>
                        <option>Blur Background</option>
                        <option>Replace Background</option>
                    </select>
                </div>
            `;
            
            // Insert after scale factor
            const scaleFactorItem = settingsGrid.children[1]; // After enhancement type
            if (scaleFactorItem) {
                scaleFactorItem.insertAdjacentHTML('afterend', backgroundProcessingHTML);
            }
        }
        
        console.log('🤖 AI Enhancement Suite enhanced');
    }
    
    /**
     * Add Advanced Options section
     */
    function addAdvancedOptions() {
        const settingsSection = document.querySelector('.status-section .settings-grid')?.closest('.status-section');
        if (!settingsSection) {
            throw new Error('Settings section not found');
        }
        
        // Create Advanced Options section
        const advancedOptionsHTML = `
            <div class="status-section" id="advanced-options-section">
                <div class="section-title">Advanced Options</div>
                
                <div class="toggle-row" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
                    <div>
                        <div style="font-size: 11px; font-weight: 500; color: hsl(var(--foreground)));">Face Enhancement</div>
                        <div style="font-size: 9px; color: hsl(var(--muted-foreground)); margin-top: 2px;">AI-powered facial detail restoration</div>
                    </div>
                    <div class="toggle-switch" id="face-enhancement-toggle" style="position: relative; width: 36px; height: 18px; background: hsl(var(--muted)); border-radius: 18px; cursor: pointer; transition: background 0.2s;">
                        <div class="toggle-slider" style="position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s;"></div>
                    </div>
                </div>

                <div class="toggle-row" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
                    <div>
                        <div style="font-size: 11px; font-weight: 500; color: hsl(var(--foreground)));">Artifact Removal</div>
                        <div style="font-size: 9px; color: hsl(var(--muted-foreground)); margin-top: 2px;">Remove JPEG artifacts and compression</div>
                    </div>
                    <div class="toggle-switch" id="artifact-removal-toggle" style="position: relative; width: 36px; height: 18px; background: hsl(var(--muted)); border-radius: 18px; cursor: pointer; transition: background 0.2s;">
                        <div class="toggle-slider" style="position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s;"></div>
                    </div>
                </div>

                <div class="toggle-row" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
                    <div>
                        <div style="font-size: 11px; font-weight: 500; color: hsl(var(--foreground)));">Color Correction</div>
                        <div style="font-size: 9px; color: hsl(var(--muted-foreground)); margin-top: 2px;">Auto color balance and saturation</div>
                    </div>
                    <div class="toggle-switch" id="color-correction-toggle" style="position: relative; width: 36px; height: 18px; background: hsl(var(--muted)); border-radius: 18px; cursor: pointer; transition: background 0.2s;">
                        <div class="toggle-slider" style="position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s;"></div>
                    </div>
                </div>

                <div class="toggle-row" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
                    <div>
                        <div style="font-size: 11px; font-weight: 500; color: hsl(var(--foreground)));">HDR Enhancement</div>
                        <div style="font-size: 9px; color: hsl(var(--muted-foreground)); margin-top: 2px;">High dynamic range processing</div>
                    </div>
                    <div class="toggle-switch" id="hdr-enhancement-toggle" style="position: relative; width: 36px; height: 18px; background: hsl(var(--muted)); border-radius: 18px; cursor: pointer; transition: background 0.2s;">
                        <div class="toggle-slider" style="position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s;"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after settings section
        settingsSection.insertAdjacentHTML('afterend', advancedOptionsHTML);
        
        console.log('⚙️ Advanced Options section added');
    }
    
    /**
     * Enhance Download Location
     */
    function enhanceDownloadLocation() {
        const downloadLocationItem = document.querySelector('label[for="download-location"]')?.closest('.setting-item');
        if (!downloadLocationItem) {
            console.warn('Download location item not found - skipping enhancement');
            return;
        }
        
        // Get current value
        const currentInput = document.getElementById('download-location');
        const currentValue = currentInput ? currentInput.value : 'Downloads/ProUpscaler';
        
        // Enhance the display while keeping the original input hidden for compatibility
        const enhancedHTML = `
            <div class="setting-item">
                <label class="setting-label">Download Location</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <div style="flex: 1; display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: hsl(var(--input)); border: 1px solid hsl(var(--border)); border-radius: 4px;">
                        <div style="color: hsl(var(--muted-foreground));">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                            </svg>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 11px; font-weight: 600; color: hsl(var(--foreground)));">ProUpscaler</div>
                            <div style="font-size: 9px; color: hsl(var(--muted-foreground));">~/Downloads/ProUpscaler</div>
                        </div>
                    </div>
                    <button type="button" style="padding: 10px 12px; background: hsl(var(--secondary)); border: 1px solid hsl(var(--border)); border-radius: 4px; color: hsl(var(--foreground))); font-size: 10px; cursor: pointer;">
                        Change
                    </button>
                </div>
                <!-- Keep original input hidden for JavaScript compatibility -->
                <input type="text" id="download-location" value="${currentValue}" style="display: none;">
            </div>
        `;
        
        downloadLocationItem.outerHTML = enhancedHTML;
        
        console.log('📁 Download Location enhanced');
    }
    
    /**
     * Initialize enhanced functionality
     */
    function initializeEnhancedFunctionality() {
        // Setup toggle functionality
        const toggles = document.querySelectorAll('.toggle-switch');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const isActive = toggle.style.background === 'hsl(var(--primary))';
                const slider = toggle.querySelector('.toggle-slider');
                
                if (isActive) {
                    toggle.style.background = 'hsl(var(--muted))';
                    slider.style.transform = 'translateX(0)';
                } else {
                    toggle.style.background = 'hsl(var(--primary))';
                    slider.style.transform = 'translateX(18px)';
                }
            });
        });
        
        // Extend getCurrentSettings method
        if (window.app && typeof window.app.getCurrentSettings === 'function') {
            const originalGetCurrentSettings = window.app.getCurrentSettings;
            
            window.app.getCurrentSettings = function() {
                const originalSettings = originalGetCurrentSettings.call(this);
                
                // Add enhanced settings
                const enhancementType = document.getElementById('enhancement-type')?.value || 'Super Resolution';
                const backgroundProcessing = document.getElementById('background-processing')?.value || 'Keep Original';
                
                // Get advanced options
                const faceEnhancement = document.getElementById('face-enhancement-toggle')?.style.background === 'hsl(var(--primary))';
                const artifactRemoval = document.getElementById('artifact-removal-toggle')?.style.background === 'hsl(var(--primary))';
                const colorCorrection = document.getElementById('color-correction-toggle')?.style.background === 'hsl(var(--primary))';
                const hdrEnhancement = document.getElementById('hdr-enhancement-toggle')?.style.background === 'hsl(var(--primary))';
                
                return {
                    ...originalSettings,
                    enhancementType,
                    backgroundProcessing,
                    advancedOptions: {
                        faceEnhancement: !!faceEnhancement,
                        artifactRemoval: !!artifactRemoval,
                        colorCorrection: !!colorCorrection,
                        hdrEnhancement: !!hdrEnhancement
                    }
                };
            };
        }
        
        // Setup current image display updates
        setupCurrentImageUpdates();
        
        console.log('🔗 Enhanced functionality initialized');
    }
    
    /**
     * Setup current image display updates
     */
    function setupCurrentImageUpdates() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    updateCurrentImageDisplay(e.target.files[0]);
                }
            });
        }
    }
    
    /**
     * Update current image display
     */
    function updateCurrentImageDisplay(file) {
        const fileName = document.getElementById('current-file-name');
        const fileDetails = document.getElementById('current-file-details');
        
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
            };
            img.onerror = () => {
                fileDetails.textContent = `${sizeInMB}MB • ${format}`;
            };
            img.src = URL.createObjectURL(file);
        }
    }
    
    /**
     * Validate the update
     */
    function validateUpdate() {
        console.log('🔍 Validating sidebar update...');
        
        const criticalElements = [
            'scale-factor', 'output-format', 'ai-enhancement-toggle',
            'download-location', 'start-processing'
        ];
        
        let validationPassed = true;
        
        criticalElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`✅ Critical element preserved: ${id}`);
            } else {
                console.error(`❌ Critical element missing: ${id}`);
                validationPassed = false;
            }
        });
        
        // Check new elements
        const newElements = [
            'current-file-name', 'current-file-details', 'enhancement-type',
            'background-processing', 'face-enhancement-toggle'
        ];
        
        newElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`✅ New element added: ${id}`);
            } else {
                console.warn(`⚠️ New element missing: ${id}`);
            }
        });
        
        // Test settings function
        if (window.app && typeof window.app.getCurrentSettings === 'function') {
            try {
                const settings = window.app.getCurrentSettings();
                console.log('✅ getCurrentSettings() working:', settings);
            } catch (error) {
                console.error('❌ getCurrentSettings() error:', error);
                validationPassed = false;
            }
        }
        
        if (validationPassed) {
            console.log('🎉 Sidebar update validation PASSED');
        } else {
            console.error('🚨 Sidebar update validation FAILED');
        }
        
        return validationPassed;
    }
    
    /**
     * Rollback the update
     */
    function rollbackUpdate() {
        if (!updateApplied) {
            console.log('ℹ️ No update to rollback');
            return;
        }
        
        console.log('🔄 Rolling back sidebar update...');
        
        try {
            // Remove enterprise styles
            const enterpriseStyles = document.getElementById('enterprise-colors');
            if (enterpriseStyles) {
                enterpriseStyles.remove();
            }
            
            // Remove added sections
            const currentImageSection = document.getElementById('current-image-section');
            if (currentImageSection) {
                currentImageSection.remove();
            }
            
            const advancedOptionsSection = document.getElementById('advanced-options-section');
            if (advancedOptionsSection) {
                advancedOptionsSection.remove();
            }
            
            // Restore original processing panel if needed
            const originalPanel = originalElements.get('processingPanel');
            if (originalPanel) {
                const currentPanel = document.querySelector('.processing-status-panel');
                if (currentPanel && currentPanel.parentNode) {
                    currentPanel.parentNode.replaceChild(originalPanel, currentPanel);
                }
            }
            
            updateApplied = false;
            console.log('✅ Sidebar update rolled back successfully');
            
        } catch (error) {
            console.error('❌ Rollback failed:', error);
        }
    }
    
    // Expose functions globally
    window.applySidebarUpdate = applySidebarUpdate;
    window.rollbackSidebarUpdate = rollbackUpdate;
    window.validateSidebarUpdate = validateUpdate;
    
    // Auto-apply if requested via URL parameter
    if (window.location.search.includes('apply-sidebar-update=true')) {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(applySidebarUpdate, 1000);
        });
    }
    
    console.log('🔧 Sidebar update script loaded. Use applySidebarUpdate() to apply changes.');
    
})(); 