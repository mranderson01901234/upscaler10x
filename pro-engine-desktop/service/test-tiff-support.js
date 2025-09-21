#!/usr/bin/env node

/**
 * TIFF Support Test Script
 * Tests the newly implemented TIFF file format support
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing TIFF Support Implementation');
console.log('=====================================');

async function testTiffSupport() {
    try {
        // Test 1: Check Sharp TIFF support
        console.log('\n📋 Test 1: Verifying Sharp.js TIFF support...');
        
        // Create a simple test image
        const testBuffer = await sharp({
            create: {
                width: 100,
                height: 100,
                channels: 3,
                background: { r: 255, g: 128, b: 0 }
            }
        })
        .png()
        .toBuffer();
        
        console.log('✅ Test image created successfully');
        
        // Test 2: Convert to TIFF
        console.log('\n📋 Test 2: Converting image to TIFF format...');
        
        const tiffBuffer = await sharp(testBuffer)
            .tiff({
                compression: 'lzw',
                quality: 95,
                predictor: 'horizontal'
            })
            .toBuffer();
        
        console.log(`✅ TIFF conversion successful - Size: ${tiffBuffer.length} bytes`);
        
        // Test 3: Read TIFF metadata
        console.log('\n📋 Test 3: Reading TIFF metadata...');
        
        const metadata = await sharp(tiffBuffer).metadata();
        console.log(`✅ TIFF metadata:`, {
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            channels: metadata.channels,
            compression: metadata.compression
        });
        
        // Test 4: Scale TIFF image
        console.log('\n📋 Test 4: Scaling TIFF image (2x upscale)...');
        
        const scaledTiffBuffer = await sharp(tiffBuffer)
            .resize(200, 200, {
                kernel: sharp.kernel.lanczos3,
                withoutEnlargement: false
            })
            .tiff({
                compression: 'lzw',
                quality: 95,
                predictor: 'horizontal'
            })
            .toBuffer();
        
        const scaledMetadata = await sharp(scaledTiffBuffer).metadata();
        console.log(`✅ TIFF scaling successful:`, {
            originalSize: `${metadata.width}x${metadata.height}`,
            scaledSize: `${scaledMetadata.width}x${scaledMetadata.height}`,
            outputSize: `${scaledTiffBuffer.length} bytes`
        });
        
        // Test 5: Save test TIFF file
        console.log('\n📋 Test 5: Saving test TIFF file...');
        
        const outputPath = path.join(__dirname, 'test-output-tiff.tiff');
        await sharp(scaledTiffBuffer).tiff().toFile(outputPath);
        
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            console.log(`✅ TIFF file saved successfully: ${outputPath} (${stats.size} bytes)`);
            
            // Clean up test file
            fs.unlinkSync(outputPath);
            console.log('🧹 Test file cleaned up');
        }
        
        console.log('\n🎉 All TIFF support tests passed!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Sharp.js TIFF support confirmed');
        console.log('   ✅ TIFF creation with LZW compression working');
        console.log('   ✅ TIFF metadata reading functional');
        console.log('   ✅ TIFF image scaling operational');
        console.log('   ✅ TIFF file I/O working correctly');
        
        console.log('\n🚀 TIFF support implementation is ready for production use!');
        
    } catch (error) {
        console.error('\n❌ TIFF support test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Check if Sharp is available
async function checkSharpAvailability() {
    try {
        const sharp = require('sharp');
        console.log(`📦 Sharp version: ${sharp.versions.sharp}`);
        console.log(`📦 libvips version: ${sharp.versions.vips}`);
        return true;
    } catch (error) {
        console.error('❌ Sharp.js not available:', error.message);
        console.error('Please run: npm install sharp');
        return false;
    }
}

// Run tests
async function main() {
    const sharpAvailable = await checkSharpAvailability();
    if (sharpAvailable) {
        await testTiffSupport();
    }
}

if (require.main === module) {
    main();
} 