# File Tree: APEX

**Generated:** 10/7/2026, 3:13:53 PM
**Root Path:** `s:\Sushrut-Gondane\03-Projects\IoT\Project_1_APEX\APEX`

```
├── 📁 ai-service
│   ├── 📝 README.md
│   ├── 🐍 main.py
│   └── 📄 requirements.txt
├── 📁 backend
│   ├── 📁 src
│   │   ├── 📁 config
│   │   │   └── 📄 env.config.js
│   │   ├── 📁 constants
│   │   │   ├── 📄 apiMessage.constant.js
│   │   │   ├── 📄 httpStatus.constant.js
│   │   │   └── 📄 vehicleCommand.constant.js
│   │   ├── 📁 controllers
│   │   │   ├── 📄 auth.controller.js
│   │   │   └── 📄 vehicle.controller.js
│   │   ├── 📁 db
│   │   │   └── 📄 db.js
│   │   ├── 📁 middlewares
│   │   │   ├── 📄 auth.middleware.js
│   │   │   └── 📄 errorHandler.middleware.js
│   │   ├── 📁 models
│   │   │   ├── 📄 Event.model.js
│   │   │   ├── 📄 Snapshot.model.js
│   │   │   ├── 📄 User.model.js
│   │   │   └── 📄 Vehicle.model.js
│   │   ├── 📁 routes
│   │   │   ├── 📄 auth.routes.js
│   │   │   ├── 📄 test.routes.js
│   │   │   └── 📄 vehicle.routes.js
│   │   ├── 📁 scripts
│   │   │   └── 📄 seed.js
│   │   ├── 📁 services
│   │   │   └── 📄 yolo.service.js
│   │   ├── 📁 utils
│   │   │   ├── 📄 ApiError.js
│   │   │   └── 📄 ApiResponse.js
│   │   ├── 📁 websocket
│   │   │   ├── 📄 camera.socket.js
│   │   │   ├── 📄 device.socket.js
│   │   │   ├── 📄 vehicle.socket.js
│   │   │   ├── 📄 websocket.manager.js
│   │   │   └── 📄 websocket.server.js
│   │   ├── 📄 app.js
│   │   └── 📄 server.js
│   ├── ⚙️ package.json
│   └── ⚙️ pnpm-lock.yaml
├── 📁 docs
│   ├── 📝 API.md
│   ├── 📝 ARCHITECTURE.md
│   ├── 📝 DATABASE.md
│   └── 📝 ENVIRONMENT.md
├── 📁 esp32
│   └── 📁 firmware
│       ├── 📁 APEX_ESP32_CAM
│       │   └── 📄 APEX_ESP32_CAM.ino
│       ├── 📁 APEX_ESP32_Firmware
│       │   └── 📄 APEX_ESP32_Firmware.ino
│       └── ⚡ firmware_secrets.example.h
├── 📁 frontend
│   ├── 📁 public
│   │   ├── 📁 brand
│   │   │   ├── 📝 APEX_Visual_Asset_Plan.md
│   │   │   ├── 🖼️ app-icon.svg
│   │   │   ├── 🖼️ favicon.svg
│   │   │   ├── 🖼️ logo-dark.svg
│   │   │   ├── 🖼️ logo-horizontal.svg
│   │   │   ├── 🖼️ logo-mark-black.svg
│   │   │   ├── 🖼️ logo-mark-dark.svg
│   │   │   ├── 🖼️ logo-mark-white.svg
│   │   │   ├── 🖼️ logo-mark.svg
│   │   │   ├── 🖼️ logo.svg
│   │   │   └── 🖼️ wordmark.svg
│   │   └── 📁 illustrations
│   │       ├── 📁 authentication
│   │       │   ├── 🖼️ login-illustration.svg
│   │       │   └── 🖼️ signup-illustration.svg
│   │       ├── 📁 errors
│   │       │   └── 🖼️ error-404.svg
│   │       └── 📁 features
│   │           ├── 🖼️ feature-event-detection.svg
│   │           ├── 🖼️ feature-gps-tracking.svg
│   │           ├── 🖼️ feature-live-camera.svg
│   │           ├── 🖼️ feature-live-monitoring.svg
│   │           ├── 🖼️ feature-remote-control.svg
│   │           └── 🖼️ feature-snapshot-history.svg
│   ├── 📁 src
│   │   ├── 📁 app
│   │   │   └── 📄 AppProvider.jsx
│   │   ├── 📁 components
│   │   │   ├── 📁 layout
│   │   │   │   ├── 📄 LandingNavbar.jsx
│   │   │   │   ├── 🎨 Navbar.css
│   │   │   │   ├── 📄 Navbar.jsx
│   │   │   │   ├── 🎨 Sidebar.css
│   │   │   │   └── 📄 Sidebar.jsx
│   │   │   └── 📁 ui
│   │   │       ├── 📄 Button.jsx
│   │   │       ├── 📄 Card.jsx
│   │   │       ├── 📄 Input.jsx
│   │   │       ├── 📄 Modal.jsx
│   │   │       └── 📄 Status.jsx
│   │   ├── 📁 config
│   │   │   └── 📄 env.config.js
│   │   ├── 📁 constants
│   │   │   ├── 📄 api.constant.js
│   │   │   └── 📄 vehicleCommand.constant.js
│   │   ├── 📁 features
│   │   │   ├── 📁 camera
│   │   │   │   ├── 🎨 CameraFeed.css
│   │   │   │   ├── 📄 CameraFeed.jsx
│   │   │   │   └── 📄 camera.service.js
│   │   │   ├── 📁 history
│   │   │   ├── 📁 map
│   │   │   │   ├── 🎨 Map.css
│   │   │   │   └── 📄 Map.jsx
│   │   │   ├── 📁 rover
│   │   │   └── 📁 telemetry
│   │   ├── 📁 layout
│   │   │   └── 📄 MainLayout.jsx
│   │   ├── 📁 pages
│   │   │   ├── 📁 auth
│   │   │   │   ├── 📄 Login.jsx
│   │   │   │   └── 📄 Signup.jsx
│   │   │   ├── 📁 dashboard
│   │   │   │   ├── 🎨 Control.css
│   │   │   │   ├── 📄 Control.jsx
│   │   │   │   ├── 📄 Events.jsx
│   │   │   │   ├── 📄 History.jsx
│   │   │   │   ├── 🎨 Home.css
│   │   │   │   ├── 📄 Home.jsx
│   │   │   │   └── 📄 Snapshots.jsx
│   │   │   └── 📁 landing
│   │   │       └── 📄 Landing.jsx
│   │   ├── 📁 redux
│   │   │   ├── 📁 reducers
│   │   │   └── 📁 slices
│   │   │       ├── 📄 authSlice.js
│   │   │       └── 📄 vehicleSlice.js
│   │   ├── 📁 routes
│   │   │   ├── 📄 AppRoutes.jsx
│   │   │   └── 📄 ProtectedRoute.jsx
│   │   ├── 📁 services
│   │   │   ├── 📄 api.service.js
│   │   │   ├── 📄 weather.service.js
│   │   │   └── 📄 websocket.service.js
│   │   ├── 📁 store
│   │   │   └── 📄 store.js
│   │   ├── 📁 styles
│   │   │   ├── 🎨 auth.css
│   │   │   ├── 🎨 dashboard-layout.css
│   │   │   └── 🎨 global.css
│   │   ├── 📁 utils
│   │   │   └── 📄 geography.js
│   │   ├── 📄 App.jsx
│   │   └── 📄 main.jsx
│   ├── ⚙️ .gitignore
│   ├── 📝 README.md
│   ├── 📄 eslint.config.js
│   ├── 🌐 index.html
│   ├── ⚙️ package.json
│   ├── ⚙️ pnpm-lock.yaml
│   └── 📄 vite.config.js
├── ⚙️ .gitignore
├── ⚙️ .prettierignore
├── ⚙️ .prettierrc
├── ⚙️ package.json
└── ⚙️ pnpm-lock.yaml
```

---

_Generated by FileTree Pro Extension_
