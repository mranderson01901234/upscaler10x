const ImageProcessor = require('./image-processor');
const sharp = require('sharp');

async function testPixelLimits() {
    console.log('🧪 Testing Sharp Pixel Limits with 2000x3000 Base Image...');
    
    const processor = new ImageProcessor();
    await processor.initialize();
    
    // Create a 2000x3000 pixel test image (6MP base)
    console.log('🎨 Creating 2000x3000 test image...');
    const imageBuffer = await sharp({
        create: {
            width: 2000,
            height: 3000,
            channels: 3,
            background: { r: 100, g: 150, b: 200 } // Blue gradient
        }
    })
    .png({ compressionLevel: 1 }) // Fast compression for testing
    .toBuffer();
    
    console.log('📊 Test Image Buffer Size:', imageBuffer.length.toLocaleString(), 'bytes');
    console.log('📏 Base Image: 2000x3000 = 6,000,000 pixels (6MP)');
    
    // Test scenarios with realistic scale factors
    const testCases = [
        { name: 'Small Scale (1.5x) → 4.5K×6.75K = 30.4MP', scaleFactor: 1.5 },
        { name: 'Medium Scale (2x) → 4K×6K = 24MP', scaleFactor: 2 },
        { name: 'Large Scale (4x) → 8K×12K = 96MP', scaleFactor: 4 },
        { name: 'Very Large Scale (8x) → 16K×24K = 384MP', scaleFactor: 8 },
        { name: 'Target Scale (10x) → 20K×30K = 600MP ⚠️', scaleFactor: 10 },
        { name: 'Extreme Scale (15x) → 30K×45K = 1.35GP ⚠️⚠️', scaleFactor: 15 }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n🔍 Testing: ${testCase.name}`);
        console.log('=' .repeat(70));
        
        const startTime = Date.now();
        
        try {
            const result = await processor.processImage(
                imageBuffer, 
                testCase.scaleFactor,
                (progress) => {
                    console.log(`📈 Progress: ${progress.stage} - ${progress.progress}%`);
                }
            );
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            console.log(`✅ ${testCase.name} SUCCESS`);
            console.log(`📊 Output size: ${result.length.toLocaleString()} bytes`);
            console.log(`⏱️ Processing time: ${processingTime.toLocaleString()}ms`);
            console.log(`🚀 Speed: ${Math.round(result.length / processingTime / 1000).toLocaleString()} MB/s`);
            
        } catch (error) {
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            console.log(`❌ ${testCase.name} FAILED after ${processingTime}ms`);
            console.log(`🔍 Error: ${error.message}`);
            console.log(`🔍 Error type: ${error.constructor.name}`);
            
            // Log more details for debugging
            if (error.message.includes('limit') || error.message.includes('exceed')) {
                console.log('🚨 PIXEL LIMIT ERROR DETECTED!');
            }
        }
        
        // Add a small delay between tests to prevent memory issues
        console.log('⏳ Waiting 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🏁 Realistic Pixel Limit Testing Complete');
    console.log('📋 Summary: Testing 6MP base image scaled up to various sizes');
    console.log('🎯 Target: 10x scale = 600MP (the original problem scenario)');
}

// Run the test
testPixelLimits().catch(console.error); 