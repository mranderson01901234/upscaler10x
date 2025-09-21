class FileHandler {
    constructor() {
        this.supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/tiff', 'image/tif'];
        this.maxFileSize = 1024 * 1024 * 1024; // 1GB
    }
    
    validateFile(file) {
        if (!file) return false;
        if (!this.supportedTypes.includes(file.type)) return false;
        if (file.size > this.maxFileSize) return false;
        return true;
    }
    
    getFileSizeWarning(file) {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > 500) {
            return 'large'; // Files over 500MB may take several minutes to process
        } else if (sizeMB > 100) {
            return 'medium'; // Files over 100MB may take longer to process
        }
        return 'normal';
    }
    
    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const img = new Image();
            
            reader.onload = (e) => {
                img.onload = () => {
                    resolve({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        dataUrl: e.target.result,
                        file: file
                    });
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    
    downloadFile(result, filename = null) {
        const link = document.createElement('a');
        link.href = result.dataUrl;
        link.download = filename || `upscaled-${Date.now()}.${result.format}`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
