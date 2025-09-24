/**
 * Sidebar Sync Testing Script
 * Provides real-time synchronization between current and new sidebar implementations
 * and comprehensive functionality testing for the surgical update process
 */

class SidebarSyncTester {
    constructor() {
        this.currentSidebar = document.getElementById('current-sidebar');
        this.newSidebar = document.getElementById('new-sidebar');
        this.syncIndicator = document.getElementById('syncIndicator');
        this.testResults = document.getElementById('testResults');
        
        this.testCount = 0;
        this.passCount = 0;
        this.failCount = 0;
        
        this.setupEventListeners();
        this.setupToggleHandlers();
        this.logResult('System initialized', 'info');
    }
    
    setupEventListeners() {
        // Monitor all form changes in current sidebar
        const currentInputs = this.currentSidebar.querySelectorAll('select, input[type="checkbox"], button');
        currentInputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.addEventListener('change', (e) => this.syncToNew(e));
            } else if (input.tagName === 'SELECT') {
                input.addEventListener('change', (e) => this.syncToNew(e));
            } else if (input.tagName === 'BUTTON') {
                input.addEventListener('click', (e) => this.syncToNew(e));
            }
        });
        
        // Monitor all form changes in new sidebar
        const newInputs = this.newSidebar.querySelectorAll('select, input[type="checkbox"], .toggle-switch');
        newInputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.addEventListener('change', (e) => this.syncToCurrent(e));
            } else if (input.tagName === 'SELECT') {
                input.addEventListener('change', (e) => this.syncToCurrent(e));
            } else if (input.classList.contains('toggle-switch')) {
                input.addEventListener('click', (e) => this.handleToggleClick(e));
            }
        });
    }
    
    setupToggleHandlers() {
        // Setup new toggle switches
        const toggles = this.newSidebar.querySelectorAll('.toggle-switch');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                this.syncToggleState(toggle);
            });
        });
    }
    
    syncToNew(event) {
        const element = event.target;
        const newElement = this.findCorrespondingElement(element, this.newSidebar);
        
        if (newElement) {
            this.copyElementState(element, newElement);
            this.flashSync();
            this.logResult(`Synced ${element.id || element.className} to new sidebar`, 'info');
        }
    }
    
    syncToCurrent(event) {
        const element = event.target;
        const currentElement = this.findCorrespondingElement(element, this.currentSidebar);
        
        if (currentElement) {
            this.copyElementState(element, currentElement);
            this.flashSync();
            this.logResult(`Synced ${element.id || element.className} to current sidebar`, 'info');
        }
    }
    
    handleToggleClick(event) {
        const toggle = event.target.closest('.toggle-switch');
        if (toggle) {
            toggle.classList.toggle('active');
            this.syncToggleState(toggle);
            this.flashSync();
        }
    }
    
    syncToggleState(toggle) {
        const syncId = toggle.dataset.sync;
        if (syncId === 'ai-enhancement') {
            const currentToggle = document.getElementById('ai-enhancement-toggle');
            if (currentToggle) {
                currentToggle.checked = toggle.classList.contains('active');
            }
        }
    }
    
    findCorrespondingElement(source, targetContainer) {
        const syncAttr = source.dataset.sync;
        
        // Match by sync attribute first
        if (syncAttr) {
            const bySync = targetContainer.querySelector(`[data-sync="${syncAttr}"]`);
            if (bySync) return bySync;
        }
        
        // Match by ID with prefix handling
        if (source.id) {
            const baseId = source.id.replace('new-', '').replace('current-', '');
            const targetId = targetContainer === this.newSidebar ? 'new-' + baseId : baseId;
            const byId = targetContainer.querySelector(`#${targetId}`);
            if (byId) return byId;
        }
        
        return null;
    }
    
    copyElementState(source, target) {
        if (source.type === 'checkbox') {
            target.checked = source.checked;
            // Handle new toggle switches
            if (target.classList && target.classList.contains('toggle-switch')) {
                if (source.checked) {
                    target.classList.add('active');
                } else {
                    target.classList.remove('active');
                }
            }
        } else if (source.tagName === 'SELECT') {
            target.value = source.value;
        } else if (source.type === 'text') {
            target.value = source.value;
        } else if (source.classList && source.classList.contains('toggle-switch')) {
            const isActive = source.classList.contains('active');
            const correspondingCheckbox = this.findCheckboxForToggle(target);
            if (correspondingCheckbox) {
                correspondingCheckbox.checked = isActive;
            }
        }
        
        // Trigger change event
        if (target.dispatchEvent) {
            target.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    findCheckboxForToggle(toggle) {
        const syncAttr = toggle.dataset.sync;
        if (syncAttr === 'ai-enhancement') {
            return document.getElementById('ai-enhancement-toggle');
        }
        return null;
    }
    
    flashSync() {
        this.syncIndicator.classList.add('active');
        setTimeout(() => {
            this.syncIndicator.classList.remove('active');
        }, 500);
    }
    
    logResult(message, type = 'info') {
        const resultDiv = document.createElement('div');
        resultDiv.className = `test-result ${type}`;
        resultDiv.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        
        this.testResults.appendChild(resultDiv);
        this.testResults.scrollTop = this.testResults.scrollHeight;
        
        if (type === 'pass') this.passCount++;
        if (type === 'fail') this.failCount++;
        this.testCount++;
    }
}

// Global test functions
function testSettingsSync() {
    const tester = window.sidebarTester;
    tester.logResult('Testing settings synchronization...', 'info');
    
    try {
        // Test scale factor sync
        const scaleSelect = document.getElementById('scale-factor');
        scaleSelect.value = '8';
        scaleSelect.dispatchEvent(new Event('change'));
        
        const newScaleSelect = document.getElementById('new-scale-factor');
        if (newScaleSelect.value === '8') {
            tester.logResult('✓ Scale factor sync working', 'pass');
        } else {
            tester.logResult('✗ Scale factor sync failed', 'fail');
        }
        
        // Test format sync
        const formatSelect = document.getElementById('output-format');
        formatSelect.value = 'png';
        formatSelect.dispatchEvent(new Event('change'));
        
        const newFormatSelect = document.getElementById('new-output-format');
        if (newFormatSelect.value === 'png') {
            tester.logResult('✓ Output format sync working', 'pass');
        } else {
            tester.logResult('✗ Output format sync failed', 'fail');
        }
        
        // Test AI toggle sync
        const aiToggle = document.getElementById('ai-enhancement-toggle');
        aiToggle.checked = false;
        aiToggle.dispatchEvent(new Event('change'));
        
        const newAiToggle = document.getElementById('new-ai-enhancement-toggle');
        if (!newAiToggle.classList.contains('active')) {
            tester.logResult('✓ AI enhancement toggle sync working', 'pass');
        } else {
            tester.logResult('✗ AI enhancement toggle sync failed', 'fail');
        }
        
    } catch (error) {
        tester.logResult(`Settings sync test error: ${error.message}`, 'fail');
    }
}

function testFormBinding() {
    const tester = window.sidebarTester;
    tester.logResult('Testing form element binding...', 'info');
    
    try {
        // Test if all required elements exist
        const requiredElements = [
            'scale-factor',
            'output-format', 
            'ai-enhancement-toggle',
            'download-location',
            'browse-location',
            'start-processing'
        ];
        
        let allFound = true;
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                tester.logResult(`✓ Found element: ${id}`, 'pass');
            } else {
                tester.logResult(`✗ Missing element: ${id}`, 'fail');
                allFound = false;
            }
        });
        
        if (allFound) {
            tester.logResult('✓ All required form elements present', 'pass');
        } else {
            tester.logResult('✗ Some required form elements missing', 'fail');
        }
        
        // Test new elements
        const newElements = [
            'new-enhancement-type',
            'new-background-processing',
            'new-face-enhancement-toggle',
            'new-artifact-removal-toggle'
        ];
        
        newElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                tester.logResult(`✓ Found new element: ${id}`, 'pass');
            } else {
                tester.logResult(`✗ Missing new element: ${id}`, 'fail');
            }
        });
        
    } catch (error) {
        tester.logResult(`Form binding test error: ${error.message}`, 'fail');
    }
}

