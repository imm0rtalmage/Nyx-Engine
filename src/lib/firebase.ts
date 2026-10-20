import { initializeApp, getApps } from "firebase/app";
import { 
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  browserPopupRedirectResolver,
  signInWithPopup as firebaseSignInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
  Auth
} from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  memoryLocalCache,
  setLogLevel,
  collection as firebaseCollection, 
  doc as firebaseDoc, 
  setDoc as firebaseSetDoc, 
  getDoc as firebaseGetDoc, 
  getDocs as firebaseGetDocs, 
  updateDoc as firebaseUpdateDoc, 
  deleteDoc as firebaseDeleteDoc, 
  onSnapshot as firebaseOnSnapshot,
  query as firebaseQuery, 
  where,
  orderBy,
  addDoc as firebaseAddDoc,
  DocumentReference,
  WithFieldValue,
  UpdateData,
  PartialWithFieldValue,
  SetOptions,
  CollectionReference,
  Firestore
} from "firebase/firestore";

import firebaseConfig, { isFirebaseConfigured } from "./firebaseConfig";

// Dummy Auth fallback for unconfigured or sandboxed environments
const dummyAuth: any = {
  currentUser: null,
  name: "[Firebase Offline/Unconfigured]",
  config: {},
  app: null,
  onAuthStateChanged: () => () => {},
  signOut: async () => {},
};

let app: any = null;
let auth: Auth = dummyAuth;
let db: Firestore | any = null;

if (isFirebaseConfigured) {
  try {
    const existingApps = getApps();
    app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);

    try {
      auth = initializeAuth(app, {
        persistence: [browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver
      });
    } catch (authErr) {
      console.warn("Firebase Auth initialization error (falling back to local mode):", authErr);
      auth = dummyAuth;
    }

    const firestoreDatabaseId = (firebaseConfig as any).firestoreDatabaseId && (firebaseConfig as any).firestoreDatabaseId.trim().length > 0
      ? (firebaseConfig as any).firestoreDatabaseId.trim()
      : undefined;

    try {
      db = firestoreDatabaseId
        ? initializeFirestore(app, {
            localCache: persistentLocalCache({
              tabManager: persistentSingleTabManager({})
            })
          }, firestoreDatabaseId)
        : initializeFirestore(app, {
            localCache: persistentLocalCache({
              tabManager: persistentSingleTabManager({})
            })
          });
    } catch {
      try {
        db = firestoreDatabaseId
          ? initializeFirestore(app, {
              localCache: memoryLocalCache()
            }, firestoreDatabaseId)
          : initializeFirestore(app, {
              localCache: memoryLocalCache()
            });
      } catch {
        try {
          db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
        } catch (dbErr) {
          console.warn("Firestore initialization error (falling back to local storage):", dbErr);
          db = null;
        }
      }
    }
  } catch (appErr) {
    console.warn("Firebase App initialization failed (running in offline local mode):", appErr);
    app = null;
    auth = dummyAuth;
    db = null;
  }
} else {
  console.info("Firebase is unconfigured (VITE_FIREBASE_API_KEY missing) - running in full local offline mode.");
}

try {
  setLogLevel("error");
} catch {
  // ignore
}

// Quota tracker for Firestore free tier limits (avoids spamming backoff retries when daily writes are exhausted)
let quotaExhausted = false;
let quotaExhaustedUntil = 0;

export function isFirestoreQuotaExhausted(): boolean {
  if (!quotaExhausted) {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("nyx_firestore_quota_exhausted");
        if (stored) {
          const resetTime = parseInt(stored, 10);
          if (Date.now() < resetTime) {
            quotaExhausted = true;
            quotaExhaustedUntil = resetTime;
            return true;
          } else {
            sessionStorage.removeItem("nyx_firestore_quota_exhausted");
          }
        }
      } catch {}
    }
    return false;
  }
  if (Date.now() > quotaExhaustedUntil) {
    quotaExhausted = false;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("nyx_firestore_quota_exhausted");
      } catch {}
    }
    return false;
  }
  return true;
}

