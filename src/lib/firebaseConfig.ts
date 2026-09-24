import rawConfig from "../../firebase-applet-config.json";

function resolveVal(
  envVal: string | undefined,
  rawVal: string | undefined,
  defaultVal = ""
): string {
  if (envVal && !envVal.startsWith("${")) return envVal;
  if (rawVal && !rawVal.startsWith("${")) return rawVal;
  return defaultVal;
}

const metaEnv = typeof import.meta !== "undefined" ? ((import.meta as any).env || {}) : {};
const procEnv = typeof process !== "undefined" ? (process.env || {}) : {};

export const firebaseConfig = {
  projectId: resolveVal(
    metaEnv.VITE_FIREBASE_PROJECT_ID || procEnv.FIREBASE_PROJECT_ID || procEnv.VITE_FIREBASE_PROJECT_ID,
    rawConfig.projectId,
    "effing-magic"
  ),
  appId: resolveVal(
    metaEnv.VITE_FIREBASE_APP_ID || procEnv.FIREBASE_APP_ID || procEnv.VITE_FIREBASE_APP_ID,
    rawConfig.appId,
    "1:579357537302:web:5d9f708d7fe6c5e813f137"
  ),
  apiKey: resolveVal(
    metaEnv.VITE_FIREBASE_API_KEY || procEnv.FIREBASE_API_KEY || procEnv.VITE_FIREBASE_API_KEY,
    rawConfig.apiKey,
    ""
  ),
  authDomain: resolveVal(
    metaEnv.VITE_FIREBASE_AUTH_DOMAIN || procEnv.FIREBASE_AUTH_DOMAIN || procEnv.VITE_FIREBASE_AUTH_DOMAIN,
    rawConfig.authDomain,
    "effing-magic.firebaseapp.com"
  ),
  storageBucket: resolveVal(
    metaEnv.VITE_FIREBASE_STORAGE_BUCKET || procEnv.FIREBASE_STORAGE_BUCKET || procEnv.VITE_FIREBASE_STORAGE_BUCKET,
    rawConfig.storageBucket,
    "effing-magic.firebasestorage.app"
  ),
  messagingSenderId: resolveVal(
    metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || procEnv.FIREBASE_MESSAGING_SENDER_ID || procEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    rawConfig.messagingSenderId,
    "579357537302"
  ),
  measurementId: resolveVal(
    metaEnv.VITE_FIREBASE_MEASUREMENT_ID || procEnv.FIREBASE_MEASUREMENT_ID || procEnv.VITE_FIREBASE_MEASUREMENT_ID,
    rawConfig.measurementId,
    ""
  ),
  oAuthClientId: resolveVal(
    metaEnv.VITE_FIREBASE_OAUTH_CLIENT_ID || procEnv.FIREBASE_OAUTH_CLIENT_ID || procEnv.VITE_FIREBASE_OAUTH_CLIENT_ID,
    rawConfig.oAuthClientId,
    "579357537302-76lddi9918ohh31mq1antheadlcg4t2p.apps.googleusercontent.com"
  ),
  recaptchaSiteKey: resolveVal(
    metaEnv.VITE_FIREBASE_RECAPTCHA_SITE_KEY || procEnv.FIREBASE_RECAPTCHA_SITE_KEY || procEnv.VITE_FIREBASE_RECAPTCHA_SITE_KEY,
    rawConfig.recaptchaSiteKey,
    ""
  ),
  firestoreDatabaseId: resolveVal(
    metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || procEnv.FIREBASE_FIRESTORE_DATABASE_ID || procEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
    (rawConfig as any).firestoreDatabaseId,
    ""
  )
};

export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
  typeof firebaseConfig.apiKey === "string" &&
  firebaseConfig.apiKey.trim().length > 0 &&
  !firebaseConfig.apiKey.startsWith("${") &&
  firebaseConfig.apiKey !== "undefined" &&
  firebaseConfig.apiKey !== "null"
);

export default firebaseConfig;
