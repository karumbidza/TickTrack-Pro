# TickTrack Pro Mobile App Development Guide

## Overview
This guide explains how to build native mobile applications (iOS & Android) for TickTrack Pro, enabling contractors and clients to use the platform on mobile devices.

---

## Current Status: Mobile-Responsive Web App ✅

The web application is now optimized for mobile browsers with:
- **Responsive navbar** with hamburger menu
- **Touch-friendly** buttons and controls
- **Mobile-optimized** spacing and typography
- **Custom breakpoints** for various screen sizes

Users can currently access tick-trackpro.com from mobile browsers with a great experience.

---

## Mobile App Development Options

### Option 1: React Native + Expo (RECOMMENDED) ⭐

**Why Choose This:**
- Share 80-90% of code with your existing Next.js codebase
- Use React components and JavaScript/TypeScript (same as your web app)
- Single codebase for iOS and Android
- Expo provides easy build, deployment, and OTA updates
- Access to device features (camera, GPS, push notifications)

**Architecture:**
```
TickTrack Pro Mobile App
├── React Native UI (reusable components)
├── API Client (connects to your existing Next.js API routes)
├── Local Storage (offline support)
└── Push Notifications (Firebase Cloud Messaging)
```

**Setup Steps:**

1. **Initialize Expo Project**
```bash
# Install Expo CLI
npm install -g expo-cli

# Create new Expo app
npx create-expo-app ticktrack-mobile --template

cd ticktrack-mobile
```

2. **Project Structure**
```
ticktrack-mobile/
├── app/                    # App screens (Expo Router)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── dashboard.tsx
│   │   ├── tickets.tsx
│   │   ├── invoices.tsx
│   │   └── profile.tsx
│   └── _layout.tsx
├── components/
│   ├── ui/                # Reusable UI components
│   ├── TicketCard.tsx
│   ├── InvoiceCard.tsx
│   └── NotificationBell.tsx
├── services/
│   ├── api.ts             # API client
│   ├── auth.ts            # Authentication
│   └── storage.ts         # AsyncStorage
├── hooks/
│   ├── useTickets.ts
│   ├── useInvoices.ts
│   └── useAuth.ts
├── types/
│   └── index.ts           # TypeScript types
└── app.json               # Expo configuration
```

3. **Install Dependencies**
```bash
# Core dependencies
npx expo install react-native-safe-area-context
npx expo install @react-navigation/native
npx expo install expo-router

# UI components
npm install react-native-paper

# API & Auth
npm install axios
npm install @react-native-async-storage/async-storage

# Push notifications
npx expo install expo-notifications

# Camera for invoice photos
npx expo install expo-camera expo-image-picker

# File uploads
npx expo install expo-document-picker
```

4. **API Client Setup**
```typescript
// services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://tick-trackpro.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Tickets
  getTickets: () => apiClient.get('/tickets'),
  createTicket: (data) => apiClient.post('/tickets', data),
  updateTicket: (id, data) => apiClient.patch(`/tickets/${id}`, data),
  
  // Invoices
  getInvoices: () => apiClient.get('/contractor/invoices'),
  createInvoice: (data) => apiClient.post('/contractor/invoices', data),
  
  // Auth
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (data) => apiClient.post('/auth/register', data),
};
```

5. **Authentication Example**
```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const response = await api.get('/auth/me');
        setUser(response.data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const response = await api.login({ email, password });
    await AsyncStorage.setItem('auth_token', response.data.token);
    setUser(response.data.user);
  }

  async function logout() {
    await AsyncStorage.removeItem('auth_token');
    setUser(null);
  }

  return { user, loading, login, logout };
}
```

6. **Build & Deploy**
```bash
# Development
npx expo start

# Build for production
eas build --platform android
eas build --platform ios

# Publish OTA update
eas update --branch production
```

**Cost:**
- Development: FREE
- Expo account: FREE
- EAS Build: $29/month (or build locally for free)
- Apple Developer: $99/year
- Google Play: $25 one-time

---

### Option 2: Progressive Web App (PWA) - Easiest & FREE

**Why Choose This:**
- No app store approval needed
- Zero additional development (use existing web app)
- Works on ALL devices
- Installable from browser
- Offline support with Service Workers
- Push notifications supported

**Setup Steps:**