export function markFirestoreQuotaExhausted(cooldownMs: number = 3600000) {
  const nextReset = Date.now() + cooldownMs;
  if (!quotaExhausted || nextReset > quotaExhaustedUntil) {
    quotaExhausted = true;
    quotaExhaustedUntil = nextReset;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("nyx_firestore_quota_exhausted", String(quotaExhaustedUntil));
        window.dispatchEvent(new CustomEvent("nyx:firestore-quota-exhausted", {
          detail: {
            exhaustedUntil: quotaExhaustedUntil,
            message: "Firestore daily free write quota reached. Seamlessly running in Offline Local Mode."
          }
        }));
      } catch {}
    }
  }
}

// Suppress benign sandbox WebSocket rejections (HMR disabled in container), zombie client ID, and unprovisioned Firestore database warnings
if (typeof window !== "undefined") {
  const isIgnorableFirestoreError = (msg: string) => {
    return (
      msg.includes("Failed to set zombie client id") || 
      msg.includes("zombie client id") || 
      msg.includes("Database '(default)' not found") || 
      msg.includes("auth/invalid-api-key") ||
      msg.includes("invalid-api-key") ||
      msg.includes("resource-exhausted") ||
      msg.includes("Quota limit exceeded") ||
      msg.includes("Free daily write units per project") ||
      msg.includes("maximum backoff delay") ||
      msg.includes("to prevent overloading the backend")
    );
  };

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    if (msg.includes("@firebase/firestore") || isIgnorableFirestoreError(msg)) {
      if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || msg.includes("Free daily write units")) {
        markFirestoreQuotaExhausted();
      }
      return;
    }
    originalWarn.apply(console, args);
  };

  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    if (msg.includes("@firebase/firestore") || isIgnorableFirestoreError(msg)) {
      if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || msg.includes("Free daily write units")) {
        markFirestoreQuotaExhausted();
      }
      return;
    }
    originalError.apply(console, args);
  };

  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    if (
      msg.includes("auth/invalid-api-key") ||
      msg.includes("invalid-api-key") ||
      msg.includes("Firebase: Error (auth/invalid-api-key)") ||
      msg.includes("resource-exhausted") ||
      msg.includes("Quota limit exceeded") ||
      msg.includes("Free daily write units per project") ||
      msg.includes("maximum backoff delay")
    ) {
      event.preventDefault();
      if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || msg.includes("Free daily write units")) {
        markFirestoreQuotaExhausted();
      }
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || String(event.reason || "");
    if (
      reason.includes("auth/invalid-api-key") ||
      reason.includes("invalid-api-key") ||
      reason.includes("WebSocket closed") || 
      reason.includes("vite") || 
      reason.includes("Database '(default)' not found") ||
      reason.includes("zombie client id") ||
      reason.includes("Firestore") ||
      reason.includes("resource-exhausted") ||
      reason.includes("Quota limit exceeded") ||
      reason.includes("Free daily write units per project") ||
      reason.includes("maximum backoff delay")
    ) {
      event.preventDefault();
      if (reason.includes("resource-exhausted") || reason.includes("Quota limit exceeded") || reason.includes("Free daily write units")) {
        markFirestoreQuotaExhausted();
      }
    }
  });
}

export const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/tasks"
];

const googleProvider = new GoogleAuthProvider();
// Keep standard account sign-in lightweight and high-reliability
googleProvider.setCustomParameters({ prompt: "select_account" });

const googleDriveProvider = new GoogleAuthProvider();
GOOGLE_WORKSPACE_SCOPES.forEach((scope) => googleDriveProvider.addScope(scope));

