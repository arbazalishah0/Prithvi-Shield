# 🍏 Prithvi Shield Citizen App — iOS / Apple Installation Guide
**Official Guide for iPhone & iPad Users**

This document provides step-by-step instructions for installing and running the **Prithvi Shield — AI-Powered Disaster Early Warning & Citizen Safety Platform** on Apple iOS devices (iPhone and iPad).

---

## 📱 Option 1: Instant PWA Home Screen Installation (Recommended)

Apple iOS supports **Progressive Web Applications (PWA)** natively through **Safari**. This allows citizens to install Prithvi Shield directly onto their iPhone/iPad Home Screen as a standalone application without requiring the Apple App Store.

### Step-by-Step Installation Steps:

```
Open Safari on iPhone
       ↓
Visit App Web URL
       ↓
Tap 'Share' Button (Bottom Toolbar)
       ↓
Select 'Add to Home Screen'
       ↓
Tap 'Add' (Top Right)
       ↓
Prithvi Shield Icon Appears on Home Screen
```

### Detailed Visual Instructions:

1. **Open Safari Browser**:
   - Launch **Safari** on your iPhone or iPad (PWA installation on iOS requires Safari).
   - Navigate to the official deployment URL: `https://your-domain.com` (or local server address `http://<your-ip>:5173`).

2. **Tap the Share Button**:
   - At the bottom of the Safari screen (or top right on iPad), tap the **Share** icon (a square with an upward-pointing arrow `[↑]`).

3. **Select "Add to Home Screen"**:
   - Scroll down through the Share options menu.
   - Tap **Add to Home Screen** (icon with a plus `+` sign inside a square).

4. **Confirm Name & Tap Add**:
   - The app title will display as **Prithvi Shield**.
   - Tap **Add** in the top right corner.

5. **Launch the Installed Application**:
   - Locate the official **Prithvi Shield** logo icon on your iPhone Home Screen.
   - Tap the icon to launch the app in **Fullscreen Standalone Mode** (runs without Safari URL bars or browser controls, exactly like an App Store app).

---

## 🔒 iOS Permissions Configuration

To ensure all disaster early warning features function properly on iOS, configure the following device permissions:

### 1. High-Precision GPS Location Access
Location permission is required for **Google Maps live location**, **landslide risk detection**, and **SOS Emergency Rescue**.

- **When Prompted**: Tap **"Allow While Using App"**.
- **If Location is Disabled**:
  1. Open **Settings** on your iPhone.
  2. Scroll down and select **Privacy & Security** → **Location Services**.
  3. Ensure **Location Services** is turned **ON**.
  4. Find **Safari** / **Prithvi Shield** in the app list.
  5. Select **While Using the App** and toggle **Precise Location** to **ON**.

---

### 2. Camera Access for Hazard Reporting
Camera permission is required to capture live photos of landslides, road cracks, or flooding.

- **When Prompted**: Tap **"Allow Access"**.
- **Manual Configuration**: Go to **Settings** → **Safari** → **Camera** → Select **Allow**.

---

### 3. Microphone Access for AI Voice Assistant
Microphone permission is required for the **Multilingual AI Voice Assistant** (supporting 11 regional Indian languages: English, Hindi, Marathi, Bengali, Gujarati, Tamil, Telugu, Kannada, Malayalam, Punjabi, Urdu).

- **When Prompted**: Tap **"Allow Access"**.
- **Manual Configuration**: Go to **Settings** → **Safari** → **Microphone** → Select **Allow**.

---

## ⚡ Offline Performance on iOS

Prithvi Shield includes an automated **Service Worker App Shell** that caches emergency maps, shelter directories, and offline reports directly onto your iPhone.

- **Offline Behavior**: If mobile network or Wi-Fi is lost during an emergency, citizens can still open the Home Screen icon to view cached risk maps, shelter locations, and emergency contacts.
- **Auto-Sync**: Any offline hazard reports submitted will automatically broadcast to command centers once connectivity restores.

---

## 📄 Summary Comparison

| Feature | iOS Standalone PWA | App Store Installation |
| :--- | :--- | :--- |
| **Installation Time** | Instant (10 seconds) | Requires App Store Download |
| **Device Storage Used** | Under 10 MB | 50+ MB |
| **Full Screen Display** | Yes (Standalone Mode) | Yes |
| **Offline Map Support** | Yes (Service Worker Cache) | Yes |
| **Google Maps Live** | Yes | Yes |
| **AI Voice Assistant** | Yes (Web Speech API) | Yes |
| **Emergency SOS** | Yes | Yes |

---

*Prithvi Shield — Protecting Today. Saving Tomorrow.*