1. **Create PWA Manifest**
```json
// public/manifest.json
{
  "name": "TickTrack Pro",
  "short_name": "TickTrack",
  "description": "Facility Maintenance Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

2. **Add to app/layout.tsx**
```tsx
export const metadata = {
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TickTrack Pro'
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  }
}
```

3. **Create Service Worker** (for offline support)
```javascript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('ticktrack-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard',
        '/contractor',
        '/offline.html'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**Pros:**
- ✅ Zero cost
- ✅ No app store approval
- ✅ Instant updates
- ✅ Works everywhere

**Cons:**
- ❌ Limited device API access
- ❌ Less "native" feel
- ❌ No App Store presence

---

### Option 3: Flutter

**Why Choose This:**
- Beautiful native UI
- Fast performance
- Single codebase for iOS & Android
- Google's backing

**Cons:**
- Requires learning Dart (new language)
- Can't reuse your React/TypeScript code
- Longer development time

---

### Option 4: Capacitor (Ionic)

**Why Choose This:**
- Wrap your existing web app
- Minimal changes needed
- Access to native features

**Setup:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init TickTrackPro com.ticktrack.app
npx cap add android
npx cap add ios
```

---

## Recommended Approach: React Native + Expo

### Phase 1: MVP (2-3 weeks)
- **Authentication** (login/register)
- **Dashboard** (ticket overview)
- **Ticket Creation** (with camera)
- **Ticket List** & Details
- **Push Notifications**

### Phase 2: Contractor Features (2 weeks)
- **Job List**
- **Invoice Creation** (camera + document picker)
- **Invoice Tracker**
- **Payment Tracking**

### Phase 3: Advanced (2-3 weeks)
- **Offline Support**
- **Real-time Chat**
- **Location Tracking**
- **Biometric Auth**

---

## Development Workflow

1. **Backend (No Changes Needed)**
   - Your existing Next.js API routes work perfectly
   - Already have REST API at tick-trackpro.com/api
   - Authentication via NextAuth.js

2. **Mobile App Development**
   - Build UI with React Native components
   - Call existing API routes
   - Store auth token in AsyncStorage
   - Handle push notifications

3. **Testing**
   ```bash
   # iOS Simulator
   npx expo run:ios
   
   # Android Emulator
   npx expo run:android
   
   # Physical Device (scan QR code)
   npx expo start
   ```

4. **Deployment**
   ```bash
   # Build
   eas build --platform all
   
   # Submit to stores
   eas submit -p ios
   eas submit -p android
   ```

---

## Push Notifications Setup

1. **Firebase Setup**
```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
```

2. **Server-side (in your Next.js API)**
```typescript
// Send notification
import admin from 'firebase-admin';

await admin.messaging().send({
  token: userDeviceToken,
  notification: {
    title: 'New Ticket Assigned',
    body: 'You have been assigned to ticket #1234'
  },
  data: {
    ticketId: '1234',
    type: 'TICKET_ASSIGNED'
  }
});
```

3. **Mobile App**
```typescript
import messaging from '@react-native-firebase/messaging';

// Register for notifications
async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    const token = await messaging().getToken();
    // Send token to your server
    await api.updateDeviceToken(token);
  }
}

// Listen for notifications
messaging().onMessage(async remoteMessage => {
  console.log('Notification received:', remoteMessage);
  // Show in-app notification
});
```

---

## Cost Breakdown

### React Native + Expo Approach
| Item | Cost |
|------|------|
| Development (3 months @ $50/hr, 160hrs) | $8,000 |
| EAS Build subscription | $29/mo |
| Apple Developer Account | $99/year |
| Google Play Developer Account | $25 one-time |
| Push Notifications (Firebase) | FREE |
| **Total First Year** | **~$8,500** |

### PWA Approach
| Item | Cost |
|------|------|
| Development (1 week) | $2,000 |
| Hosting | Included |
| Push Notifications | FREE |
| **Total** | **$2,000** |

---

## Recommendation Summary

**For Quick Launch:** Start with PWA (1 week, $2k)
- Add manifest.json
- Create service worker
- Generate app icons
- Users can "Add to Home Screen"

**For Best User Experience:** Build React Native app (3 months, $8.5k)
- Native performance
- Full device access
- App Store presence
- Better offline support
- Push notifications
- Professional image

---

## Next Steps

1. **Decide on approach** (PWA vs React Native)
2. **Set up development environment**
3. **Create project structure**
4. **Build authentication flow**
5. **Implement core features**
6. **Test on devices**
7. **Deploy to app stores**

---

## Questions?

Contact: allen@tick-trackpro.com

Ready to start? Let's build TickTrack Pro Mobile! 🚀
