// Bilinear Upscaling Shader - WebGPU WGSL
// High-performance bilinear interpolation for image upscaling

@group(0) @binding(0) var<storage, read> inputImage: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputImage: array<f32>;
@group(0) @binding(2) var<uniform> params: vec4<f32>; // width, height, scale, channels

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
    
    // Get integer coordinates for sampling
    let x0 = u32(floor(inputX));
    let y0 = u32(floor(inputY));
    let x1 = min(x0 + 1u, u32(params.x - 1.0));
    let y1 = min(y0 + 1u, u32(params.y - 1.0));
    
    // Calculate interpolation weights
    let fx = inputX - f32(x0);
    let fy = inputY - f32(y0);
    
    let inputWidth = u32(params.x);
    let channels = u32(params.w);
    
    // Perform bilinear interpolation for each channel
    for (var c = 0u; c < channels; c++) {
        // Sample the four neighboring pixels
        let p00 = inputImage[(y0 * inputWidth + x0) * channels + c];
        let p10 = inputImage[(y0 * inputWidth + x1) * channels + c];
        let p01 = inputImage[(y1 * inputWidth + x0) * channels + c];
        let p11 = inputImage[(y1 * inputWidth + x1) * channels + c];
        
        // Bilinear interpolation
        let top = mix(p00, p10, fx);
        let bottom = mix(p01, p11, fx);
        let interpolated = mix(top, bottom, fy);
        
        // Write to output
        outputImage[(global_id.y * outputWidth + global_id.x) * channels + c] = interpolated;
    }
} 