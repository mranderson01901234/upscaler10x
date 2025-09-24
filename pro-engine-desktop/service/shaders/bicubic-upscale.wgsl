// Bicubic Upscaling Shader - WebGPU WGSL
// High-quality bicubic interpolation for superior image upscaling

@group(0) @binding(0) var<storage, read> inputImage: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputImage: array<f32>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // width, height, scale, channels

// Bicubic weight function (Catmull-Rom)
fn cubicWeight(x: f32) -> f32 {
    let ax = abs(x);
    if (ax <= 1.0) {
        return 1.5 * ax * ax * ax - 2.5 * ax * ax + 1.0;
    } else if (ax < 2.0) {
        return -0.5 * ax * ax * ax + 2.5 * ax * ax - 4.0 * ax + 2.0;
    }
    return 0.0;
}

// Sample input image with bounds checking
fn sampleInput(x: i32, y: i32, channel: u32, inputWidth: u32, inputHeight: u32, channels: u32) -> f32 {
    let clampedX = clamp(x, 0, i32(inputWidth - 1u));
    let clampedY = clamp(y, 0, i32(inputHeight - 1u));
    return inputImage[(u32(clampedY) * inputWidth + u32(clampedX)) * channels + channel];
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
    
    // Get base coordinates
    let baseX = i32(floor(inputX));
    let baseY = i32(floor(inputY));
    
    // Calculate fractional parts
    let fracX = inputX - f32(baseX);
    let fracY = inputY - f32(baseY);
    
    // Perform bicubic interpolation for each channel
    for (var c = 0u; c < channels; c++) {
        var sum = 0.0;
        var weightSum = 0.0;
        
        // Sample 4x4 neighborhood
        for (var dy = -1; dy <= 2; dy++) {
            for (var dx = -1; dx <= 2; dx++) {
                let sampleX = baseX + dx;
                let sampleY = baseY + dy;
                
                // Calculate bicubic weights
                let weightX = cubicWeight(f32(dx) - fracX);
                let weightY = cubicWeight(f32(dy) - fracY);
                let weight = weightX * weightY;
                
                // Sample pixel value
                let pixelValue = sampleInput(sampleX, sampleY, c, inputWidth, inputHeight, channels);
                
                sum += pixelValue * weight;
                weightSum += weight;
            }
        }
        
        // Normalize and clamp result
        let result = select(sum / weightSum, 0.0, weightSum == 0.0);
        let clampedResult = clamp(result, 0.0, 1.0);
        
        // Write to output
        outputImage[(global_id.y * outputWidth + global_id.x) * channels + c] = clampedResult;
    }
} 