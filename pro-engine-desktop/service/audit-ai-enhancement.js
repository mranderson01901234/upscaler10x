const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function auditAIEnhancement() {
    console.log('🔍 AUDITING AI ENHANCEMENT PIPELINE\n');
    console.log('Tracing exactly what happens to the image at each step...\n');
    
    try {
        // Step 1: Load and analyze original image
        console.log('📋 STEP 1: Original Image Analysis');
        console.log('=====================================');
        
        const originalImagePath = '/home/mranderson/pro-upscaler-ai-research/test_input.jpg';
        const originalBuffer = fs.readFileSync(originalImagePath);
        const originalMetadata = await sharp(originalBuffer).metadata();
        
        console.log(`📁 Original file: ${originalImagePath}`);
        console.log(`📏 Original size: ${originalBuffer.length} bytes`);
        console.log(`📐 Original dimensions: ${originalMetadata.width}×${originalMetadata.height}`);
        console.log(`📊 Original format: ${originalMetadata.format}`);
        console.log(`🎨 Original channels: ${originalMetadata.channels}`);
        
        // Save original for comparison
        const originalCopyPath = '/tmp/audit_01_original.jpg';
        fs.writeFileSync(originalCopyPath, originalBuffer);
        console.log(`💾 Original saved: ${originalCopyPath}`);
        
        // Step 2: Test AI Enhancer directly
        console.log('\n📋 STEP 2: Direct AI Enhancement Test');
        console.log('=====================================');
        
        const AIEnhancer = require('./ai-enhancer');
        const aiEnhancer = new AIEnhancer();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`🤖 AI Enhancer available: ${aiEnhancer.isAvailable}`);
        console.log(`📁 CodeFormer path: ${aiEnhancer.codeformerPath}`);
        
        if (!aiEnhancer.isAvailable) {
            throw new Error('AI Enhancer not available');
        }
        
        // Test decision logic
        const shouldUseAI = aiEnhancer.shouldUseAIEnhancement(originalMetadata, { aiEnhancement: true });
        console.log(`🎯 Should use AI for this image: ${shouldUseAI}`);
        
        if (!shouldUseAI) {
            console.log('❌ AI enhancement would be skipped due to decision logic');
            console.log('📊 Image stats that affected decision:');
            console.log(`   - Pixels: ${originalMetadata.width * originalMetadata.height} (threshold: 50,000,000)`);
            console.log(`   - Aspect ratio: ${Math.max(originalMetadata.width, originalMetadata.height) / Math.min(originalMetadata.width, originalMetadata.height)} (threshold: 4.0)`);
        }
        
        // Step 3: Run AI enhancement and capture result
        console.log('\n📋 STEP 3: AI Enhancement Process');
        console.log('=====================================');
        
        const aiStartTime = Date.now();
        const aiEnhancedBuffer = await aiEnhancer.enhanceFace2x(originalBuffer);
        const aiProcessingTime = Date.now() - aiStartTime;
        
        const aiEnhancedMetadata = await sharp(aiEnhancedBuffer).metadata();
        
        console.log(`⏱️ AI processing time: ${aiProcessingTime}ms`);
        console.log(`📏 AI enhanced size: ${aiEnhancedBuffer.length} bytes`);
        console.log(`📐 AI enhanced dimensions: ${aiEnhancedMetadata.width}×${aiEnhancedMetadata.height}`);
        console.log(`📊 AI enhanced format: ${aiEnhancedMetadata.format}`);
        console.log(`🎨 AI enhanced channels: ${aiEnhancedMetadata.channels}`);
        console.log(`📈 Size change: ${((aiEnhancedBuffer.length / originalBuffer.length) * 100).toFixed(1)}%`);
        console.log(`📏 Dimension change: ${aiEnhancedMetadata.width / originalMetadata.width}x scaling`);
        
        // Save AI-enhanced result
        const aiEnhancedPath = '/tmp/audit_02_ai_enhanced.jpg';
        fs.writeFileSync(aiEnhancedPath, aiEnhancedBuffer);
        console.log(`💾 AI enhanced saved: ${aiEnhancedPath}`);
        
        // Step 4: Test what CodeFormer actually produced
        console.log('\n📋 STEP 4: CodeFormer Output Analysis');
        console.log('=====================================');
        
        // Check if the AI enhancement actually changed the image
        const originalHash = require('crypto').createHash('md5').update(originalBuffer).digest('hex');
        const aiHash = require('crypto').createHash('md5').update(aiEnhancedBuffer).digest('hex');
        
        console.log(`🔍 Original MD5: ${originalHash}`);
        console.log(`🔍 AI Enhanced MD5: ${aiHash}`);
        console.log(`🎯 Images are different: ${originalHash !== aiHash ? 'YES ✅' : 'NO ❌'}`);
        
        if (originalHash === aiHash) {
            console.log('❌ WARNING: AI enhancement produced identical output to input!');
        }
        
        // Step 5: Test the complete pipeline
        console.log('\n📋 STEP 5: Complete Pipeline Test (4x)');
        console.log('=====================================');
        
        const ImageProcessor = require('./image-processor');
        const imageProcessor = new ImageProcessor();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let progressLog = [];
        const pipelineStartTime = Date.now();
        
        const pipelineResult = await imageProcessor.processImageWithAI(
            originalBuffer,
            4, // 4x scaling
            (progress) => {
                progressLog.push(progress);
                console.log(`📊 Pipeline Progress: ${progress.stage} - ${progress.progress}% ${progress.aiEnhancementApplied ? '(AI Applied)' : ''}`);
            },
            { aiEnhancement: true }
        );
        
        const pipelineTime = Date.now() - pipelineStartTime;
        const finalMetadata = await sharp(pipelineResult.buffer).metadata();
        
        console.log(`⏱️ Total pipeline time: ${pipelineTime}ms`);
        console.log(`📏 Final size: ${pipelineResult.buffer.length} bytes`);
        console.log(`📐 Final dimensions: ${finalMetadata.width}×${finalMetadata.height}`);
        console.log(`📊 Final format: ${finalMetadata.format}`);
        
        // Save final result
        const finalPath = '/tmp/audit_03_final_4x.png';
        fs.writeFileSync(finalPath, pipelineResult.buffer);
        console.log(`💾 Final result saved: ${finalPath}`);
        
        // Step 6: Compare all stages
        console.log('\n📋 STEP 6: Stage Comparison');
        console.log('=====================================');
        
        console.log('📊 COMPARISON TABLE:');
        console.log('┌─────────────────┬──────────────┬─────────────────┬──────────────┐');
        console.log('│ Stage           │ Dimensions   │ File Size       │ Format       │');
        console.log('├─────────────────┼──────────────┼─────────────────┼──────────────┤');
        console.log(`│ Original        │ ${originalMetadata.width.toString().padEnd(4)}×${originalMetadata.height.toString().padEnd(7)} │ ${originalBuffer.length.toString().padEnd(15)} │ ${originalMetadata.format.padEnd(12)} │`);
        console.log(`│ AI Enhanced 2x  │ ${aiEnhancedMetadata.width.toString().padEnd(4)}×${aiEnhancedMetadata.height.toString().padEnd(7)} │ ${aiEnhancedBuffer.length.toString().padEnd(15)} │ ${aiEnhancedMetadata.format.padEnd(12)} │`);
        console.log(`│ Final 4x        │ ${finalMetadata.width.toString().padEnd(4)}×${finalMetadata.height.toString().padEnd(7)} │ ${pipelineResult.buffer.length.toString().padEnd(15)} │ ${finalMetadata.format.padEnd(12)} │`);
        console.log('└─────────────────┴──────────────┴─────────────────┴──────────────┘');
        
        // Step 7: Analyze what might be wrong
        console.log('\n📋 STEP 7: Issue Analysis');
        console.log('=====================================');
        
        const issues = [];
        
        // Check if AI enhancement was actually applied
        if (originalHash === aiHash) {
            issues.push('AI enhancement produced no change to the image');
        }
        
        // Check if dimensions are correct
        const expectedAIDimensions = originalMetadata.width * 2;
        if (aiEnhancedMetadata.width !== expectedAIDimensions) {
            issues.push(`AI enhancement dimension mismatch: expected ${expectedAIDimensions}×${expectedAIDimensions}, got ${aiEnhancedMetadata.width}×${aiEnhancedMetadata.height}`);
        }
        
        // Check if final dimensions are correct
        const expectedFinalDimensions = originalMetadata.width * 4;
        if (finalMetadata.width !== expectedFinalDimensions) {
            issues.push(`Final dimension mismatch: expected ${expectedFinalDimensions}×${expectedFinalDimensions}, got ${finalMetadata.width}×${finalMetadata.height}`);
        }
        
        // Check processing times
        if (aiProcessingTime < 1000) {
            issues.push(`AI processing too fast (${aiProcessingTime}ms) - might not be actually processing`);
        }
        
        // Check if AI was actually used in pipeline
        const aiProgressStages = progressLog.filter(p => p.stage === 'ai-complete' || p.aiEnhancementApplied);
        if (aiProgressStages.length === 0) {
            issues.push('No AI enhancement stages detected in pipeline progress');
        }
        
        if (issues.length === 0) {
            console.log('✅ No obvious issues detected');
            console.log('🔍 AI enhancement appears to be working correctly');
            console.log('📝 If you\'re not seeing visual improvements, it might be:');
            console.log('   - The test image doesn\'t have clear faces to enhance');
            console.log('   - CodeFormer parameters need adjustment');
            console.log('   - The enhancement is subtle and hard to notice');
        } else {
            console.log('❌ ISSUES DETECTED:');
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }
        
        // Step 8: Recommendations
        console.log('\n📋 STEP 8: Recommendations');
        console.log('=====================================');
        
        console.log('🔍 To verify AI enhancement is working:');
        console.log(`1. Compare these files visually:`);
        console.log(`   - Original: ${originalCopyPath}`);
        console.log(`   - AI Enhanced: ${aiEnhancedPath}`);
        console.log(`   - Final Result: ${finalPath}`);
        console.log('2. Look for face detail improvements in the AI enhanced version');
        console.log('3. Check if facial features are sharper/clearer');
        console.log('4. Verify the enhancement carries through to the final result');
        
        return {
            originalBuffer,
            aiEnhancedBuffer,
            finalBuffer: pipelineResult.buffer,
            issues,
            metadata: {
                original: originalMetadata,
                aiEnhanced: aiEnhancedMetadata,
                final: finalMetadata
            },
            timings: {
                aiProcessing: aiProcessingTime,
                totalPipeline: pipelineTime
            }
        };
        
    } catch (error) {
        console.error('❌ Audit failed:', error);
        throw error;
    }
}

if (require.main === module) {
    auditAIEnhancement().catch(console.error);
}

module.exports = { auditAIEnhancement }; 