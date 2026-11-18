// ============================================================
//  Colombo Vapes ERP - settings
//  1. Firebase console eken "Web app" ekak hadala, eke config eka
//     pahala `firebase` ekata paste karanna.
//  2. apiKey eka his nam app eka "Demo mode" eke run wenawa
//     (data save wenne me device eke witharai).
// ============================================================
export const CONFIG = {
  firebase: {
    apiKey: "AIzaSyA6fQFhu8FZ4x4VyJ7eGoCFFEaFZIDGP60",
    authDomain: "colombovapes-erp.firebaseapp.com",
    projectId: "colombovapes-erp",
    storageBucket: "colombovapes-erp.firebasestorage.app",
    messagingSenderId: "319774496381",
    appId: "1:319774496381:web:9dc04555bd22a9b9f3c314"
  },
  // Login username eka email ekak bawata harawanne me domain eken
  // e.g. "admin" -> admin@colombovapes.lk
  loginDomain: "colombovapes.lk",
  shop: {
    name: "Colombo Vapes",
    tagline: "Sri Lanka",
    phone: "075-231-9683",
    address: "Colombo",
    receiptFooter: "Thank you! Come again."
  },
  currency: "Rs"
};
