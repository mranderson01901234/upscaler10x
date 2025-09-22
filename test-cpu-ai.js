/**
 * Test AI Processing in CPU Mode
 */

const fs = require('fs');
const http = require('http');

// Test with a small image
const testImagePath = '/home/mranderson/pro-upscaler-ai-research/real_image_test.jpg';

if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found');
    process.exit(1);
}

const imageBuffer = fs.readFileSync(testImagePath);
const imageData = imageBuffer.toString('base64');

const requestData = JSON.stringify({
    sessionId: `cpu_test_${Date.now()}`,
    imageData: imageData,
    scaleFactor: 2,  // Smaller scale for CPU test
    format: 'png',
    quality: 95,
    aiPreferences: {
        aiEnhancement: true
    }
});

const options = {
    hostname: 'localhost',
    port: 3006,
    path: '/api/process-with-ai',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
    }
};

console.log('🧪 Testing AI Enhancement in CPU Mode...');
console.log(`📊 Image size: ${imageBuffer.length} bytes`);
console.log('⏳ Processing...');

const startTime = Date.now();

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            const elapsed = Date.now() - startTime;
            
            console.log('✅ AI Processing Request Successful:');
            console.log(`   Session ID: ${result.sessionId}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Request Time: ${elapsed}ms`);
            console.log('');
            console.log('👀 Monitor the Pro Engine console for processing details');
            console.log('📁 Check /home/mranderson/Downloads/ProUpscaler/ for output');
            
        } catch (error) {
            console.error('❌ Response parsing error:', error.message);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.write(requestData);
req.end(); 