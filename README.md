# Colombo Vapes ERP (Liquid Glass PWA)

GitHub Pages eken run wena, phone / tablet / PC eke install karanna puluwan app ekak.
Net nathi welawata invoice gahanna puluwan — net awa gaman auto sync wenawa.

## Thiyena modules
Dashboard · Invoice/POS (barcode scan, Retail/Wholesale/Loyalty, Hold/Recall, Cash/Card/Transfer/Cheque/Credit) ·
Returns · Stock (+/− adjust, Excel, print) · GRN (weighted cost, barcode labels, pending GRN) · Stock Verify ·
Products · Customers (credit, payments, history) · Suppliers (outstanding, pay) · Employees (login, attendance, pay) ·
Cash In/Out · Reports 18ක් (Invoice summary, Daily sales, Item sales, P&L, Cash collection, Stock movement…) · Settings/Backup.

---

## 1. Firebase hadanna (free, minutes 10)
1. https://console.firebase.google.com → **Add project** → nama `colombovapes-erp`.
2. **Build → Authentication → Get started → Email/Password → Enable**.
3. **Authentication → Users → Add user**
   - Email: `admin@colombovapes.lk`   (username `admin`)
   - Password: oyata kamathi ekak (min 6)
4. **Build → Firestore Database → Create database** → location `asia-south1` (Mumbai) → *production mode*.
5. **Firestore → Rules** tab eke, me project eke `firestore.rules` file eke thiyena eka paste karala **Publish**.
6. **Project settings (⚙) → Your apps → Web (</>)** → app ekak register karanna → pennana `firebaseConfig` eka copy karanna.
7. `js/config.js` open karala `firebase: { ... }` athulata ewa paste karanna.

## 2. GitHub eke danna
1. GitHub eke aluth repo ekak hadanna (e.g. `colombovapes-erp`).
2. Me folder eke files okkoma upload karanna (**Add file → Upload files**).
3. **Settings → Pages → Branch: `main` / root → Save**.
4. Minute 1kin link eka enawa: `https://<username>.github.io/colombovapes-erp/`
5. Firebase console → **Authentication → Settings → Authorized domains** → `<username>.github.io` add karanna.

## 3. Palaweni login
1. Link eka open karala `admin` saha password eken login wenna.
2. Dashboard eke **Import now** click karanna → parana ERP eke products 71, stock, suppliers 3, expense categories enawa.
3. **Employees → Add employee** eken cashier la add karanna (eyalage login eka automatically hadenawa).

## 4. App ekak widihata install karanna
- **Android (Chrome):** menu ⋮ → *Install app* / *Add to Home screen*
- **iPhone (Safari):** Share → *Add to Home Screen*
- **PC (Chrome/Edge):** address bar eke install icon eka

## 5. Device godak use karanawanam
**Settings → Me device eka** eke hama device ekatama wenama code ekak denna (shop PC = `A`, phone = `B`…).
Ethakota offline welawe device dekakin invoice gahuwath number eka clash wenne naha (A185, B1…).

## Offline wada karana widiya
- App eka load wenne device eke cache eken — net naha wuna instant.
- Invoice, return, GRN, payments okkoma device eke save wela, header eke **Offline · 3 pending** wage pennanawa.
- Net awa gaman Firebase ekata yanawa → **Online · Synced**.
- Stock adu wenne "increment" widihata, ehema nisa device dekakin ekama welawe wikunuwath ganan hariyatama ekathu wenawa.
- Palaweni login eka saha aluth employee kenek hadanna witharak net ona.

## Update karanna
Code wenas karala upload karaddi `sw.js` eke `VERSION` eka wenas karanna (e.g. `cv-erp-v1.0.1`).
Ethakota hama device ekakma aluth version eka gannawa.

## Demo mode
`js/config.js` eke `apiKey` his nam app eka demo mode eke run wenawa (login `admin` / `admin123`, data me browser eke witharai).
