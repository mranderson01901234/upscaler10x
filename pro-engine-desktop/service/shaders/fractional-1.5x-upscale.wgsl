// Fractional 1.5x Upscaling Shader - WebGPU WGSL
// Memory-efficient fractional scaling for high-scale image processing
// Uses 2.25x memory instead of 4x memory (50% reduction vs 2x scaling)

@group(0) @binding(0) var<storage, read> inputImage: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputImage: array<f32>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // width, height, scale (1.5), channels

// Enhanced fractional interpolation for 1.5x scaling
fn fractionalInterpolation(x: f32, y: f32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let x0 = i32(floor(x));
    let y0 = i32(floor(y));
    let x1 = x0 + 1;
    let y1 = y0 + 1;
    
    // Fractional parts
    let fx = x - f32(x0);
    let fy = y - f32(y0);
    
    // Optimized smooth step for 1.5x scaling
    let sx = fx * fx * (3.0 - 2.0 * fx);
    let sy = fy * fy * (3.0 - 2.0 * fy);
    
    // Sample with bounds checking
    let p00 = sampleInput(x0, y0, channel, inputWidth, inputHeight, channels);
    let p10 = sampleInput(x1, y0, channel, inputWidth, inputHeight, channels);
    let p01 = sampleInput(x0, y1, channel, inputWidth, inputHeight, channels);
    let p11 = sampleInput(x1, y1, channel, inputWidth, inputHeight, channels);
    
    // Bilinear interpolation with smooth step
    let top = mix(p00, p10, sx);
    let bottom = mix(p01, p11, sx);
    return mix(top, bottom, sy);
}

// Sample input with bounds checking
fn sampleInput(x: i32, y: i32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let clampedX = clamp(x, 0, i32(inputWidth - 1u));
    let clampedY = clamp(y, 0, i32(inputHeight - 1u));
    return inputImage[(u32(clampedY) * inputWidth + u32(clampedX)) * channels + channel];
}

// High-quality fractional scaling with edge enhancement
fn enhancedFractionalInterpolation(x: f32, y: f32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let x0 = i32(floor(x));
    let y0 = i32(floor(y));
    
    // Sample 3x3 neighborhood for quality enhancement
    let center = sampleInput(x0, y0, channel, inputWidth, inputHeight, channels);
    let right = sampleInput(x0 + 1, y0, channel, inputWidth, inputHeight, channels);
    let down = sampleInput(x0, y0 + 1, channel, inputWidth, inputHeight, channels);
    let diag = sampleInput(x0 + 1, y0 + 1, channel, inputWidth, inputHeight, channels);
    
    // Calculate local gradient for edge detection
    let gradX = abs(right - center);
    let gradY = abs(down - center);
    let edgeStrength = max(gradX, gradY);
    
    // Fractional parts
    let fx = x - f32(x0);
    let fy = y - f32(y0);
    
    // Adaptive interpolation based on edge strength
    var sx: f32;
    var sy: f32;
    
    if (edgeStrength > 0.15) {
        // Strong edge - use sharper interpolation
        sx = fx * fx * fx * (fx * (fx * 6.0 - 15.0) + 10.0);
        sy = fy * fy * fy * (fy * (fy * 6.0 - 15.0) + 10.0);
    } else {
        // Smooth area - use standard smooth step
        sx = fx * fx * (3.0 - 2.0 * fx);
        sy = fy * fy * (3.0 - 2.0 * fy);
    }
    
    // Perform interpolation
    let top = mix(center, right, sx);
    let bottom = mix(down, diag, sx);
    return mix(top, bottom, sy);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let inputWidth = u32(params.x);
    let inputHeight = u32(params.y);
    let scaleFactor = params.z; // Should be 1.5
    let channels = u32(params.w);
    
    let outputWidth = u32(f32(inputWidth) * scaleFactor);
    let outputHeight = u32(f32(inputHeight) * scaleFactor);
    
    // Check bounds
    if (global_id.x >= outputWidth || global_id.y >= outputHeight) {
        return;
    }
    
    // Calculate input coordinates for 1.5x scaling
    let inputX = f32(global_id.x) / scaleFactor;
    let inputY = f32(global_id.y) / scaleFactor;
    
    // Determine interpolation quality based on position
    let isExactPixel = (inputX == floor(inputX)) && (inputY == floor(inputY));
    
    // Process each channel
    for (var c = 0u; c < channels; c++) {
        var result: f32;
        
        if (isExactPixel) {
            // Direct copy for exact pixel positions with slight enhancement
            let x = i32(inputX);
            let y = i32(inputY);
            let directValue = sampleInput(x, y, c, inputWidth, inputHeight, channels);
            result = clamp(directValue * 1.01, 0.0, 1.0); // 1% enhancement
        } else {
            // Use enhanced fractional interpolation
            result = enhancedFractionalInterpolation(inputX, inputY, c, inputWidth, inputHeight, channels);
        }
        
        // Write to output
        let outputIndex = (global_id.y * outputWidth + global_id.x) * channels + c;
        outputImage[outputIndex] = result;
    }
} 