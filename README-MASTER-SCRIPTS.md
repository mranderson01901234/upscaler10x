# Pro Upscaler - Master Control Scripts

This directory contains master scripts for managing the complete Pro Upscaler system with AI-enhanced image upscaling capabilities.

## 🚀 Quick Start

### Start All Services
```bash
./start-master.sh
```

### Check System Status
```bash
./status.sh
```

### Stop All Services
```bash
./stop-master.sh
```

## 📋 System Architecture

The Pro Upscaler system consists of three interconnected services:

1. **Pro Engine Desktop Service** (Port 3007)
   - High-performance image processing with Sharp
   - AI enhancement using CodeFormer with GPU acceleration
   - Handles large files up to 1.5GB
   - Memory-optimized progressive scaling

2. **Pro Upscaler Server** (Port 3002)
   - REST API server with authentication
   - SQLite database for user management
   - Request forwarding to Desktop Service
   - Real-time progress streaming

3. **Pro Upscaler Client** (Port 8080)
   - Modern web interface
   - Multiple color schemes with Ctrl+K shortcut
   - Side-by-side comparison view
   - Real-time progress updates

## 🔧 Master Scripts

### `start-master.sh`
- **Purpose**: Starts all three services in the correct order
- **Features**:
  - Automatic cleanup of existing processes
  - Port availability checking
  - Service health verification
  - Dependency installation (if needed)
  - Service communication testing
  - Comprehensive startup summary
  - Optional browser auto-launch
  - Continuous monitoring mode

### `stop-master.sh`
- **Purpose**: Gracefully stops all services
- **Features**:
  - PID-based graceful shutdown
  - Fallback process termination
  - Port-based cleanup (last resort)
  - Log file cleanup option
  - Complete shutdown verification

### `status.sh`
- **Purpose**: Quick system status overview
- **Features**:
  - Service status and PID information
  - Health check for each service
  - Inter-service communication testing
  - System resource monitoring
  - Access URL listing
  - Management command reference

## 🌐 Access Points

Once started, access the system via:

- **Main Application**: http://localhost:8080/index.html
- **Color Tester**: http://localhost:8080/color-verification.html
- **Connection Test**: http://localhost:8080/test-connection.html
- **Server API**: http://localhost:3002/health
- **Desktop Service**: http://localhost:3007/health

## 📊 Features

### AI Enhancement
- **GPU Acceleration**: NVIDIA GeForce GTX 1050 with CUDA
- **AI Model**: CodeFormer for face enhancement
- **Scaling**: Up to 10x with progressive processing
- **Output**: High-quality PNG up to 39MP+

### Performance
- **Memory Optimization**: 8GB heap with garbage collection
- **Concurrency**: 8-thread processing
- **File Support**: PNG, JPEG, WebP, TIFF up to 1.5GB
- **Processing Speed**: ~2.5M pixels/second

### User Interface
- **Responsive Design**: Optimized canvas layout
- **Color Schemes**: 5 different themes
- **Real-time Progress**: Live processing updates
- **Comparison View**: Side-by-side original/enhanced
- **Download**: Full resolution results

## 📁 File Locations

### Process IDs
- `/tmp/pro-upscaler-pids.txt` - Master PID file
- `/tmp/pro-engine-desktop.pid` - Desktop Service PID
- `/tmp/pro-upscaler-server.pid` - Server PID
- `/tmp/pro-upscaler-client.pid` - Client PID

### Log Files
- `/tmp/pro-engine-desktop.log` - Desktop Service logs
- `/tmp/pro-upscaler-server.log` - Server logs
- `/tmp/pro-upscaler-client.log` - Client logs

### Output Directory
- `/home/mranderson/Downloads/ProUpscaler/` - Processed images

## 🛠️ Troubleshooting

### Services Won't Start
1. Check if ports are available: `lsof -i:3007 -i:3002 -i:8080`
2. Kill conflicting processes: `./stop-master.sh`
3. Check dependencies: `npm install` in service directories
4. Review logs: `tail -f /tmp/pro-*.log`

### AI Processing Fails
1. Verify GPU availability: Check Desktop Service logs
2. Ensure service communication: `./status.sh`
3. Check file permissions in output directory
4. Monitor system resources during processing

### Performance Issues
1. Monitor system load: `./status.sh`
2. Check available memory (requires 8GB+ recommended)
3. Verify GPU drivers for CUDA acceleration
4. Review processing logs for bottlenecks

## 🔄 Development Workflow

### Start Development Environment
```bash
./start-master.sh
# Services start with monitoring enabled
# Press Ctrl+C to stop monitoring (services continue running)
```

### Check Status During Development
```bash
./status.sh
```

### Clean Shutdown
```bash
./stop-master.sh
```

### View Live Logs
```bash
# All services
tail -f /tmp/pro-*.log

# Specific service
tail -f /tmp/pro-engine-desktop.log
```

## 📈 System Requirements

### Minimum
- **OS**: Linux (Kali Linux tested)
- **CPU**: 4+ cores
- **RAM**: 8GB
- **Storage**: 10GB free space
- **Node.js**: v16+
- **Python**: 3.8+

### Recommended
- **CPU**: 8+ cores (AMD Ryzen 5 3550H+)
- **RAM**: 16GB+
- **GPU**: NVIDIA with CUDA support
- **Storage**: SSD with 50GB+ free space

## 🔐 Security Notes

- Services run on localhost only
- Development authentication tokens used
- File uploads limited to image formats
- Output directory access controlled
- No external network dependencies for core processing

---

**Created**: September 2025  
**System**: Pro Upscaler v1.0  
**GPU**: NVIDIA GeForce GTX 1050 with CUDA  
**Status**: Production Ready ✅ 