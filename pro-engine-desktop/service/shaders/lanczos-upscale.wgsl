// Lanczos Upscaling Shader - WebGPU WGSL
// High-quality Lanczos resampling for excellent detail preservation

@group(0) @binding(0) var<storage, read> inputImage: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputImage: array<f32>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // width, height, scale, channels

const PI: f32 = 3.14159265359;
const LANCZOS_SIZE: f32 = 3.0; // Lanczos-3 kernel

// Lanczos kernel function
fn lanczosWeight(x: f32, a: f32) -> f32 {
    if (x == 0.0) {
        return 1.0;
    }
    let ax = abs(x);
    if (ax < a) {
        let pix = PI * x;
        let sinc = sin(pix) / pix;
        let windowed = sin(pix / a) / (pix / a);
        return sinc * windowed;
    }
    return 0.0;
}

// Safe sine function (handles division by zero)
fn safeSinc(x: f32) -> f32 {
    if (abs(x) < 0.0001) {
        return 1.0;
    }
    return sin(x) / x;
}

// Sample input image with bounds checking
fn sampleInput(x: i32, y: i32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let clampedX = clamp(x, 0, i32(inputWidth - 1u));
    let clampedY = clamp(y, 0, i32(inputHeight - 1u));
    return inputImage[(u32(clampedY) * inputWidth + u32(clampedX)) * channels + channel];
}

// Optimized Lanczos weight calculation
fn lanczosWeightOptimized(x: f32) -> f32 {
    let ax = abs(x);
    if (ax >= LANCZOS_SIZE) {
        return 0.0;
    }
    if (ax < 0.0001) {
        return 1.0;
    }
    
    let pix = PI * x;
    let pixOverA = pix / LANCZOS_SIZE;
    
    return safeSinc(pix) * safeSinc(pixOverA);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let outputWidth = u32(params.x * params.z);
    let outputHeight = u32(params.y * params.z);
    
    // Check bounds
    if (global_id.x >= outputWidth || global_id.y >= outputHeight) {
        return;
    }
    
    // Calculate input coordinates
    let inputX = f32(global_id.x) / params.z;
    let inputY = f32(global_id.y) / params.z;
    
    let inputWidth = u32(params.x);
    let inputHeight = u32(params.y);
    let channels = u32(params.w);
    
    // Calculate sampling bounds
    let centerX = inputX;
    let centerY = inputY;
    let startX = i32(ceil(centerX - LANCZOS_SIZE));
    let endX = i32(floor(centerX + LANCZOS_SIZE));
    let startY = i32(ceil(centerY - LANCZOS_SIZE));
    let endY = i32(floor(centerY + LANCZOS_SIZE));
    
    // Clamp to input image bounds
    let clampedStartX = max(startX, 0);
    let clampedEndX = min(endX, i32(inputWidth - 1u));
    let clampedStartY = max(startY, 0);
    let clampedEndY = min(endY, i32(inputHeight - 1u));
    
    // Perform Lanczos resampling for each channel
    for (var c = 0u; c < channels; c++) {
        var sum = 0.0;
        var weightSum = 0.0;
        
        // Sample neighborhood with Lanczos kernel
        for (var sy = clampedStartY; sy <= clampedEndY; sy++) {
            for (var sx = clampedStartX; sx <= clampedEndX; sx++) {
                // Calculate distances
                let dx = centerX - f32(sx);
                let dy = centerY - f32(sy);
                
                // Calculate Lanczos weights
                let weightX = lanczosWeightOptimized(dx);
                let weightY = lanczosWeightOptimized(dy);
                let weight = weightX * weightY;
                
                // Skip if weight is negligible
                if (abs(weight) < 0.0001) {
                    continue;
                }
                
                // Sample pixel value
                let pixelValue = sampleInput(sx, sy, c, inputWidth, inputHeight, channels);
                
                sum += pixelValue * weight;
                weightSum += weight;
            }
        }
        
        // Normalize result
        var result = 0.0;
        if (abs(weightSum) > 0.0001) {
            result = sum / weightSum;
        }
        
        // Clamp to valid range
        let clampedResult = clamp(result, 0.0, 1.0);
        
        // Write to output
        outputImage[(global_id.y * outputWidth + global_id.x) * channels + c] = clampedResult;
    }
} 