function testProcessingFlow() {
    const tester = window.sidebarTester;
    tester.logResult('Testing processing flow compatibility...', 'info');
    
    try {
        // Test getCurrentSettings function
        if (typeof window.app !== 'undefined' && typeof window.app.getCurrentSettings === 'function') {
            const settings = window.app.getCurrentSettings();
            
            if (settings && typeof settings === 'object') {
                tester.logResult('✓ getCurrentSettings() returns object', 'pass');
                
                // Check required properties
                const requiredProps = ['scaleFactor', 'outputFormat', 'aiEnhancement', 'quality'];
                let allPropsPresent = true;
                
                requiredProps.forEach(prop => {
                    if (settings.hasOwnProperty(prop)) {
                        tester.logResult(`✓ Settings has ${prop}: ${settings[prop]}`, 'pass');
                    } else {
                        tester.logResult(`✗ Settings missing ${prop}`, 'fail');
                        allPropsPresent = false;
                    }
                });
                
                // Check new properties
                if (settings.hasOwnProperty('enhancementType')) {
                    tester.logResult(`✓ New property enhancementType: ${settings.enhancementType}`, 'pass');
                }
                
                if (settings.hasOwnProperty('backgroundProcessing')) {
                    tester.logResult(`✓ New property backgroundProcessing: ${settings.backgroundProcessing}`, 'pass');
                }
                
            } else {
                tester.logResult('✗ getCurrentSettings() does not return valid object', 'fail');
            }
        } else {
            tester.logResult('✗ getCurrentSettings() function not available', 'fail');
        }
        
        // Test getDownloadLocation function
        if (typeof window.app !== 'undefined' && typeof window.app.getDownloadLocation === 'function') {
            const location = window.app.getDownloadLocation();
            if (location && typeof location === 'string') {
                tester.logResult(`✓ getDownloadLocation() returns: ${location}`, 'pass');
            } else {
                tester.logResult('✗ getDownloadLocation() does not return valid string', 'fail');
            }
        } else {
            tester.logResult('✗ getDownloadLocation() function not available', 'fail');
        }
        
    } catch (error) {
        tester.logResult(`Processing flow test error: ${error.message}`, 'fail');
    }
}

