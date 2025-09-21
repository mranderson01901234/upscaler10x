const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class AIEnhancer {
    constructor() {
        this.codeformerPath = '/home/mranderson/pro-upscaler-ai-research/CodeFormer';
        this.isAvailable = false;
        this.initializeService();
    }
    
    async initializeService() {
        try {
            // Check if CodeFormer is available
            const inferenceScript = path.join(this.codeformerPath, 'inference_codeformer.py');
            await fs.access(inferenceScript);
            
            // Check GPU availability
            await this.checkGPUStatus();
            
            this.isAvailable = true;
            console.log('✅ AI Enhancement (CodeFormer) available');
        } catch (error) {
            console.log('⚠️ AI Enhancement not available:', error.message);
            this.isAvailable = false;
        }
    }
    
    async checkGPUStatus() {
        try {
            const pythonPath = '/home/mranderson/pro-upscaler-ai-research/ai-research-env/bin/python';
            const { spawn } = require('child_process');
            
            return new Promise((resolve) => {
                const python = spawn(pythonPath, [
                    '-c', 
                    'import torch; print(f"GPU Available: {torch.cuda.is_available()}"); print(f"GPU Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \'CPU Only\'}")'
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                
                let output = '';
                python.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                python.on('close', () => {
                    if (output.includes('GPU Available: True')) {
                        console.log('🚀 AI Enhancement: GPU acceleration enabled');
                        console.log(`📊 ${output.trim().split('\n').join(', ')}`);
                    } else {
                        console.log('⚠️ AI Enhancement: Running in CPU mode');
                    }
                    resolve();
                });
                
                python.on('error', () => {
                    console.log('⚠️ AI Enhancement: Could not check GPU status');
                    resolve();
                });
            });
        } catch (error) {
            console.log('⚠️ AI Enhancement: GPU status check failed');
        }
    }
    
    shouldUseAIEnhancement(metadata, userPreferences = {}) {
        // Smart detection for when to use AI enhancement
        const pixels = metadata.width * metadata.height;
        const aspectRatio = Math.max(metadata.width, metadata.height) / Math.min(metadata.width, metadata.height);
        
        // Use AI enhancement for:
        // 1. Portrait-style images (likely to contain faces)
        // 2. When user explicitly requests it
        // 3. Reasonable size for face processing
        
        const isPortraitCandidate = (
            pixels < 50000000 &&  // Under 50MP (reasonable for face images)
            aspectRatio < 4.0     // Not ultra-wide panoramic
        );
        
        const userWantsAI = userPreferences.aiEnhancement !== false; // Default to true
        
        const shouldUse = isPortraitCandidate && userWantsAI && this.isAvailable;
        
        console.log(`🤖 AI Enhancement decision: ${shouldUse ? 'ENABLED' : 'DISABLED'} (${(pixels/1000000).toFixed(1)}MP, ratio: ${aspectRatio.toFixed(2)})`);
        
        return shouldUse;
    }
    
    async enhanceFace2x(imageBuffer) {
        if (!this.isAvailable) {
            throw new Error('AI Enhancement service not available');
        }
        
        const tempInput = path.join(os.tmpdir(), `ai_input_${Date.now()}.jpg`);
        const tempOutputDir = path.join(os.tmpdir(), `ai_output_${Date.now()}`);
        
        try {
            // Write input buffer to temp file
            await fs.writeFile(tempInput, imageBuffer);
            
            // Create output directory
            await fs.mkdir(tempOutputDir, { recursive: true });
            
            // Run CodeFormer for face enhancement only (no upscaling)
            const result = await this.runCodeFormer(tempInput, tempOutputDir);
            
            if (!result.success) {
                throw new Error(`CodeFormer failed: ${result.error}`);
            }
            
            // Check if CodeFormer detected faces
            if (result.noFacesDetected) {
                console.log('⚠️ CodeFormer detected no faces, falling back to traditional 2x upscaling');
                // Use Sharp for traditional 2x upscaling when no faces are detected
                const sharp = require('sharp');
                const metadata = await sharp(imageBuffer).metadata();
                
                const upscaledBuffer = await sharp(imageBuffer)
                    .resize(metadata.width * 2, metadata.height * 2, {
                        kernel: sharp.kernel.lanczos3,
                        withoutEnlargement: false
                    })
                    .png({ quality: 95 })
                    .toBuffer();
                
                console.log(`✅ Traditional 2x upscaling completed (no faces detected)`);
                return upscaledBuffer;
            }
            
            // Read enhanced result - CodeFormer has built-in upscaling
            const enhancedBuffer = await this.readCodeFormerOutput(tempOutputDir);
            
            // Check what CodeFormer actually produced
            const sharp = require('sharp');
            const enhancedMetadata = await sharp(enhancedBuffer).metadata();
            
            console.log(`✅ AI face enhancement completed in ${result.processingTime}ms`);
            console.log(`📏 CodeFormer output dimensions: ${enhancedMetadata.width}×${enhancedMetadata.height}`);
            
            // Return CodeFormer's output as-is (it has its own upscaling)
            return enhancedBuffer;
            
        } finally {
            // Cleanup temp files
            try {
                await fs.unlink(tempInput);
                await fs.rm(tempOutputDir, { recursive: true, force: true });
            } catch (cleanupError) {
                console.log('⚠️ Cleanup warning:', cleanupError.message);
            }
        }
    }
    
    runCodeFormer(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            // Use the Python from the virtual environment
            const pythonPath = '/home/mranderson/pro-upscaler-ai-research/ai-research-env/bin/python';
            
            // Optimized CodeFormer command - just face enhancement
            const python = spawn(pythonPath, [
                'inference_codeformer.py',
                '-w', '0.05',  // Optimized fidelity parameter (tested)
                '--input_path', inputPath,
                '--output_path', outputPath
                // NO upscaling flags - Pro Engine will handle all scaling
            ], {
                cwd: this.codeformerPath,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    // Enable GPU acceleration - let CodeFormer auto-detect best device
                    PYTORCH_CUDA_ALLOC_CONF: 'max_split_size_mb:512'
                }
            });
            
            let stdout = '';
            let stderr = '';
            
            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            python.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            python.on('close', (code) => {
                const processingTime = Date.now() - startTime;
                
                if (code === 0) {
                    // Check if CodeFormer detected faces
                    const noFacesDetected = stdout.includes('detect 0 faces');
                    
                    // Log performance metrics
                    const isUsingGPU = stderr.includes('cuda') || stdout.includes('cuda') || processingTime < 10000;
                    console.log(`⚡ AI Enhancement Performance: ${processingTime}ms ${isUsingGPU ? '(GPU)' : '(CPU)'}`);
                    
                    resolve({
                        success: true,
                        processingTime: processingTime,
                        stdout: stdout,
                        noFacesDetected: noFacesDetected,
                        usingGPU: isUsingGPU
                    });
                } else {
                    resolve({
                        success: false,
                        error: stderr || `Process exited with code ${code}`,
                        processingTime: processingTime
                    });
                }
            });
            
            python.on('error', (error) => {
                reject(new Error(`Failed to start CodeFormer: ${error.message}`));
            });
            
            // Set timeout for AI processing (30 seconds for GPU mode)
            setTimeout(() => {
                python.kill();
                reject(new Error('AI enhancement timeout after 30 seconds'));
            }, 30000);
        });
    }
    
    async readCodeFormerOutput(outputDir) {
        // CodeFormer saves results in final_results subdirectory
        const finalResultsDir = path.join(outputDir, 'final_results');
        
        try {
            const files = await fs.readdir(finalResultsDir);
            const imageFiles = files.filter(file => 
                file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
            );
            
            if (imageFiles.length === 0) {
                throw new Error('No output images found in final_results');
            }
            
            // Read the first image file
            const outputPath = path.join(finalResultsDir, imageFiles[0]);
            const outputBuffer = await fs.readFile(outputPath);
            
            return outputBuffer;
            
        } catch (error) {
            throw new Error(`Failed to read CodeFormer output: ${error.message}`);
        }
    }
}

module.exports = AIEnhancer; 