// Helper to recursively remove undefined properties or replace them with null
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null) {
    return null;
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.filter((item: any) => item !== undefined).map(sanitizeForFirestore);
  }
  if (typeof obj === "object") {
    if (obj.constructor && obj.constructor.name !== "Object" && obj.constructor.name !== "Array") {
      return obj;
    }
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        sanitized[key] = sanitizeForFirestore(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}

export const cleanForFirestore = sanitizeForFirestore;

// Safe Firestore and Auth Wrappers
export const onAuthStateChanged = (
  authInstance: any,
  nextOrObserver: any,
  error?: any,
  completed?: any
) => {
  if (!isFirebaseConfigured || !authInstance || authInstance === dummyAuth) {
    if (typeof nextOrObserver === "function") {
      setTimeout(() => {
        try {
          nextOrObserver(null);
        } catch (e) {
          console.warn("safe onAuthStateChanged error:", e);
        }
      }, 0);
    } else if (nextOrObserver && typeof nextOrObserver.next === "function") {
      setTimeout(() => {
        try {
          nextOrObserver.next(null);
        } catch (e) {
          console.warn("safe onAuthStateChanged error:", e);
        }
      }, 0);
    }
    return () => {};
  }
  try {
    return firebaseOnAuthStateChanged(authInstance, nextOrObserver, error, completed);
  } catch (err) {
    console.warn("onAuthStateChanged error caught gracefully:", err);
    if (typeof nextOrObserver === "function") {
      setTimeout(() => nextOrObserver(null), 0);
    }
    return () => {};
  }
};

export const signInWithPopup = async (authInstance: any, provider: any) => {
  if (!isFirebaseConfigured || !authInstance || authInstance === dummyAuth) {
    throw new Error(
      "Firebase Cloud Sync is in offline local mode (missing API key). Your campaigns and stories are stored safely on this device!"
    );
  }
  return firebaseSignInWithPopup(authInstance, provider);
};

export const signOut = async (authInstance: any) => {
  if (!isFirebaseConfigured || !authInstance || authInstance === dummyAuth) {
    return Promise.resolve();
  }
  return firebaseSignOut(authInstance);
};

export function doc(...args: any[]): any {
  if (!args[0] || !isFirebaseConfigured) {
    return { id: args[2] || `doc_${Date.now()}`, path: args[1] || "" };
  }
  try {
    return (firebaseDoc as any)(...args);
  } catch (err) {
    return { id: args[2] || `doc_${Date.now()}`, path: args[1] || "" };
  }
}

export function collection(...args: any[]): any {
  if (!args[0] || !isFirebaseConfigured) {
    return { id: "local-collection", path: args[1] || "" };
  }
  try {
    return (firebaseCollection as any)(...args);
  } catch (err) {
    return { id: "local-collection", path: args[1] || "" };
  }
}

export function query(...args: any[]): any {
  if (!args[0] || !isFirebaseConfigured) {
    return { id: "local-query" };
  }
  try {
    return (firebaseQuery as any)(...args);
  } catch (err) {
    return { id: "local-query" };
  }
}

export function onSnapshot(...args: any[]): any {
  if (!isFirebaseConfigured || !args[0] || !db) {
    return () => {};
  }
  try {
    const errorCallbackIdx = typeof args[2] === "function" ? 2 : (typeof args[1] === "function" ? -1 : 1);
    if (errorCallbackIdx === 2) {
      const origErr = args[2];
      args[2] = (err: any) => {
        const msg = err?.message || String(err || "");
        if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || msg.includes("Free daily write units") || err?.code === "resource-exhausted") {
          markFirestoreQuotaExhausted();
          return;
        }
        origErr(err);
      };
    } else if (errorCallbackIdx === 1 && args[1] && typeof args[1] === "object" && typeof args[1].error === "function") {
      const origErr = args[1].error;
      args[1].error = (err: any) => {
        const msg = err?.message || String(err || "");
        if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || msg.includes("Free daily write units") || err?.code === "resource-exhausted") {
          markFirestoreQuotaExhausted();
          return;
        }
        origErr(err);
      };
    }

    return (firebaseOnSnapshot as any)(...args);
  } catch (err: any) {
    const msg = err?.message || String(err || "");
    if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || err?.code === "resource-exhausted") {
      markFirestoreQuotaExhausted();
    }
    return () => {};
  }
}