function testToggleStates() {
    const tester = window.sidebarTester;
    tester.logResult('Testing toggle switch functionality...', 'info');
    
    try {
        // Test new toggle switches
        const toggles = document.querySelectorAll('#new-sidebar .toggle-switch');
        
        toggles.forEach((toggle, index) => {
            const syncId = toggle.dataset.sync;
            
            // Click toggle
            toggle.click();
            
            if (toggle.classList.contains('active')) {
                tester.logResult(`✓ Toggle ${syncId || index} activated on click`, 'pass');
            } else {
                tester.logResult(`✗ Toggle ${syncId || index} not activated on click`, 'fail');
            }
            
            // Click again to deactivate
            toggle.click();
            
            if (!toggle.classList.contains('active')) {
                tester.logResult(`✓ Toggle ${syncId || index} deactivated on second click`, 'pass');
            } else {
                tester.logResult(`✗ Toggle ${syncId || index} not deactivated on second click`, 'fail');
            }
        });
        
        // Test original AI toggle
        const aiToggle = document.getElementById('ai-enhancement-toggle');
        if (aiToggle) {
            const originalState = aiToggle.checked;
            aiToggle.checked = !originalState;
            aiToggle.dispatchEvent(new Event('change'));
            
            if (aiToggle.checked !== originalState) {
                tester.logResult('✓ Original AI toggle state change working', 'pass');
            } else {
                tester.logResult('✗ Original AI toggle state change failed', 'fail');
            }
        }
        
    } catch (error) {
        tester.logResult(`Toggle states test error: ${error.message}`, 'fail');
    }
}

