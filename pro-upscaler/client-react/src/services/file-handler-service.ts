interface ImageData {
  width: number;
  height: number;
  dataUrl: string;
  file: File;
  isDownscaled?: boolean;
  isLargeFile?: boolean;
  previewWidth?: number;
  previewHeight?: number;
  scale?: number;
}

export class FileHandlerService {
  private maxFileSize = 1.5 * 1024 * 1024 * 1024; // 1.5GB
  private supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/tiff', 'image/tif'];

  validateFile(file: File): boolean {
    // Check file size
    if (file.size > this.maxFileSize) {
      return false;
    }

    // Check file type
    if (!this.supportedTypes.includes(file.type.toLowerCase())) {
      return false;
    }

    return true;
  }

  getFileSizeWarning(file: File): 'small' | 'medium' | 'large' | 'extreme' {
    const sizeMB = file.size / (1024 * 1024);
    
    if (sizeMB > 500) {
      return 'extreme';
    } else if (sizeMB > 100) {
      return 'large';
    } else if (sizeMB > 50) {
      return 'medium';
    }
    
    return 'small';
  }

  shouldSkipBrowserPreview(file: File): boolean {
    const sizeMB = file.size / (1024 * 1024);
    return sizeMB > 1000 || file.type === 'image/tiff' || file.type === 'image/tif';
  }

  shouldDownscalePreview(file: File): boolean {
    const sizeMB = file.size / (1024 * 1024);
    return sizeMB > 100 && sizeMB <= 1000;
  }

  async loadImage(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height,
            dataUrl: e.target?.result as string,
            file: file
          });
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  async createDownscaledPreview(file: File, maxSize: number = 1024): Promise<ImageData> {
    const originalImageData = await this.loadImage(file);
    
    // Calculate scale factor to fit within maxSize
    const scale = Math.min(maxSize / originalImageData.width, maxSize / originalImageData.height, 1);
    
    if (scale >= 1) {
      // No downscaling needed
      return originalImageData;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }
    
    const previewWidth = Math.round(originalImageData.width * scale);
    const previewHeight = Math.round(originalImageData.height * scale);
    
    canvas.width = previewWidth;
    canvas.height = previewHeight;
    
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Use high quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, previewWidth, previewHeight);
        
        const previewDataUrl = canvas.toDataURL('image/png', 0.9);
        
        resolve({
          width: originalImageData.width,
          height: originalImageData.height,
          dataUrl: previewDataUrl,
          file: file,
          isDownscaled: true,
          previewWidth: previewWidth,
          previewHeight: previewHeight,
          scale: scale
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to create preview'));
      };
      
      img.src = originalImageData.dataUrl;
    });
  }

  async createTiffPreview(file: File): Promise<ImageData> {
    // For TIFF files, we'll need to use the desktop service to generate a preview
    // For now, return basic file info without preview
    const sizeMB = file.size / (1024 * 1024);
    
    return {
      width: 0, // Will be determined by desktop service
      height: 0, // Will be determined by desktop service
      dataUrl: '', // No preview available
      file: file,
      isLargeFile: true,
      previewWidth: 0,
      previewHeight: 0,
      scale: 0
    };
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
} 