export async function getDoc(reference: any): Promise<any> {
  if (!isFirebaseConfigured || !reference || !db) {
    return Promise.resolve({ exists: () => false, data: () => null });
  }
  try {
    return await firebaseGetDoc(reference);
  } catch (err: any) {
    const msg = err?.message || String(err || "");
    if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || err?.code === "resource-exhausted") {
      markFirestoreQuotaExhausted();
    }
    return Promise.resolve({ exists: () => false, data: () => null });
  }
}

export async function getDocs(reference: any): Promise<any> {
  if (!isFirebaseConfigured || !reference || !db) {
    return Promise.resolve({ empty: true, docs: [] });
  }
  try {
    return await firebaseGetDocs(reference);
  } catch (err: any) {
    const msg = err?.message || String(err || "");
    if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || err?.code === "resource-exhausted") {
      markFirestoreQuotaExhausted();
    }
    return Promise.resolve({ empty: true, docs: [] });
  }
}

export async function deleteDoc(reference: any): Promise<void> {
  if (!isFirebaseConfigured || !reference || !db || isFirestoreQuotaExhausted()) {
    return Promise.resolve();
  }
  try {
    return await firebaseDeleteDoc(reference);
  } catch (err: any) {
    const msg = err?.message || String(err || "");
    if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || msg.includes("Free daily write units") || err?.code === "resource-exhausted") {
      markFirestoreQuotaExhausted();
    }
    return Promise.resolve();
  }
}

export async function setDoc<T>(reference: any, data: any, options?: any): Promise<void> {
  if (!isFirebaseConfigured || !reference || !db || isFirestoreQuotaExhausted()) {
    return Promise.resolve();
  }
  try {
    const sanitizedData = sanitizeForFirestore(data);
    return await firebaseSetDoc(reference, sanitizedData, options);
  } catch (err: any) {
    const msg = err?.message || String(err || "");
    if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || msg.includes("Free daily write units") || err?.code === "resource-exhausted") {
      markFirestoreQuotaExhausted();
    }
    return Promise.resolve();
  }
}

export async function updateDoc(reference: any, data: any): Promise<void> {
  if (!isFirebaseConfigured || !reference || !db || isFirestoreQuotaExhausted()) {
    return Promise.resolve();
  }
  try {
    const sanitizedData = sanitizeForFirestore(data);
    return await firebaseUpdateDoc(reference, sanitizedData);
  } catch (err: any) {
    const msg = err?.message || String(err || "");
    if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || msg.includes("Free daily write units") || err?.code === "resource-exhausted") {
      markFirestoreQuotaExhausted();
    }
    return Promise.resolve();
  }
}

export async function addDoc<T>(reference: any, data: any): Promise<any> {
  if (!isFirebaseConfigured || !reference || !db || isFirestoreQuotaExhausted()) {
    return Promise.resolve({ id: `local_${Date.now()}` });
  }
  try {
    const sanitizedData = sanitizeForFirestore(data);
    return await firebaseAddDoc(reference, sanitizedData);
  } catch (err: any) {
    const msg = err?.message || String(err || "");
    if (msg.includes("resource-exhausted") || msg.includes("Quota limit exceeded") || msg.includes("Free daily write units") || err?.code === "resource-exhausted") {
      markFirestoreQuotaExhausted();
    }
    return Promise.resolve({ id: `local_${Date.now()}` });
  }
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export {
  auth,
  db,
  isFirebaseConfigured,
  googleProvider,
  googleDriveProvider,
  where,
  orderBy
};
export type { User };
