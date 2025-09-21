# Pro Engine Desktop Service - Phase 1

A Node.js desktop background service that processes large images (600MP+) in 4-5 seconds using Sharp library, integrating seamlessly with the existing Pro Upscaler browser application.

## 🚀 Features

- **High-Performance Processing**: 4-5 second processing for 600MP+ images
- **Sharp Library Integration**: CPU-optimized image processing with Lanczos3 interpolation
- **Chunked Processing**: Handles extremely large images through intelligent tiling
- **Hardware Detection**: Automatically detects system capabilities and optimizes performance
- **Progress Monitoring**: Real-time progress updates via Server-Sent Events
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Browser Integration**: Seamless integration with existing Pro Upscaler web app

## 📋 System Requirements

### Minimum Requirements
- **RAM**: 8GB
- **CPU**: 4-core processor
- **Storage**: 500MB free space
- **Node.js**: 16.0.0 or higher

### Recommended Requirements
- **RAM**: 16GB+
- **CPU**: 8-core processor
- **Storage**: 1GB free space

## 🛠️ Installation

### Quick Setup

1. **Clone and navigate to the project:**
   ```bash
   cd pro-engine-desktop/service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the service:**
   ```bash
   npm start
   ```

The service will run on `http://localhost:3003`

### System Dependencies (Linux/Ubuntu)

If you encounter Sharp compilation issues on Linux:

```bash
sudo apt-get update
sudo apt-get install -y libvips-dev python3-dev build-essential
```

## 🔧 API Endpoints

### Health Check
```
GET /health
```
Returns service status and system capabilities.

### System Capabilities
```
GET /api/capabilities
```
Returns detailed hardware information and performance estimates.

### Process Large Image
```
POST /api/process-large
```
Starts processing a large image. Requires:
- `sessionId`: Unique session identifier
- `imageData`: Base64 encoded image data URL
- `scaleFactor`: Upscaling factor (e.g., 2, 4)
- `format`: Output format (png, jpeg, webp)
- `quality`: Quality setting (1-100)

### Monitor Progress
```
GET /api/progress/:sessionId
```
Server-Sent Events endpoint for real-time progress monitoring.

### Download Result
```
GET /api/download/:sessionId
```
Download the processed image file.

## 🌐 Browser Integration

The service automatically integrates with the existing Pro Upscaler browser application. When both services are running:

1. Browser app detects desktop service on startup
2. Large files (>100MB) are automatically routed to desktop service
3. Real-time progress updates are shown in the browser
4. Processed files are saved to `~/Downloads/ProUpscaler/`

## 📊 Performance

### Expected Processing Times
- **200MP images**: 2-3 seconds
- **400MP images**: 3-4 seconds  
- **600MP images**: 4-5 seconds
- **800MP+ images**: 5-8 seconds

### Performance Categories
- **High-Performance**: 8+ cores, 16GB+ RAM (2-3x faster)
- **Good-Performance**: 6-8 cores, 8-16GB RAM (1.5-2x faster)
- **Standard-Performance**: 4 cores, 8GB RAM (baseline)

## 🏗️ Architecture

```
pro-engine-desktop/
├── service/                    # Core desktop service
│   ├── server.js              # Express server with REST API
│   ├── image-processor.js     # Sharp-based image processing
│   ├── hardware-detector.js   # System capability detection
│   ├── file-manager.js        # File I/O operations
│   └── package.json           # Dependencies
├── installer/                  # Electron installer (Phase 2)
│   ├── main.js                # Installer application
│   └── package.json           # Installer dependencies
└── README.md                  # This file
```

## 🔍 Monitoring & Debugging

### Service Logs
The service logs all operations to console:
- Processing start/completion
- File save operations
- Error conditions
- Performance metrics

### Health Monitoring
```bash
curl http://localhost:3003/health
```

### Capabilities Check
```bash
curl http://localhost:3003/api/capabilities
```

## 🛡️ Error Handling

The service includes comprehensive error handling:
- **Memory Management**: Automatic chunked processing for large images
- **File System**: Graceful fallbacks for directory creation
- **Network**: Timeout handling and connection management
- **Processing**: Detailed error reporting with context

## 🔄 Session Management

- Sessions auto-expire after 2 hours
- Automatic cleanup of temporary files
- Progress monitoring with real-time updates
- Graceful handling of client disconnections

## 📁 File Output

Processed images are saved to:
- **Windows**: `%USERPROFILE%\Downloads\ProUpscaler\`
- **macOS**: `~/Downloads/ProUpscaler/`
- **Linux**: `~/Downloads/ProUpscaler/`

Filename format: `upscaled-{sessionId}-{timestamp}.{format}`

## 🚦 Status Codes

- **200**: Success
- **400**: Bad request (missing parameters)
- **404**: Session not found
- **500**: Internal server error

## 🔧 Configuration

The service can be configured by modifying constants in the source files:
- **Port**: Default 3003 (server.js)
- **Memory Limit**: Default 2GB (image-processor.js)
- **Chunk Size**: Default 2048px (image-processor.js)
- **Session Timeout**: Default 2 hours (server.js)

## 🐛 Troubleshooting

### Service Won't Start
1. Check Node.js version: `node --version`
2. Verify dependencies: `npm install`
3. Check port availability: `lsof -i :3003`

### Sharp Installation Issues
1. Install system dependencies (see Installation section)
2. Clear npm cache: `npm cache clean --force`
3. Reinstall: `rm -rf node_modules && npm install`

### Memory Issues
1. Check available RAM: Service needs 2GB+ free
2. Reduce chunk size in image-processor.js
3. Monitor with: `node --max-old-space-size=4096 server.js`

## 📈 Performance Tuning

### CPU Optimization
- Service automatically uses all CPU cores
- Sharp library configured for maximum performance
- Lanczos3 interpolation for quality

### Memory Management
- Intelligent chunked processing
- Automatic memory usage detection
- Configurable memory limits

### File I/O
- Streaming for large files
- Efficient buffer management
- Automatic cleanup processes

## 🔮 Future Enhancements (Phase 2+)

- [ ] Electron installer with GUI
- [ ] Windows service integration
- [ ] macOS launch agent
- [ ] Linux systemd service
- [ ] GPU acceleration support
- [ ] Batch processing capabilities
- [ ] Advanced upscaling algorithms
- [ ] Cloud processing integration

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📞 Support

For issues and questions:
1. Check troubleshooting section
2. Review logs for error details
3. Test with smaller images first
4. Verify system requirements 