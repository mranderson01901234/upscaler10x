const fs = require('fs');
const path = require('path');

async function debugAIProcessing() {
    console.log('🔍 Debugging AI Processing Pipeline...\n');
    
    try {
        // Test 1: Direct AI Enhancer test
        console.log('📋 Step 1: Testing AI Enhancer directly...');
        const AIEnhancer = require('./pro-engine-desktop/service/ai-enhancer');
        const aiEnhancer = new AIEnhancer();
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`🔍 CodeFormer available: ${aiEnhancer.isAvailable}`);
        console.log(`📁 CodeFormer path: ${aiEnhancer.codeformerPath}`);
        
        if (!aiEnhancer.isAvailable) {
            console.log('❌ AI Enhancer not available - stopping debug');
            return;
        }
        
        // Test 2: Create a small test image
        console.log('\n📋 Step 2: Creating test image...');
        const testImagePath = '/tmp/test_face.jpg';
        
        // Check if we have a test image in CodeFormer
        const codeformerTestImages = [
            '/home/mranderson/pro-upscaler-ai-research/CodeFormer/inputs/cropped_faces/Julia_Roberts_0002.jpg',
            '/home/mranderson/pro-upscaler-ai-research/test_input.jpg',
            '/home/mranderson/pro-upscaler-ai-research/CodeFormer/inputs/whole_imgs/test.jpg'
        ];
        
        let testImage = null;
        for (const imagePath of codeformerTestImages) {
            if (fs.existsSync(imagePath)) {
                testImage = imagePath;
                console.log(`✅ Found test image: ${imagePath}`);
                break;
            }
        }
        
        if (!testImage) {
            console.log('❌ No test images found, creating minimal test...');
            // Create a minimal 1x1 test image buffer
            const minimalImageBuffer = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
                0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
                0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x11, 0x08,
                0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03,
                0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08,
                0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA,
                0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00,
                0x80, 0xFF, 0xD9
            ]);
            
            // Test with the minimal buffer
            console.log('\n📋 Step 3: Testing AI enhancement with minimal image...');
            try {
                const result = await aiEnhancer.enhanceFace2x(minimalImageBuffer);
                console.log(`✅ AI enhancement succeeded! Output size: ${result.length} bytes`);
            } catch (aiError) {
                console.log(`❌ AI enhancement failed: ${aiError.message}`);
                console.log('🔍 Error details:', aiError);
                
                // Let's test CodeFormer directly
                console.log('\n📋 Step 4: Testing CodeFormer directly...');
                await testCodeFormerDirect();
            }
        } else {
            // Test with real image
            console.log('\n📋 Step 3: Testing AI enhancement with real image...');
            const imageBuffer = fs.readFileSync(testImage);
            console.log(`📏 Test image size: ${imageBuffer.length} bytes`);
            
            try {
                const result = await aiEnhancer.enhanceFace2x(imageBuffer);
                console.log(`✅ AI enhancement succeeded! Output size: ${result.length} bytes`);
                
                // Save result for inspection
                const outputPath = '/tmp/ai_debug_output.jpg';
                fs.writeFileSync(outputPath, result);
                console.log(`💾 Result saved to: ${outputPath}`);
                
            } catch (aiError) {
                console.log(`❌ AI enhancement failed: ${aiError.message}`);
                console.log('🔍 Error details:', aiError);
                
                // Test CodeFormer directly
                console.log('\n📋 Step 4: Testing CodeFormer directly...');
                await testCodeFormerDirect();
            }
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

async function testCodeFormerDirect() {
    console.log('🧪 Testing CodeFormer directly via command line...');
    
    const { spawn } = require('child_process');
    const codeformerPath = '/home/mranderson/pro-upscaler-ai-research/CodeFormer';
    
    // Test if we can run CodeFormer at all
    const testCmd = spawn('python', ['-c', 'import cv2; print("OpenCV available")'], {
        cwd: codeformerPath,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    testCmd.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    testCmd.stderr.on('data', (data) => {
        error += data.toString();
    });
    
    testCmd.on('close', (code) => {
        console.log(`🔍 Python test exit code: ${code}`);
        if (output) console.log(`📤 Output: ${output.trim()}`);
        if (error) console.log(`❌ Error: ${error.trim()}`);
        
        if (code === 0) {
            console.log('✅ Python environment seems OK');
        } else {
            console.log('❌ Python environment issues detected');
        }
    });
}

// Test the Image Processor integration
async function testImageProcessorIntegration() {
    console.log('\n📋 Testing Image Processor AI Integration...');
    
    try {
        const ImageProcessor = require('./pro-engine-desktop/service/image-processor');
        const imageProcessor = new ImageProcessor();
        
        // Wait for AI enhancer to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`🤖 AI Enhancer available: ${imageProcessor.aiEnhancer?.isAvailable}`);
        
        // Test the decision logic
        const testMetadata = {
            width: 512,
            height: 512,
            format: 'jpeg'
        };
        
        const shouldUseAI = imageProcessor.aiEnhancer.shouldUseAIEnhancement(testMetadata, { aiEnhancement: true });
        console.log(`🔍 Should use AI for 512x512 image: ${shouldUseAI}`);
        
        if (shouldUseAI && imageProcessor.aiEnhancer.isAvailable) {
            console.log('✅ Image Processor AI integration looks good');
        } else {
            console.log('❌ Image Processor AI integration issue');
        }
        
    } catch (error) {
        console.error('❌ Image Processor test failed:', error.message);
    }
}

// Run all debug tests
async function runDebug() {
    console.log('🚀 Starting AI Processing Debug\n');
    
    await debugAIProcessing();
    await testImageProcessorIntegration();
    
    console.log('\n🎯 Debug Complete!');
    console.log('Check the output above for any issues with the AI processing pipeline.');
}

if (require.main === module) {
    runDebug().catch(console.error);
}

module.exports = { debugAIProcessing, testCodeFormerDirect, testImageProcessorIntegration }; 