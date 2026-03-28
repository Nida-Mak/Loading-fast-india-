# Loading Fast India — OTA Update Guide
## Ek baar build karo, baad mein sirf ek command se update karo

---

## Pehli Baar Setup (SIRF EK BAAR)

### Step 1: Expo Account banao (FREE)
1. https://expo.dev pe jao
2. "Sign Up" karo (free account)
3. Username: apni marzi ka rakho (e.g. `loadingfastindia`)

### Step 2: EAS CLI install karo (apne computer par)
```bash
npm install -g eas-cli
```

### Step 3: Login karo
```bash
eas login
```

### Step 4: Project link karo (Replit terminal mein)
```bash
cd artifacts/loading-fast-india
eas init
```
Yeh command aapko ek **Project ID** dega (jaise: `abc123-xyz-...`)

### Step 5: app.json mein Project ID daalo
`app.json` mein yeh do jagah update karo:
```json
"owner": "aapka-expo-username",
"updates": {
  "url": "https://u.expo.dev/YAHAN-PROJECT-ID-DAALO"
},
"extra": {
  "eas": {
    "projectId": "YAHAN-PROJECT-ID-DAALO"
  }
}
```

### Step 6: App Build karo (SIRF EK BAAR)
```bash
eas build --platform android --profile production
```
Yeh .aab file banayega jo Play Store pe upload hogi.

---

## Baad Mein Code Update Karna (BAR BAR YAHI KARO)

Jab bhi koi screen, color, logic, ya text change karo:

```bash
cd artifacts/loading-fast-india
eas update --branch production --message "Kya change kiya likho"
```

**Bas! Itna hi!**
- Users ke phone mein automatically update aa jayegi
- Koi Play Store review nahi
- 5 minute mein sab users ko naya version mil jata hai

---

## Kya OTA Update Kar Sakta Hai?

### Kar Sakta Hai (Restart ki zarurat nahi):
- Screen design, colors, text
- Business logic, calculations
- Firebase paths, API changes
- New screens add karna
- Bug fixes

### Nahi Kar Sakta (Naya App Store Build Chahiye):
- Naya permission add karna (Camera, Location, etc.)
- New native package install karna
- App icon ya splash screen change

---

## App Mein Update Kaise Dikhega?

Jab user app kholta hai:
1. Background mein update check hoti hai
2. Agar update milti hai, download hoti hai
3. Screen ke neeche orange banner aata hai:
   **"🔄 Naya Update Available! — Restart karein"**
4. User tap karta hai → App restart → Naya version!

---

## Channels (Optional Advanced)

| Channel | Use |
|---------|-----|
| `production` | Live users ke liye |
| `staging` | Test karne ke liye |

```bash
# Test channel pe update
eas update --branch staging --message "Testing new feature"

# Production channel pe update  
eas update --branch production --message "Feature release v1.1"
```

---

## Jaruri Notes

- EAS Update FREE hai (1000 updates/month free)
- Paid plan: unlimited updates ~$29/month
- Apna EAS account: https://expo.dev/accounts/loadingfastindia
