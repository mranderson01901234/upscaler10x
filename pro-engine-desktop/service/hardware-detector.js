const os = require('os');
const fs = require('fs').promises;

class HardwareDetector {
    constructor() {
        this.capabilities = null;
    }
    
    async initialize() {
        this.capabilities = await this.detectSystemCapabilities();
        console.log('🔍 Hardware detection complete');
    }
    
    async detectSystemCapabilities() {
        const capabilities = {
            cpu: this.analyzeCPU(),
            memory: this.analyzeMemory(),
            platform: this.analyzePlatform(),
            timestamp: Date.now()
        };
        
        return capabilities;
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