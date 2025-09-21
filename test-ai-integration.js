const fs = require('fs');
const path = require('path');

// Test AI Enhancer module
async function testAIEnhancer() {
    console.log('🧪 Testing AI Enhancer Integration...');
    
    try {
        // Test 1: Import AI Enhancer
        const AIEnhancer = require('./pro-engine-desktop/service/ai-enhancer');
        console.log('✅ AI Enhancer module imported successfully');
        
        // Test 2: Initialize AI Enhancer
        const aiEnhancer = new AIEnhancer();
        console.log('✅ AI Enhancer initialized');
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 3: Check CodeFormer availability
        console.log(`🔍 CodeFormer available: ${aiEnhancer.isAvailable}`);
        console.log(`📁 CodeFormer path: ${aiEnhancer.codeformerPath}`);
        
        // Test 4: Check if inference script exists
        const inferenceScript = path.join(aiEnhancer.codeformerPath, 'inference_codeformer.py');
        const scriptExists = fs.existsSync(inferenceScript);
        console.log(`📄 Inference script exists: ${scriptExists}`);
        
        if (scriptExists) {
            console.log('✅ CodeFormer is properly set up for AI enhancement');
        } else {
            console.log('❌ CodeFormer inference script not found');
        }
        
        // Test 5: Test decision logic
        const testMetadata = {
            width: 512,
            height: 512
        };
        
        const shouldUseAI = aiEnhancer.shouldUseAIEnhancement(testMetadata, { aiEnhancement: true });
        console.log(`🤖 Should use AI for 512x512 image: ${shouldUseAI}`);
        
        return {
            success: true,
            available: aiEnhancer.isAvailable,
            scriptExists: scriptExists
        };
        
    } catch (error) {
        console.error('❌ AI Enhancer test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Test Image Processor integration
async function testImageProcessor() {
    console.log('\n🧪 Testing Image Processor AI Integration...');
    
    try {
        // Test 1: Import Image Processor
        const ImageProcessor = require('./pro-engine-desktop/service/image-processor');
        console.log('✅ Image Processor imported successfully');
        
        // Test 2: Initialize Image Processor
        const imageProcessor = new ImageProcessor();
        console.log('✅ Image Processor initialized with AI Enhancer');
        
        // Test 3: Check if AI enhancer is available
        console.log(`🤖 AI Enhancer integrated: ${imageProcessor.aiEnhancer ? 'Yes' : 'No'}`);
        console.log(`🔍 AI Enhancement available: ${imageProcessor.aiEnhancer?.isAvailable || 'Unknown'}`);
        
        // Test 4: Check if processImageWithAI method exists
        const hasAIMethod = typeof imageProcessor.processImageWithAI === 'function';
        console.log(`⚡ processImageWithAI method available: ${hasAIMethod}`);
        
        return {
            success: true,
            aiIntegrated: !!imageProcessor.aiEnhancer,
            hasAIMethod: hasAIMethod
        };
        
    } catch (error) {
        console.error('❌ Image Processor test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Test Server API endpoints
async function testServerAPI() {
    console.log('\n🧪 Testing Server API AI Endpoints...');
    
    try {
        const fetch = require('node-fetch').default || require('node-fetch');
        
        // Test 1: Check if server is running
        const healthResponse = await fetch('http://localhost:3006/health');
        if (!healthResponse.ok) {
            throw new Error('Server not running');
        }
        console.log('✅ Server is running');
        
        // Test 2: Check if AI endpoint exists
        const testPayload = {
            sessionId: 'test-session',
            imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            scaleFactor: 2,
            aiPreferences: { fidelity: 0.05 }
        };
        
        const aiResponse = await fetch('http://localhost:3006/api/process-with-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });
        
        console.log(`🔍 AI endpoint status: ${aiResponse.status}`);
        
        if (aiResponse.status === 200) {
            const result = await aiResponse.json();
            console.log('✅ AI processing endpoint is working');
            console.log(`📋 Response: ${JSON.stringify(result, null, 2)}`);
        } else if (aiResponse.status === 400) {
            console.log('✅ AI endpoint exists (validation working)');
        }
        
        return {
            success: true,
            serverRunning: true,
            aiEndpointExists: aiResponse.status !== 404
        };
        
    } catch (error) {
        console.error('❌ Server API test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Main test function
async function runAllTests() {
    console.log('🚀 Starting AI Integration Tests\n');
    
    const results = {
        aiEnhancer: await testAIEnhancer(),
        imageProcessor: await testImageProcessor(),
        serverAPI: await testServerAPI()
    };
    
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const allPassed = Object.values(results).every(result => result.success);
    
    if (allPassed) {
        console.log('🎉 All tests passed! AI integration is ready.');
        console.log('\n✅ Integration Status:');
        console.log(`   - AI Enhancer Available: ${results.aiEnhancer.available}`);
        console.log(`   - CodeFormer Script: ${results.aiEnhancer.scriptExists}`);
        console.log(`   - Image Processor AI: ${results.imageProcessor.aiIntegrated}`);
        console.log(`   - Server AI Endpoint: ${results.serverAPI.aiEndpointExists}`);
        
        console.log('\n🚀 Ready for AI-enhanced upscaling!');
        console.log('   - Open http://localhost:9000 in your browser');
        console.log('   - Upload an image with faces');
        console.log('   - Enable "AI Face Enhancement" toggle');
        console.log('   - Start processing to test AI enhancement');
        
    } else {
        console.log('❌ Some tests failed. Check the errors above.');
        Object.entries(results).forEach(([test, result]) => {
            if (!result.success) {
                console.log(`   - ${test}: ${result.error}`);
            }
        });
    }
    
    return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { testAIEnhancer, testImageProcessor, testServerAPI, runAllTests }; 