/**
 * WebGPU Detector - Client-Side WebGPU Capability Detection
 * Detects browser WebGPU support, GPU adapters, memory limits, and feature matrix
 */

class WebGPUDetector {
    constructor() {
        this.webgpuSupport = null;
        this.detectionComplete = false;
        this.adapters = [];
        this.preferredAdapter = null;
    }

    /**
     * Initialize WebGPU detection
     */
    async initialize() {
        console.log('🔍 Initializing WebGPU detection...');
        
        try {
            this.webgpuSupport = await this.detectWebGPUSupport();
            this.detectionComplete = true;
            
            console.log('✅ WebGPU detection complete:', this.webgpuSupport);
            return this.webgpuSupport;
        } catch (error) {
            console.error('❌ WebGPU detection failed:', error);
            this.webgpuSupport = this.createUnsupportedResult(error);
            this.detectionComplete = true;
            return this.webgpuSupport;
        }
    }

    /**
     * Main WebGPU support detection
     */
    async detectWebGPUSupport() {
        const result = {
            supported: false,
            browserSupport: this.checkBrowserSupport(),
            adapters: [],
            preferredAdapter: null,
            capabilities: null,
            memoryLimits: null,
            featureSupport: {},
            performanceEstimate: null,
            detectionTimestamp: Date.now(),
            userAgent: navigator.userAgent,
            errors: []
        };

        // Check basic browser support
        if (!result.browserSupport.supported) {
            result.errors.push('Browser does not support WebGPU');
            return result;
        }

        try {
            // Request WebGPU adapter
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });

            if (!adapter) {
                result.errors.push('No WebGPU adapter available');
                return result;
            }

            // Get adapter info
            result.adapters = await this.enumerateAdapters();
            result.preferredAdapter = await this.analyzeAdapter(adapter);

            // Request device to test capabilities
            const device = await adapter.requestDevice();
            