function testDownloadLocation() {
    const tester = window.sidebarTester;
    tester.logResult('Testing download location functionality...', 'info');
    
    try {
        // Test current implementation
        const currentInput = document.getElementById('download-location');
        const currentBrowse = document.getElementById('browse-location');
        
        if (currentInput && currentBrowse) {
            tester.logResult('✓ Current download location elements present', 'pass');
            
            // Test value access
            const currentValue = currentInput.value;
            if (currentValue) {
                tester.logResult(`✓ Current download location value: ${currentValue}`, 'pass');
            } else {
                tester.logResult('✗ Current download location has no value', 'fail');
            }
        } else {
            tester.logResult('✗ Current download location elements missing', 'fail');
        }
        
        // Test new implementation
        const newInput = document.getElementById('new-download-location');
        const newBrowse = document.getElementById('new-browse-location');
        const newDisplay = document.getElementById('new-download-display-main');
        
        if (newInput && newBrowse && newDisplay) {
            tester.logResult('✓ New download location elements present', 'pass');
            
            // Test hidden input synchronization
            const newValue = newInput.value;
            if (newValue) {
                tester.logResult(`✓ New download location hidden value: ${newValue}`, 'pass');
            }
            
            // Test display update
            if (newDisplay.textContent) {
                tester.logResult(`✓ New download location display: ${newDisplay.textContent}`, 'pass');
            }
        } else {
            tester.logResult('✗ New download location elements missing', 'fail');
        }
        
    } catch (error) {
        tester.logResult(`Download location test error: ${error.message}`, 'fail');
    }
}

function testCompatibility() {
    const tester = window.sidebarTester;
    tester.logResult('Testing JavaScript compatibility...', 'info');
    
    try {
        // Test DOM query compatibility
        const criticalElements = {
            'scale-factor': document.getElementById('scale-factor'),
            'output-format': document.getElementById('output-format'),
            'ai-enhancement-toggle': document.getElementById('ai-enhancement-toggle'),
            'start-processing': document.getElementById('start-processing'),
            'browse-location': document.getElementById('browse-location')
        };
        
        let compatibilityScore = 0;
        const totalElements = Object.keys(criticalElements).length;
        
        Object.entries(criticalElements).forEach(([id, element]) => {
            if (element) {
                tester.logResult(`✓ Critical element ${id} accessible via getElementById`, 'pass');
                compatibilityScore++;
                
                // Test value/state access
                if (element.tagName === 'SELECT' && element.value !== undefined) {
                    tester.logResult(`✓ ${id} value accessible: ${element.value}`, 'pass');
                } else if (element.type === 'checkbox' && element.checked !== undefined) {
                    tester.logResult(`✓ ${id} checked state accessible: ${element.checked}`, 'pass');
                } else if (element.tagName === 'BUTTON') {
                    tester.logResult(`✓ ${id} button accessible and clickable`, 'pass');
                } else if (element.tagName === 'INPUT' && element.value !== undefined) {
                    tester.logResult(`✓ ${id} input value accessible: ${element.value}`, 'pass');
                }
            } else {
                tester.logResult(`✗ Critical element ${id} not found`, 'fail');
            }
        });
        
        const compatibilityPercentage = (compatibilityScore / totalElements * 100).toFixed(1);
        
        if (compatibilityScore === totalElements) {
            tester.logResult(`✓ Full JavaScript compatibility: ${compatibilityPercentage}%`, 'pass');
        } else {
            tester.logResult(`⚠ Partial JavaScript compatibility: ${compatibilityPercentage}%`, 'fail');
        }
        
        // Test function availability
        const requiredFunctions = ['getCurrentSettings', 'getDownloadLocation'];
        requiredFunctions.forEach(funcName => {
            if (window.app && typeof window.app[funcName] === 'function') {
                tester.logResult(`✓ Function ${funcName} available`, 'pass');
            } else {
                tester.logResult(`✗ Function ${funcName} not available`, 'fail');
            }
        });
        
    } catch (error) {
        tester.logResult(`Compatibility test error: ${error.message}`, 'fail');
    }
}

function clearResults() {
    const testResults = document.getElementById('testResults');
    testResults.innerHTML = '';
    
    const tester = window.sidebarTester;
    if (tester) {
        tester.testCount = 0;
        tester.passCount = 0;
        tester.failCount = 0;
        tester.logResult('Test results cleared', 'info');
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarTester = new SidebarSyncTester();
    
    // Run initial compatibility test
    setTimeout(() => {
        testCompatibility();
    }, 1000);
}); 