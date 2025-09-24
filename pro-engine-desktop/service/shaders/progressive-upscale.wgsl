// Progressive Upscaling Shader - WebGPU WGSL
// High-quality 2x progressive scaling with advanced interpolation

@group(0) @binding(0) var<storage, read> inputImage: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputImage: array<f32>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // width, height, scale (always 2.0), channels

// Smooth step function for high-quality interpolation
fn smoothStep(x: f32) -> f32 {
    return x * x * (3.0 - 2.0 * x);
}

// Enhanced smooth step with better edge preservation
fn enhancedSmoothStep(x: f32) -> f32 {
    let x2 = x * x;
    let x3 = x2 * x;
    return x3 * (x * (x * 6.0 - 15.0) + 10.0);
}

// Sample input image with bounds checking
fn sampleInput(x: i32, y: i32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let clampedX = clamp(x, 0, i32(inputWidth - 1u));
    let clampedY = clamp(y, 0, i32(inputHeight - 1u));
    return inputImage[(u32(clampedY) * inputWidth + u32(clampedX)) * channels + channel];
}

// High-quality bicubic-like interpolation optimized for 2x scaling
fn progressiveInterpolation(inputX: f32, inputY: f32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let x0 = i32(floor(inputX));
    let y0 = i32(floor(inputY));
    let x1 = x0 + 1;
    let y1 = y0 + 1;
    
    // Calculate fractional parts
    let fx = inputX - f32(x0);
    let fy = inputY - f32(y0);
    
    // Use enhanced smooth step for better quality
    let sx = enhancedSmoothStep(fx);
    let sy = enhancedSmoothStep(fy);
    
    // Sample corner pixels
    let p00 = sampleInput(x0, y0, channel, inputWidth, inputHeight, channels);
    let p10 = sampleInput(x1, y0, channel, inputWidth, inputHeight, channels);
    let p01 = sampleInput(x0, y1, channel, inputWidth, inputHeight, channels);
    let p11 = sampleInput(x1, y1, channel, inputWidth, inputHeight, channels);
    
    // Perform smooth interpolation
    let top = mix(p00, p10, sx);
    let bottom = mix(p01, p11, sx);
    return mix(top, bottom, sy);
}

// Edge-aware interpolation for better detail preservation
fn edgeAwareInterpolation(inputX: f32, inputY: f32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let x0 = i32(floor(inputX));
    let y0 = i32(floor(inputY));
    
    // Sample 3x3 neighborhood for edge detection
    let center = sampleInput(x0, y0, channel, inputWidth, inputHeight, channels);
    let right = sampleInput(x0 + 1, y0, channel, inputWidth, inputHeight, channels);
    let down = sampleInput(x0, y0 + 1, channel, inputWidth, inputHeight, channels);
    let diag = sampleInput(x0 + 1, y0 + 1, channel, inputWidth, inputHeight, channels);
    
    // Calculate edge strength
    let edgeX = abs(right - center);
    let edgeY = abs(down - center);
    let edgeStrength = max(edgeX, edgeY);
    
    // Use different interpolation based on edge strength
    if (edgeStrength > 0.1) {
        // Strong edge - use sharper interpolation
        return progressiveInterpolation(inputX, inputY, channel, inputWidth, inputHeight, channels);
    } else {
        // Smooth area - use softer interpolation
        let fx = inputX - f32(x0);
        let fy = inputY - f32(y0);
        let sx = smoothStep(fx);
        let sy = smoothStep(fy);
        
        let top = mix(center, right, sx);
        let bottom = mix(down, diag, sx);
        return mix(top, bottom, sy);
    }
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let inputWidth = u32(params.x);
    let inputHeight = u32(params.y);
    let outputWidth = inputWidth * 2u;
    let outputHeight = inputHeight * 2u;
    let channels = u32(params.w);
    
    // Check bounds
    if (global_id.x >= outputWidth || global_id.y >= outputHeight) {
        return;
    }
    
    // Calculate input coordinates (2x scaling)
    let inputX = f32(global_id.x) * 0.5;
    let inputY = f32(global_id.y) * 0.5;
    
    // Determine interpolation method based on position
    let isHalfPixel = (global_id.x % 2u == 1u) || (global_id.y % 2u == 1u);
    
    // Process each channel
    for (var c = 0u; c < channels; c++) {
        var result: f32;
        
        if (isHalfPixel) {
            // Use edge-aware interpolation for sub-pixel positions
            result = edgeAwareInterpolation(inputX, inputY, c, inputWidth, inputHeight, channels);
        } else {
            // Direct copy for exact pixel positions with slight enhancement
            let x = i32(inputX);
            let y = i32(inputY);
            let directValue = sampleInput(x, y, c, inputWidth, inputHeight, channels);
            
            // Apply subtle enhancement for direct copies
            let enhancement = 1.02; // 2% enhancement
            result = clamp(directValue * enhancement, 0.0, 1.0);
        }
        
        // Write to output
        outputImage[(global_id.y * outputWidth + global_id.x) * channels + c] = result;
    }
} 