            if (device) {
                result.capabilities = await this.detectCapabilities(adapter, device);
                result.memoryLimits = await this.detectMemoryLimits(adapter, device);
                result.featureSupport = await this.detectFeatureSupport(adapter, device);
                result.performanceEstimate = this.estimatePerformance(result);
                result.supported = true;

                // Clean up
                device.destroy();
            }

        } catch (error) {
            result.errors.push(`WebGPU initialization error: ${error.message}`);
            console.warn('WebGPU detection error:', error);
        }

        return result;
    }

    /**
     * Check browser support for WebGPU
     */
    checkBrowserSupport() {
        const support = {
            supported: false,
            hasNavigatorGPU: false,
            hasRequestAdapter: false,
            browserName: this.getBrowserName(),
            browserVersion: this.getBrowserVersion(),
            isSecureContext: window.isSecureContext,
            requirements: {
                secureContext: window.isSecureContext,
                webgpuAPI: false,
                modernBrowser: false
            }
        };

        // Check for navigator.gpu
        if (typeof navigator !== 'undefined' && navigator.gpu) {
            support.hasNavigatorGPU = true;
            support.requirements.webgpuAPI = true;
            
            if (typeof navigator.gpu.requestAdapter === 'function') {
                support.hasRequestAdapter = true;
                support.requirements.modernBrowser = true;
                support.supported = support.isSecureContext;
            }
        }

        return support;
    }

    /**
     * Enumerate available WebGPU adapters
     */
    async enumerateAdapters() {
        const adapters = [];
        
        try {
            // Try different power preferences
            const powerPreferences = ['high-performance', 'low-power', undefined];
            
            for (const powerPreference of powerPreferences) {
                const adapter = await navigator.gpu.requestAdapter({ powerPreference });
                if (adapter) {
                    const adapterInfo = await this.analyzeAdapter(adapter);
                    adapterInfo.powerPreference = powerPreference;
                    adapters.push(adapterInfo);
                }
            }
            
            // Remove duplicates based on vendor/architecture
            const uniqueAdapters = adapters.filter((adapter, index, self) => 
                index === self.findIndex(a => 
                    a.vendor === adapter.vendor && 
                    a.architecture === adapter.architecture
                )
            );
            
            return uniqueAdapters;
            
        } catch (error) {
            console.warn('Adapter enumeration failed:', error);
            return [];
        }
    }

    /**
     * Analyze a WebGPU adapter
     */
    async analyzeAdapter(adapter) {
        const info = {
            vendor: 'unknown',
            architecture: 'unknown',
            device: 'unknown',
            description: 'unknown',
            limits: {},
            features: [],
            isFallbackAdapter: adapter.isFallbackAdapter,
            webgpuCompatible: true
        };

        try {
            // Get adapter info (if available)
            if (adapter.info) {
                info.vendor = adapter.info.vendor || 'unknown';
                info.architecture = adapter.info.architecture || 'unknown';
                info.device = adapter.info.device || 'unknown';
                info.description = adapter.info.description || 'unknown';
            }

            // Get adapter limits
            info.limits = adapter.limits || {};
            
            // Get supported features
            info.features = Array.from(adapter.features || []);

        } catch (error) {
            console.warn('Adapter analysis error:', error);
        }

        return info;
    }

    /**
     * Detect WebGPU capabilities
     */
    async detectCapabilities(adapter, device) {
        const capabilities = {
            computeShaders: false,
            renderPipelines: false,
            bufferBinding: false,
            textureBinding: false,
            maxComputeWorkgroupSize: [0, 0, 0],
            maxComputeInvocations: 0,
            maxBufferSize: 0,
            maxTextureSize: 0
        };

        try {
            // Test compute shader support
            try {
                const computeShader = device.createShaderModule({
                    code: `
                        @compute @workgroup_size(1)
                        fn main() {
                            // Simple test compute shader
                        }
                    `
                });
                capabilities.computeShaders = true;
            } catch (error) {
                console.warn('Compute shader test failed:', error);
            }

            // Get limits from adapter
            if (adapter.limits) {
                capabilities.maxComputeWorkgroupSize = [
                    adapter.limits.maxComputeWorkgroupSizeX || 0,
                    adapter.limits.maxComputeWorkgroupSizeY || 0,
                    adapter.limits.maxComputeWorkgroupSizeZ || 0
                ];
                capabilities.maxComputeInvocations = adapter.limits.maxComputeInvocationsPerWorkgroup || 0;
                capabilities.maxBufferSize = adapter.limits.maxBufferSize || 0;
                capabilities.maxTextureDimension2D = adapter.limits.maxTextureDimension2D || 0;
            }

        } catch (error) {
            console.warn('Capabilities detection error:', error);
        }

        return capabilities;
    }

    /**
     * Detect memory limits
     */
    async detectMemoryLimits(adapter, device) {
        const memoryLimits = {
            maxBufferSize: 0,
            maxStorageBufferBindingSize: 0,
            maxUniformBufferBindingSize: 0,
            estimatedGPUMemory: 0,
            safeMemoryLimit: 0
        };

        try {
            if (adapter.limits) {
                memoryLimits.maxBufferSize = adapter.limits.maxBufferSize || 0;
                memoryLimits.maxStorageBufferBindingSize = adapter.limits.maxStorageBufferBindingSize || 0;
                memoryLimits.maxUniformBufferBindingSize = adapter.limits.maxUniformBufferBindingSize || 0;
            }

            // Estimate GPU memory (conservative approach)
            // This is a rough estimation based on typical GPU configurations
            const maxBufferMB = memoryLimits.maxBufferSize / (1024 * 1024);
            if (maxBufferMB > 1000) {
                memoryLimits.estimatedGPUMemory = 4 * 1024 * 1024 * 1024; // 4GB
            } else if (maxBufferMB > 500) {
                memoryLimits.estimatedGPUMemory = 2 * 1024 * 1024 * 1024; // 2GB
            } else {
                memoryLimits.estimatedGPUMemory = 1 * 1024 * 1024 * 1024; // 1GB
            }

            // Set safe memory limit (50% of estimated)
            memoryLimits.safeMemoryLimit = memoryLimits.estimatedGPUMemory * 0.5;

        } catch (error) {
            console.warn('Memory limits detection error:', error);
        }

        return memoryLimits;
    }

    /**
     * Detect feature support
     */
    async detectFeatureSupport(adapter, device) {
        const features = {
            timestamp: adapter.features?.has('timestamp-query') || false,
            indirectFirstInstance: adapter.features?.has('indirect-first-instance') || false,
            shaderF16: adapter.features?.has('shader-f16') || false,
            rg11b10ufloatRenderable: adapter.features?.has('rg11b10ufloat-renderable') || false,
            bgra8unormStorage: adapter.features?.has('bgra8unorm-storage') || false,
            float32Filterable: adapter.features?.has('float32-filterable') || false,
            textureCompressionBC: adapter.features?.has('texture-compression-bc') || false,
            textureCompressionETC2: adapter.features?.has('texture-compression-etc2') || false,
            textureCompressionASTC: adapter.features?.has('texture-compression-astc') || false
        };

        // Calculate overall feature score
        const supportedFeatures = Object.values(features).filter(Boolean).length;
        const totalFeatures = Object.keys(features).length;
        features.supportScore = supportedFeatures / totalFeatures;

        return features;
    }

    /**
     * Estimate WebGPU performance for image upscaling
     */
    estimatePerformance(webgpuInfo) {
        if (!webgpuInfo.supported) {
            return null;
        }

        let performanceScore = 1;
        const adapter = webgpuInfo.preferredAdapter;

        // Base score from adapter type
        if (adapter) {
            if (adapter.vendor.toLowerCase().includes('nvidia')) {
                performanceScore = 8; // NVIDIA typically excellent
            } else if (adapter.vendor.toLowerCase().includes('amd')) {
                performanceScore = 6; // AMD good performance
            } else if (adapter.vendor.toLowerCase().includes('intel')) {
                performanceScore = 3; // Intel integrated moderate
            } else {
                performanceScore = 4; // Unknown, conservative
            }

            // Adjust based on fallback adapter
            if (adapter.isFallbackAdapter) {
                performanceScore *= 0.5;
            }
        }

        // Adjust based on memory limits
        const memoryGB = webgpuInfo.memoryLimits?.estimatedGPUMemory / (1024 * 1024 * 1024) || 1;
        if (memoryGB >= 8) {
            performanceScore *= 1.3;
        } else if (memoryGB >= 4) {
            performanceScore *= 1.1;
        } else if (memoryGB < 2) {
            performanceScore *= 0.8;
        }

        // Adjust based on feature support
        const featureScore = webgpuInfo.featureSupport?.supportScore || 0.5;
        performanceScore *= (0.8 + featureScore * 0.4); // 0.8 to 1.2 multiplier

        // Calculate estimated times
        const baseTimeSeconds = 28; // Current CPU time for 2000x3000 → 15x
        const estimatedTime = Math.max(3, baseTimeSeconds / performanceScore);

        return {
            performanceScore: Math.round(performanceScore * 10) / 10,
            speedupMultiplier: Math.round(performanceScore * 10) / 10,
            estimatedTimeFor2000x3000_15x: Math.round(estimatedTime),
            confidence: adapter && !adapter.isFallbackAdapter ? 'high' : 'medium',
            category: this.getPerformanceCategory(performanceScore)
        };
    }

    /**
     * Get performance category
     */
    getPerformanceCategory(score) {
        if (score >= 7) return 'excellent';
        if (score >= 5) return 'very-good';
        if (score >= 3) return 'good';
        if (score >= 2) return 'moderate';
        return 'basic';
    }

    /**
     * Get browser name
     */
    getBrowserName() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    /**
     * Get browser version
     */
    getBrowserVersion() {
        const userAgent = navigator.userAgent;
        const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
        return match ? match[2] : 'Unknown';
    }

    /**
     * Create unsupported result
     */
    createUnsupportedResult(error) {
        return {
            supported: false,
            browserSupport: this.checkBrowserSupport(),
            adapters: [],
            preferredAdapter: null,
            capabilities: null,
            memoryLimits: null,
            featureSupport: {},
            performanceEstimate: null,
            detectionTimestamp: Date.now(),
            userAgent: navigator.userAgent,
            errors: [error?.message || 'WebGPU not supported']
        };
    }

    /**
     * Get current WebGPU support info
     */
    getWebGPUSupport() {
        return this.webgpuSupport;
    }

    /**
     * Check if WebGPU is supported
     */
    isSupported() {
        return this.webgpuSupport?.supported || false;
    }

    /**
     * Get performance estimate
     */
    getPerformanceEstimate() {
        return this.webgpuSupport?.performanceEstimate;
    }

    /**
     * Get memory limits
     */
    getMemoryLimits() {
        return this.webgpuSupport?.memoryLimits;
    }

    /**
     * Check if detection is complete
     */
    isDetectionComplete() {
        return this.detectionComplete;
    }

    /**
     * Test WebGPU with a simple compute operation
     */
    async testWebGPUCompute() {
        if (!this.isSupported()) {
            throw new Error('WebGPU not supported');
        }

        try {
            const adapter = await navigator.gpu.requestAdapter();
            const device = await adapter.requestDevice();

            // Create a simple compute shader for testing
            const shaderModule = device.createShaderModule({
                code: `
                    @compute @workgroup_size(1)
                    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                        // Simple test - just return
                    }
                `
            });

            const computePipeline = device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: shaderModule,
                    entryPoint: 'main'
                }
            });

            // Create command encoder and dispatch
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.dispatchWorkgroups(1);
            passEncoder.end();

            // Submit and wait
            device.queue.submit([commandEncoder.finish()]);
            await device.queue.onSubmittedWorkDone();

            device.destroy();
            return true;

        } catch (error) {
            console.error('WebGPU compute test failed:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.WebGPUDetector = WebGPUDetector;

export default WebGPUDetector; 