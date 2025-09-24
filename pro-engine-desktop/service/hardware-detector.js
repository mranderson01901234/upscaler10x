const os = require('os');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class HardwareDetector {
    constructor() {
        this.capabilities = null;
        this.webgpuSupport = null;
    }
    
    async initialize() {
        this.capabilities = await this.detectSystemCapabilities();
        this.webgpuSupport = await this.detectWebGPUSupport();
        console.log('🔍 Hardware detection complete');
    }
    
    async detectSystemCapabilities() {
        const capabilities = {
            cpu: this.analyzeCPU(),
            memory: this.analyzeMemory(),
            platform: this.analyzePlatform(),
            gpu: await this.detectGPUInfo(),
            webgpu: this.webgpuSupport,
            timestamp: Date.now()
        };
        
        return capabilities;
    }

    /**
     * Detect WebGPU support and GPU capabilities on the server side
     * This provides information about hardware that can support WebGPU
     */
    async detectWebGPUSupport() {
        console.log('🔍 Detecting WebGPU support...');
        
        const webgpuInfo = {
            serverSupported: false,
            gpuInfo: null,
            driverInfo: null,
            memoryInfo: null,
            supportLevel: 'none', // none, basic, full
            detectionTimestamp: Date.now(),
            requirements: {
                modernBrowser: true, // Will be checked client-side
                dedicatedGPU: false,
                sufficientMemory: false,
                supportedDriver: false
            }
        };

        try {
            // Detect GPU information
            const gpuInfo = await this.detectGPUInfo();
            webgpuInfo.gpuInfo = gpuInfo;

            // Check if we have a dedicated GPU
            if (gpuInfo && (gpuInfo.nvidia || gpuInfo.amd || gpuInfo.intel)) {
                webgpuInfo.requirements.dedicatedGPU = true;
            }

            // Check memory requirements (WebGPU needs sufficient system + GPU memory)
            const memoryGB = this.capabilities?.memory?.total / (1024 * 1024 * 1024) || 
                           os.totalmem() / (1024 * 1024 * 1024);
            
            if (memoryGB >= 8) { // Minimum 8GB system RAM for WebGPU processing
                webgpuInfo.requirements.sufficientMemory = true;
            }

            // Determine support level
            const dedicatedGPU = webgpuInfo.requirements.dedicatedGPU;
            const sufficientMemory = webgpuInfo.requirements.sufficientMemory;

            if (dedicatedGPU && sufficientMemory) {
                webgpuInfo.supportLevel = 'full';
                webgpuInfo.serverSupported = true;
            } else if (sufficientMemory) {
                webgpuInfo.supportLevel = 'basic';
                webgpuInfo.serverSupported = true;
            }

            console.log(`✅ WebGPU server support: ${webgpuInfo.supportLevel}`);
            
        } catch (error) {
            console.error('WebGPU detection error:', error);
            webgpuInfo.error = error.message;
        }

        return webgpuInfo;
    }

    /**
     * Detect GPU information on the system
     */
    async detectGPUInfo() {
        const gpuInfo = {
            nvidia: null,
            amd: null,
            intel: null,
            detected: false,
            totalMemory: null,
            driverVersion: null
        };

        try {
            const platform = os.platform();
            
            if (platform === 'linux') {
                await this.detectLinuxGPU(gpuInfo);
            } else if (platform === 'win32') {
                await this.detectWindowsGPU(gpuInfo);
            } else if (platform === 'darwin') {
                await this.detectMacGPU(gpuInfo);
            }

        } catch (error) {
            console.error('GPU detection error:', error);
            gpuInfo.error = error.message;
        }

        return gpuInfo;
    }

    /**
     * Detect GPU on Linux systems
     */
    async detectLinuxGPU(gpuInfo) {
        try {
            // Try lspci first (most reliable)
            const { stdout: lspciOutput } = await execAsync('lspci | grep -i vga');
            
            if (lspciOutput) {
                const lspciLines = lspciOutput.toLowerCase();
                
                if (lspciLines.includes('nvidia')) {
                    gpuInfo.nvidia = await this.detectNvidiaGPU();
                    gpuInfo.detected = true;
                }
                
                if (lspciLines.includes('amd') || lspciLines.includes('radeon')) {
                    gpuInfo.amd = await this.detectAMDGPU();
                    gpuInfo.detected = true;
                }
                
                if (lspciLines.includes('intel')) {
                    gpuInfo.intel = await this.detectIntelGPU();
                    gpuInfo.detected = true;
                }
            }

            // Try nvidia-smi for NVIDIA-specific info
            if (!gpuInfo.nvidia) {
                try {
                    const { stdout: nvidiaSmi } = await execAsync('nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits');
                    if (nvidiaSmi.trim()) {
                        const [name, memory, driver] = nvidiaSmi.trim().split(', ');
                        gpuInfo.nvidia = {
                            name: name.trim(),
                            memory: parseInt(memory) + ' MB',
                            driver: driver.trim(),
                            cuda: true
                        };
                        gpuInfo.detected = true;
                    }
                } catch (nvidiaError) {
                    // nvidia-smi not available
                }
            }

        } catch (error) {
            console.warn('Linux GPU detection failed:', error.message);
        }
    }

    /**
     * Detect NVIDIA GPU details
     */
    async detectNvidiaGPU() {
        try {
            const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits');
            if (stdout.trim()) {
                const [name, memory, driver] = stdout.trim().split(', ');
                return {
                    name: name.trim(),
                    memory: parseInt(memory) + ' MB',
                    driver: driver.trim(),
                    cuda: true,
                    webgpuCompatible: true
                };
            }
        } catch (error) {
            // Fallback to basic detection
            return {
                name: 'NVIDIA GPU (detected)',
                webgpuCompatible: true
            };
        }
        return null;
    }

    /**
     * Detect AMD GPU details
     */
    async detectAMDGPU() {
        // AMD GPU detection - basic for now
        return {
            name: 'AMD GPU (detected)',
            webgpuCompatible: true
        };
    }

    /**
     * Detect Intel GPU details
     */
    async detectIntelGPU() {
        // Intel GPU detection - basic for now
        return {
            name: 'Intel GPU (detected)',
            webgpuCompatible: true
        };
    }

    /**
     * Detect GPU on Windows systems
     */
    async detectWindowsGPU(gpuInfo) {
        try {
            const { stdout } = await execAsync('wmic path win32_VideoController get name,adapterram');
            // Parse Windows GPU info
            gpuInfo.detected = true;
        } catch (error) {
            console.warn('Windows GPU detection failed:', error.message);
        }
    }

    /**
     * Detect GPU on macOS systems
     */
    async detectMacGPU(gpuInfo) {
        try {
            const { stdout } = await execAsync('system_profiler SPDisplaysDataType');
            // Parse macOS GPU info
            gpuInfo.detected = true;
        } catch (error) {
            console.warn('macOS GPU detection failed:', error.message);
        }
    }

    /**
     * Get WebGPU support information
     */
    getWebGPUSupport() {
        return this.webgpuSupport;
    }

    /**
     * Check if WebGPU is likely supported based on server-side detection
     */
    isWebGPULikelySupported() {
        return this.webgpuSupport && 
               this.webgpuSupport.serverSupported && 
               this.webgpuSupport.supportLevel !== 'none';
    }

    /**
     * Get WebGPU performance estimate
     */
    estimateWebGPUPerformance() {
        if (!this.isWebGPULikelySupported()) {
            return null;
        }

        const gpuInfo = this.webgpuSupport.gpuInfo;
        let performanceMultiplier = 1;

        // Estimate based on GPU type
        if (gpuInfo?.nvidia) {
            performanceMultiplier = 8; // NVIDIA GPUs generally excellent for compute
        } else if (gpuInfo?.amd) {
            performanceMultiplier = 6; // AMD GPUs good for compute
        } else if (gpuInfo?.intel) {
            performanceMultiplier = 3; // Intel integrated GPUs moderate boost
        } else {
            performanceMultiplier = 4; // Unknown GPU, conservative estimate
        }

        // Adjust based on system memory
        const memoryGB = this.capabilities?.memory?.total / (1024 * 1024 * 1024) || 8;
        if (memoryGB >= 32) {
            performanceMultiplier *= 1.2;
        } else if (memoryGB >= 16) {
            performanceMultiplier *= 1.1;
        }

        const baseTimeSeconds = 28; // Current CPU time for 2000x3000 → 15x
        const estimatedWebGPUTime = baseTimeSeconds / performanceMultiplier;

        return {
            performanceMultiplier,
            estimatedTimeFor2000x3000_15x: Math.max(3, Math.round(estimatedWebGPUTime)), // Minimum 3 seconds
            supportLevel: this.webgpuSupport.supportLevel,
            confidence: gpuInfo?.detected ? 'high' : 'medium'
        };
    }
    
    analyzeCPU() {
        const cpus = os.cpus();
        
        return {
            cores: cpus.length,
            model: cpus[0]?.model || 'Unknown',
            speed: cpus[0]?.speed || 0,
            architecture: os.arch(),
            platform: os.platform()
        };
    }
    
    analyzeMemory() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        
        return {
            total: totalMemory,
            free: freeMemory,
            used: usedMemory,
            usagePercent: (usedMemory / totalMemory) * 100
        };
    }
    
    analyzePlatform() {
        return {
            platform: os.platform(),
            release: os.release(),
            type: os.type(),
            uptime: os.uptime(),
            nodeVersion: process.version
        };
    }
    
    getCapabilities() {
        return this.capabilities;
    }
    
    estimatePerformance(capabilities) {
        const { cpu, memory } = capabilities;
        
        // Estimate processing speed based on hardware
        let performanceScore = 1;
        
        // CPU cores factor
        performanceScore *= Math.min(cpu.cores / 4, 2); // Up to 2x boost for 4+ cores
        
        // Memory factor
        const memoryGB = memory.total / (1024 * 1024 * 1024);
        if (memoryGB >= 16) performanceScore *= 1.5;
        else if (memoryGB >= 8) performanceScore *= 1.2;
        
        // Estimate processing time for 600MP image
        const baseTimeSeconds = 8; // Conservative baseline
        const estimatedTime = baseTimeSeconds / performanceScore;
        
        return {
            score: performanceScore,
            estimatedTimeFor600MP: Math.round(estimatedTime * 1000), // milliseconds
            category: this.getPerformanceCategory(performanceScore)
        };
    }
    
    getPerformanceCategory(score) {
        if (score >= 2.0) return 'high-performance';
        if (score >= 1.5) return 'good-performance';
        if (score >= 1.0) return 'standard-performance';
        return 'budget-performance';
    }
    
    calculateOptimalChunkSize(imageWidth, imageHeight, scaleFactor) {
        const capabilities = this.getCapabilities();
        const availableMemory = capabilities.memory.free;
        
        // Use 60% of available memory for processing
        const processingMemory = availableMemory * 0.6;
        
        // Calculate maximum chunk size that fits in memory
        const outputPixels = imageWidth * imageHeight * scaleFactor * scaleFactor;
        const bytesPerPixel = 4; // RGBA
        const totalMemoryNeeded = outputPixels * bytesPerPixel;
        
        if (totalMemoryNeeded <= processingMemory) {
            // Can process entire image in memory
            return Math.max(imageWidth, imageHeight);
        }
        
        // Calculate chunk size that fits in available memory
        const maxChunkPixels = processingMemory / bytesPerPixel;
        const chunkSize = Math.floor(Math.sqrt(maxChunkPixels / (scaleFactor * scaleFactor)));
        
        return Math.max(512, Math.min(chunkSize, 2048)); // Clamp between 512 and 2048
    }
}

module.exports = HardwareDetector; 