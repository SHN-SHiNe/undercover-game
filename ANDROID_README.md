# Android Deployment Guide

## Steps

### 1. Install Termux
- Download from F-Droid: https://f-droid.org/packages/com.termux/
- (Google Play version is outdated, use F-Droid)

### 2. Copy project files to phone
Copy these files/folders to your phone:
```
app.py
data/
static/react/
static/css/       (fallback)
static/js/        (fallback)
templates/        (fallback)
termux-setup.sh
```

Easiest way: zip them up and transfer via USB/cloud.

### 3. Setup in Termux
```bash
# Allow storage access
termux-setup-storage

# Copy files from phone storage to Termux home
cp -r /sdcard/Download/sheishiwodi ~/sheishiwodi

# Run setup script
cd ~/sheishiwodi
bash termux-setup.sh
```

### 4. Start the server
```bash
cd ~/sheishiwodi
python app.py
```

### 5. Open in browser
Open your phone's browser and go to:
```
http://localhost:5000
```

The game will load the React UI automatically.

## Notes
- No Node.js needed on Android - React is pre-built into static files
- Only Python + Flask required
- Server runs locally, no internet needed
- Other devices on the same WiFi can access via your phone's IP
