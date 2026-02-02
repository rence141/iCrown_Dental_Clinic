# Build iCrown Dental Clinic

## Install Electron Builder
```bash
npm install electron-builder --save-dev
```

## Update package.json
Add this to your package.json:

```json
{
  "name": "icrown-dental",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "dist": "electron-builder --publish=never"
  },
  "build": {
    "appId": "com.icrown.dental",
    "productName": "iCrown Dental Clinic",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

## Build Commands
```bash
# Build Windows installer
npm run build:win

# Create distribution package
npm run dist
```

## Result
- Creates `dist/` folder with installer
- Installer creates desktop shortcut automatically
- Adds to Start Menu
- Professional app experience
