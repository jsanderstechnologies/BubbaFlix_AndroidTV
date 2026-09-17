# BubbaFlix Android TV 🎬📺

A standalone, high-performance Android TV application for movie & TV show discovery, streaming, Live TV (Dispatcharr), SIMKL tracking, and Groq AI filtering.

Unlike the web version of BubbaFlix, **BubbaFlix Android TV operates 100% serverless on device**—no backend Node.js server or FFmpeg transcoder service is required!

---

## 🌟 Features

- 📱 **Standalone Client-Side Execution**: Runs embedded directly inside the Android TV app assets (`file:///android_asset/dist/index.html`). No server URL prompts or external web host needed.
- 📺 **Native ExoPlayer Acceleration**: Built-in ExoPlayer (AndroidX Media3) handles HLS (.m3u8), MP4, MKV, TS, AC3, EAC3, DTS, AAC, H.264, H.265 (HEVC), and AV1 natively on Android TV hardware.
- ⚡ **5-Minute Ahead-Buffering**: Pre-buffers video playback to eliminate buffering pauses on smart TV hardware.
- 📡 **Dispatcharr Live TV & EPG**: Connect directly to your local Dispatcharr server URL & API Key in Settings for live channel guides and program schedules.
- 🎯 **D-Pad Spatial Navigation**: Full D-Pad remote control support with input focus retention and spatial navigation.
- 🎨 **Custom Themes & Layout Customization**: Select color themes (including Netflix Dark Red) and customize home screen category ordering.
- 🤖 **Groq AI Filtering**: Title classification via Groq AI Llama 3 to filter out unwanted streams.
- ⭐ **SIMKL & Favorites Persistence**: Track watch progress and sync favorites locally.

---

## 🛠️ Building the App

### Prerequisites
- Node.js (v18+)
- Java JDK 17+
- Android SDK (API 34)

### Build Steps

1. **Build Web Frontend Assets**:
   ```bash
   npm install
   npm run build
   ```
   *Outputs static web bundle to `app/src/main/assets/dist`.*

2. **Compile Android TV APK**:
   - **Windows (PowerShell)**:
     ```powershell
     $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
     $env:ANDROID_HOME="C:\Users\Jessie\AppData\Local\Android\Sdk"
     cmd /c "gradlew.bat assembleDebug"
     ```
   - **Linux / macOS**:
     ```bash
     ./gradlew assembleDebug
     ```

3. **Output APK Location**:
   `app/build/outputs/apk/debug/BubbaFlixTV.apk`

---

## 📲 Installation on Android TV / Firestick

1. Transfer `BubbaFlixTV.apk` to your Android TV, Fire TV, or Google TV device using Downloader, ADB, or USB drive.
2. Install and launch **BubbaFlix TV**.
3. Open **Settings** screen on TV to configure your TMDB token, SIMKL keys, Groq AI key, Premiumize key, or Dispatcharr Live TV server URL.
