# Pro Upscaler

A premium image upscaling web application with modern dark theme design.

## 🚀 Quick Start

### Option 1: Use the Start Script (Recommended)
```bash
cd /home/mranderson/desktophybrid/pro-upscaler
./start-server.sh
```

### Option 2: Manual Start
```bash
cd /home/mranderson/desktophybrid/pro-upscaler/server
node server.js
```

### Option 3: Development Mode
```bash
cd /home/mranderson/desktophybrid/pro-upscaler/server
npm run dev
```

## 📱 Access the Application

Once the server is running, open your browser and go to:
**http://localhost:3002**

## 🛠️ Troubleshooting

### Port Already in Use Error
If you get "EADDRINUSE" error, kill existing processes:
```bash
pkill -f "node server.js"
lsof -ti:3002 | xargs kill -9
```

### Server Not Starting
Make sure you're in the correct directory:
```bash
cd /home/mranderson/desktophybrid/pro-upscaler/server
pwd  # Should show: /home/mranderson/desktophybrid/pro-upscaler/server
node server.js
```

## ✨ Features

- **Drag & Drop Upload** - Drop images or click to browse
- **Multiple Scale Factors** - 2x, 4x, 6x, 8x, 10x upscaling
- **Format Support** - PNG, JPEG, WebP with quality controls
- **Real-time Progress** - Animated progress bar with time estimates
- **Dark Theme** - Professional shadcn/ui design
- **Responsive** - Works on desktop and mobile
- **Pro Engine Ready** - Integration points for desktop service

## 🎯 Usage

1. **Upload** - Drag an image file or click "Choose Image"
2. **Configure** - Select scale factor, output format, and quality
3. **Process** - Click "Start Upscaling" and watch the progress
4. **Download** - Click "Download Result" to save the upscaled image

## 🔧 Development

The application consists of:
- **Frontend** - HTML, CSS, JavaScript (client/)
- **Backend** - Express.js server (server/)
- **Components** - Modular JavaScript classes for different features

Server runs on port 3002 by default.
