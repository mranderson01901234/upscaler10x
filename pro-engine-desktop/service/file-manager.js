const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class FileManager {
    constructor() {
        this.outputDirectory = null;
    }
    
    async initialize() {
        // Create output directory in user's Downloads folder
        this.outputDirectory = path.join(os.homedir(), 'Downloads', 'ProUpscaler');
        
        try {
            await fs.mkdir(this.outputDirectory, { recursive: true });
            console.log(`📁 Output directory: ${this.outputDirectory}`);
        } catch (error) {
            console.error('Failed to create output directory:', error);
            // Fallback to temp directory
            this.outputDirectory = path.join(os.tmpdir(), 'ProUpscaler');
            await fs.mkdir(this.outputDirectory, { recursive: true });
        }
    }
    
    generateFileName(sessionId, format = 'png', extension = 'png') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `upscaled-${sessionId}-${timestamp}.${extension}`;
        
        console.log(`📁 Generated filename: ${filename} (${format.toUpperCase()} format)`);
        return filename;
    }
    
    async saveProcessedImage(imageData, sessionId) {
        try {
            // Handle new format object structure
            let imageBuffer = imageData.buffer || imageData;
            const format = imageData.format || 'png';
            const extension = imageData.extension || 'png';
            
            // Convert ArrayBuffer to Buffer if needed
            if (imageBuffer instanceof ArrayBuffer) {
                imageBuffer = Buffer.from(imageBuffer);
            }
            
            // Ensure we have a proper Buffer
            if (!Buffer.isBuffer(imageBuffer)) {
                imageBuffer = Buffer.from(imageBuffer);
            }
            
            const filename = this.generateFileName(sessionId, format, extension);
            const filepath = path.join(this.outputDirectory, filename);
            
            await fs.writeFile(filepath, imageBuffer);
            
            console.log(`💾 Saved processed image: ${filename} (${this.formatFileSize(imageBuffer.length)})`);
            console.log(`📊 File size: ${imageBuffer.length.toLocaleString()} bytes`);
            console.log(`📁 Format: ${format.toUpperCase()}`);
            
            return {
                filepath,
                filename,
                size: imageBuffer.length,
                format: format.toUpperCase()
            };
        } catch (error) {
            console.error('❌ Error saving processed image:', error);
            throw error;
        }
    }
    
    getOutputDirectory() {
        return this.outputDirectory;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) {
        // Clean up files older than maxAge (default 24 hours)
        try {
            const files = await fs.readdir(this.outputDirectory);
            const now = Date.now();
            
            for (const file of files) {
                const filePath = path.join(this.outputDirectory, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`🗑️ Cleaned up old file: ${file}`);
                }
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

module.exports = FileManager; 