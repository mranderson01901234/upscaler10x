# Pro Upscaler Testing Environment

## Quick Start Scripts

### 🚀 Fresh Start (Recommended)
```bash
./start-fresh.sh
```
**What it does:**
- Kills all existing Pro Upscaler processes
- Starts fresh servers in correct order
- Performs health checks
- Shows all service URLs and PIDs
- Keeps running with live logs

**Services Started:**
- **Pro Engine Desktop**: `http://localhost:3006` (Real 10x processing)
- **Pro Upscaler Server**: `http://localhost:3002` (API server)  
- **Client Web App**: `http://localhost:8080` (Main interface)

### 🛑 Stop All Services
```bash
./stop-all.sh
```
**What it does:**
- Kills all Pro Upscaler processes
- Cleans up ports 3002, 3006, 8080
- Ensures clean shutdown

## Testing Workflow

1. **Start Fresh Environment:**
   ```bash
   ./start-fresh.sh
   ```

2. **Open Web App:**
   - Go to: `http://localhost:8080`
   - Upload an image
   - Select scale factor (2x, 4x, 6x, 8x, 10x)
   - Click "Start Upscaling"

3. **Test 10x Upscaling:**
   - Should take 45-60 seconds (real processing)
   - Should create ~150-200MB files
   - Should show real progress updates
   - Files saved to: `~/Downloads/ProUpscaler/`

4. **Stop When Done:**
   ```bash
   ./stop-all.sh
   ```

## Expected Results

### 2x-8x Upscaling
- **Processing Time**: 20-40 seconds
- **File Size**: 70-120 MB
- **Status**: Direct Sharp processing

### 10x Upscaling (Fixed!)
- **Processing Time**: 45-60 seconds  
- **File Size**: ~150-200 MB
- **Dimensions**: 20000×30000 pixels (600 MP)
- **Method**: Two-stage memory-optimized processing
- **Status**: Should show real progress, not 1KB placeholders

## Troubleshooting

### If 10x still shows 1KB files:
```bash
./stop-all.sh
./start-fresh.sh
```

### Check if services are running:
```bash
curl http://localhost:3006/health  # Pro Engine
curl http://localhost:3002/health  # Upscaler Server  
curl http://localhost:8080/        # Client
```

### View logs:
The `start-fresh.sh` script shows live logs. Press `Ctrl+C` to stop.

## Architecture

```
Client (8080) → Pro Engine (3006) → Downloads/ProUpscaler/
     ↓
Pro Upscaler Server (3002) [fallback]
```

**Primary Path**: Client → Pro Engine (for real 10x processing)  
**Fallback Path**: Client → Pro Upscaler Server (for smaller images) 