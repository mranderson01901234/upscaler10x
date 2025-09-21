const fs = require('fs');
const path = require('path');
const ImageProcessor = require('./image-processor.js');

async function performanceTest() {
    console.log('🧪 Pro Engine Performance Test - Multi-Threading Optimization');
    console.log('=' .repeat(60));
    
    // Initialize the optimized image processor
    const processor = new ImageProcessor();
    await processor.initialize();
    
    console.log('\n📊 Test Configuration:');
    console.log('- Base image: 2000x3000 (6.0MP)');
    console.log('- Test scenarios: 96MP equivalent, 384MP equivalent');
    
    // Load the test image
    const testImagePath = '/tmp/test-2000x3000.png';
    if (!fs.existsSync(testImagePath)) {
        console.error('❌ Test image not found:', testImagePath);
        return;
    }
    
    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`✅ Loaded test image: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
    
    console.log('\n' + '='.repeat(60));
    
    // Test 1: 96MP equivalent (scale factor ~4.0)
    // Original: 2000x3000 = 6MP
    // Target: ~96MP means scale factor = sqrt(96/6) = 4.0
    console.log('🧪 TEST 1: 96MP Equivalent (9.8K×9.8K baseline)');
    console.log('Scale factor: 4.0 (2000×3000 → 8000×12000 = 96MP)');
    
    const scaleFactor1 = 4.0;
    const startTime1 = Date.now();
    
    try {
        const result1 = await processor.processImage(imageBuffer, scaleFactor1, (progress) => {
            console.log(`📈 Progress: ${progress.stage} - ${progress.progress}%`);
        });
        
        const endTime1 = Date.now();
        const processingTime1 = endTime1 - startTime1;
        
        console.log(`✅ Test 1 completed in: ${processingTime1}ms (${(processingTime1/1000).toFixed(1)}s)`);
        console.log(`📁 Output size: ${(result1.length / 1024 / 1024).toFixed(1)} MB`);
        
        // Save result for verification
        const outputPath1 = `/tmp/test-96mp-equivalent-${Date.now()}.png`;
        fs.writeFileSync(outputPath1, result1);
        console.log(`💾 Saved result: ${outputPath1}`);
        
    } catch (error) {
        console.error('❌ Test 1 failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Test 2: 384MP equivalent (scale factor ~8.0)
    // Original: 2000x3000 = 6MP  
    // Target: ~384MP means scale factor = sqrt(384/6) = 8.0
    console.log('🧪 TEST 2: 384MP Equivalent (19.6K×19.6K baseline)');
    console.log('Scale factor: 8.0 (2000×3000 → 16000×24000 = 384MP)');
    
    const scaleFactor2 = 8.0;
    const startTime2 = Date.now();
    
    try {
        const result2 = await processor.processImage(imageBuffer, scaleFactor2, (progress) => {
            console.log(`📈 Progress: ${progress.stage} - ${progress.progress}%`);
        });
        
        const endTime2 = Date.now();
        const processingTime2 = endTime2 - startTime2;
        
        console.log(`✅ Test 2 completed in: ${processingTime2}ms (${(processingTime2/1000).toFixed(1)}s)`);
        console.log(`📁 Output size: ${(result2.length / 1024 / 1024).toFixed(1)} MB`);
        
        // Save result for verification
        const outputPath2 = `/tmp/test-384mp-equivalent-${Date.now()}.png`;
        fs.writeFileSync(outputPath2, result2);
        console.log(`💾 Saved result: ${outputPath2}`);
        
    } catch (error) {
        console.error('❌ Test 2 failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PERFORMANCE SUMMARY:');
    console.log('Expected improvements with multi-threading:');
    console.log('- 96MP: Baseline 6s → Target 2-3s');  
    console.log('- 384MP: Baseline 25s → Target 8-15s');
    console.log('- System: AMD Ryzen 5 3550H (8 cores)');
    console.log('=' .repeat(60));
}

// Run the test
performanceTest().catch(console.error); 