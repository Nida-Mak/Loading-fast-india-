# Loading Fast India (LFI) — Project Documentation

## Overview

**Loading Fast India** is an Indian logistics/freight booking mobile app built with Expo React Native, backed by an Express API server. It supports three roles: **Merchant**, **Driver**, and **Admin**.

### Monorepo structure

```
artifacts/
├── loading-fast-india/   # Expo React Native app (main product)
├── api-server/           # Express 5 REST + WhatsApp API server
└── mockup-sandbox/       # Component preview (design only)
```

---

## App — `loading-fast-india`

### Theme & Branding
- **Primary**: `#E85D04` (orange)
- **Background**: `#0A0A0F`
- **Surface**: `#14141E`
- **Card**: `#1C1C2E`
- **App name**: Loading Fast India
- **GST**: `24BRLPS3959R1ZN`
- **Commission UPI**: `maksudsaiyed888@oksbi`
- **Admin PIN**: `LFI2024`

### Key Files
| File | Purpose |
|---|---|
| `context/AppContext.tsx` | Global state, Trip/User types, all business logic |
| `lib/firebase.ts` | Firebase RTDB helpers (trips, users, fraud, chat) |
| `lib/api.ts` | Shared `API_BASE`, TypeScript types for WhatsApp API |
| `hooks/useLocationTracking.ts` | Driver GPS tracking + merchant watch |
| `app/(tabs)/` | Tab screens: trips, book, profile, admin |
| `app/trip/[id].tsx` | Trip detail screen |
| `app/trip/fraud/[id].tsx` | Fraud report screen |

### Firebase
- **Project**: `loding-fast` (intentional typo)
- **DB URL**: `https://loding-fast-default-rtdb.firebaseio.com`
- **Env vars**: `EXPO_PUBLIC_FIREBASE_*`
- **Rules**: Public (set by user)
- **Paths**:
  - `lfi_trips/{tripId}`
  - `lfi_users/{userId}`
  - `lfi_fraud_cases/{caseId}`
  - `lfi_chat/{tripId}`

### Business Rules
- **Commission rate**: `2%` (`APP_CONFIG.commissionRate = 0.02`)
- **Verified badge**: `rating >= 4.0 && totalRatings >= 3`
- **Habitual offender**: `getFraudCasesAgainstUser(userId).length >= 2`
- **Fraud timer**: 30 minutes auto-suspension of accused
- **IPC/BNS dhara**: Auto-assigned based on fraud type
- **Commission UPI**: `maksudsaiyed888@oksbi`
- **No `Alert.alert` for validation** — use inline `errorMsg` state

### APP_CONFIG (exported from AppContext)
```typescript
APP_CONFIG.commissionRate   // 0.02
APP_CONFIG.appName          // "Loading Fast India"
APP_CONFIG.currency         // "INR"
APP_CONFIG.upiId            // "maksudsaiyed888@oksbi"
APP_CONFIG.gst              // "24BRLPS3959R1ZN"
```

### Vehicle Notification Config
Exported from `AppContext.tsx`:

| Category | Vehicles | Radius | Notification Type |
|---|---|---|---|
| `small` | छोटा हाथी, ईको, थ्री-व्हीलर, Bike | 15 km | `instant` |
| `medium` | टाटा 407, Pickup, आयशर 14ft | 50 km | `multi_layered` |
| `heavy` | 6/10 चक्का, Container, Trailer | 200 km | `bulk_broadcast` |

- **Radius increment per step**: 25 km
- **Re-notification delay**: 5 minutes

Helper functions:
```typescript
getVehicleCategory(vehicleType)         // → "small" | "medium" | "heavy"
getVehicleNotificationConfig(vehicleType) // → { category, radiusKm, notificationType, ... }
```

When `createTrip()` is called, it auto-sets:
- `vehicleCategory`
- `notificationRadiusKm`
- `notificationType`

### `calculateDriverPayment(amount)` 
Exported from AppContext — use wherever payment is calculated.

---

## API Server — `api-server`

### Key Routes
| Route | Auth | Purpose |
|---|---|---|
| `GET /api/healthz` | None | Health check |
| `POST /admin/verify` | Basic (ADMIN_USER/ADMIN_PASS) | Returns HMAC-SHA256 token |
| `POST /whatsapp/send` | `X-Admin-Token` header | Send WhatsApp template message |

### WhatsApp Integration
- **API**: Meta Graph API v22.0
- **Phone Number ID**: `1051895501342348`
- **WABA ID**: `2339912216485258`
- **Token**: `WHATSAPP_ACCESS_TOKEN` secret
- **Auth**: HMAC-SHA256 signed token via `X-Admin-Token` header
- **Helper**: `sendAppNotification(number, templateName, variables)` in `src/routes/whatsapp.ts`

### WhatsApp Templates
| Template | Variables |
|---|---|
| `hello_world` | none |
| `new_load_alert` | `[driverName, fromCity, toCity, vehicleType, freightAmount]` |
| `booking_confirmed` | `[merchantName, biltyNumber, driverName, driverPhone]` |
| `driver_approval` | `[driverName]` |

### Self-Ping
API server pings itself every 14 minutes at:
`https://{REPLIT_DEV_DOMAIN}/api-server/api/healthz`
(Prevents Replit sleep)

---

## Environment Secrets
| Secret | Used By |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | API Server — Meta Graph API calls |
| `ADMIN_USER` | API Server — `/admin/verify` basic auth |
| `ADMIN_PASS` | API Server — `/admin/verify` basic auth |
| `EXPO_PUBLIC_FIREBASE_*` | Mobile app — Firebase RTDB |

---

## Stack

- **Monorepo**: pnpm workspaces
- **Mobile**: Expo SDK, React Native, Expo Router (file-based)
- **API**: Express 5, TypeScript, esbuild
- **DB (mobile)**: Firebase RTDB + AsyncStorage fallback
- **Notifications**: WhatsApp Business API (Meta Graph v22.0)
- **Maps**: expo-location + custom LiveMap component
- **Haptics**: expo-haptics (selection feedback)
- **QR**: react-native-qrcode-svg (bilty sharing)

---

## Running Locally

```bash
# Mobile app
pnpm --filter @workspace/loading-fast-india run dev

# API server
pnpm --filter @workspace/api-server run dev
```
