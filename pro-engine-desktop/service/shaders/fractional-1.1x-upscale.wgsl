// Fractional 1.1x Micro-Scaling Shader - WebGPU WGSL
// Ultra memory-efficient micro-scaling for memory-constrained environments
// Uses 1.21x memory instead of 4x memory (70% reduction vs 2x scaling)

@group(0) @binding(0) var<storage, read> inputImage: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputImage: array<f32>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // width, height, scale (1.1), channels

// Precision micro-interpolation for 1.1x scaling
fn microInterpolation(x: f32, y: f32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let x0 = i32(floor(x));
    let y0 = i32(floor(y));
    let x1 = x0 + 1;
    let y1 = y0 + 1;
    
    // High-precision fractional parts for micro-scaling
    let fx = x - f32(x0);
    let fy = y - f32(y0);
    
    // Ultra-smooth interpolation for small scale factors
    let sx = fx * fx * fx * (fx * (fx * 6.0 - 15.0) + 10.0);
    let sy = fy * fy * fy * (fy * (fy * 6.0 - 15.0) + 10.0);
    
    // Sample with bounds checking
    let p00 = sampleInput(x0, y0, channel, inputWidth, inputHeight, channels);
    let p10 = sampleInput(x1, y0, channel, inputWidth, inputHeight, channels);
    let p01 = sampleInput(x0, y1, channel, inputWidth, inputHeight, channels);
    let p11 = sampleInput(x1, y1, channel, inputWidth, inputHeight, channels);
    
    // High-quality bilinear interpolation
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

// Advanced micro-scaling with detail preservation
fn advancedMicroInterpolation(x: f32, y: f32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let x0 = i32(floor(x));
    let y0 = i32(floor(y));
    
    // Sample extended neighborhood for detail preservation
    let tl = sampleInput(x0 - 1, y0 - 1, channel, inputWidth, inputHeight, channels);
    let tm = sampleInput(x0, y0 - 1, channel, inputWidth, inputHeight, channels);
    let tr = sampleInput(x0 + 1, y0 - 1, channel, inputWidth, inputHeight, channels);
    let ml = sampleInput(x0 - 1, y0, channel, inputWidth, inputHeight, channels);
    let mm = sampleInput(x0, y0, channel, inputWidth, inputHeight, channels);
    let mr = sampleInput(x0 + 1, y0, channel, inputWidth, inputHeight, channels);
    let bl = sampleInput(x0 - 1, y0 + 1, channel, inputWidth, inputHeight, channels);
    let bm = sampleInput(x0, y0 + 1, channel, inputWidth, inputHeight, channels);
    let br = sampleInput(x0 + 1, y0 + 1, channel, inputWidth, inputHeight, channels);
    
    // Calculate local variation for adaptive interpolation
    let variation = abs(mm - (tl + tm + tr + ml + mr + bl + bm + br) / 8.0);
    
    // Fractional parts
    let fx = x - f32(x0);
    let fy = y - f32(y0);
    
    // Adaptive interpolation based on local variation
    var sx: f32;
    var sy: f32;
    
    if (variation > 0.1) {
        // High variation - use conservative interpolation
        sx = fx;
        sy = fy;
    } else {
        // Low variation - use smooth interpolation
        sx = fx * fx * fx * (fx * (fx * 6.0 - 15.0) + 10.0);
        sy = fy * fy * fy * (fy * (fy * 6.0 - 15.0) + 10.0);
    }
    
    // Bicubic-like interpolation using 3x3 neighborhood
    let row1 = mix(mix(tl, tm, sx), mix(tm, tr, sx), sx);
    let row2 = mix(mix(ml, mm, sx), mix(mm, mr, sx), sx);
    let row3 = mix(mix(bl, bm, sx), mix(bm, br, sx), sx);
    
    return mix(mix(row1, row2, sy), mix(row2, row3, sy), sy);
}

// Micro-enhancement for subtle quality improvement
fn microEnhancement(value: f32, x: f32, y: f32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let x0 = i32(floor(x));
    let y0 = i32(floor(y));
    
    // Sample local neighborhood
    let center = sampleInput(x0, y0, channel, inputWidth, inputHeight, channels);
    let right = sampleInput(x0 + 1, y0, channel, inputWidth, inputHeight, channels);
    let down = sampleInput(x0, y0 + 1, channel, inputWidth, inputHeight, channels);
    
    // Calculate local sharpness
    let sharpness = abs(center - (right + down) / 2.0);
    
    // Apply micro-enhancement based on sharpness
    let enhancement = 1.0 + (sharpness * 0.02); // Max 2% enhancement
    return clamp(value * enhancement, 0.0, 1.0);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let inputWidth = u32(params.x);
    let inputHeight = u32(params.y);
    let scaleFactor = params.z; // Should be 1.1
    let channels = u32(params.w);
    
    let outputWidth = u32(f32(inputWidth) * scaleFactor);
    let outputHeight = u32(f32(inputHeight) * scaleFactor);
    
    // Check bounds
    if (global_id.x >= outputWidth || global_id.y >= outputHeight) {
        return;
    }
    
    // Calculate input coordinates for 1.1x scaling
    let inputX = f32(global_id.x) / scaleFactor;
    let inputY = f32(global_id.y) / scaleFactor;
    
    // Determine processing method based on position precision
    let fx = inputX - floor(inputX);
    let fy = inputY - floor(inputY);
    let isNearExact = (fx < 0.01 || fx > 0.99) && (fy < 0.01 || fy > 0.99);
    
    // Process each channel
    for (var c = 0u; c < channels; c++) {
        var result: f32;
        
        if (isNearExact) {
            // Near-exact pixel - use direct sampling with micro-enhancement
            let x = i32(round(inputX));
            let y = i32(round(inputY));
            let directValue = sampleInput(x, y, c, inputWidth, inputHeight, channels);
            result = microEnhancement(directValue, inputX, inputY, c, inputWidth, inputHeight, channels);
        } else {
            // Sub-pixel position - use advanced micro-interpolation
            result = advancedMicroInterpolation(inputX, inputY, c, inputWidth, inputHeight, channels);
        }
        
        // Write to output
        let outputIndex = (global_id.y * outputWidth + global_id.x) * channels + c;
        outputImage[outputIndex] = result;
    }
} 