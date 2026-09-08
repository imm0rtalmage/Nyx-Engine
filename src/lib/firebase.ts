import { initializeApp } from "firebase/app";
import { 
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  browserPopupRedirectResolver,
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  memoryLocalCache,
  setLogLevel,
  collection, 
  doc, 
  setDoc as firebaseSetDoc, 
  getDoc, 
  getDocs, 
  updateDoc as firebaseUpdateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc as firebaseAddDoc,
  DocumentReference,
  WithFieldValue,
  UpdateData,
  PartialWithFieldValue,
  SetOptions,
  CollectionReference
} from "firebase/firestore";

import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with a robust persistence fallback chain.
// Since this app runs inside an iframe (AI Studio preview), indexedDB might be sandboxed or blocked by the browser.
// Falling back to browserLocalPersistence (localStorage) and browserSessionPersistence (sessionStorage) prevents
// the dreaded "INTERNAL ASSERTION FAILED: Pending promise was never set" error.
const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver
});

// Initialize Firestore with single-tab persistent local cache (or in-memory cache if sandboxed/restricted).
// Using persistentSingleTabManager avoids the legacy MultiTab lease manager that attempts to write
// "zombie client id" entries to localStorage during pagehide/unload, which fails inside sandboxed iframes.
const firestoreDatabaseId = (firebaseConfig as any).firestoreDatabaseId;
let db: ReturnType<typeof getFirestore>;

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({})
    })
  }, firestoreDatabaseId);
} catch {
  try {
    db = initializeFirestore(app, {
      localCache: memoryLocalCache()
    }, firestoreDatabaseId);
  } catch {
    db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  }
}

try {
  setLogLevel("error");
} catch {
  // ignore
}

// Suppress benign sandbox WebSocket rejections (HMR disabled in container), zombie client ID, and unprovisioned Firestore database warnings
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    if (
      msg.includes("@firebase/firestore") || 
      msg.includes("Database '(default)' not found") || 
      msg.includes("zombie client id") || 
      msg.includes("Failed to set zombie client id")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    if (
      msg.includes("Failed to set zombie client id") || 
      msg.includes("zombie client id") || 
      msg.includes("Database '(default)' not found")
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || String(event.reason || "");
    if (
      reason.includes("WebSocket closed") || 
      reason.includes("vite") || 
      reason.includes("Database '(default)' not found") ||
      reason.includes("zombie client id") ||
      reason.includes("Firestore")
    ) {
      event.preventDefault();
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
GOOGLE_WORKSPACE_SCOPES.forEach((scope) => googleProvider.addScope(scope));

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
    // If it's a custom class/object from Firestore SDK (e.g. FieldValue, Timestamp), don't mutate or traverse it
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

export function setDoc<T>(reference: DocumentReference<T>, data: WithFieldValue<T>): Promise<void>;
export function setDoc<T>(reference: DocumentReference<T>, data: PartialWithFieldValue<T>, options: SetOptions): Promise<void>;
export function setDoc<T>(reference: DocumentReference<T>, data: any, options?: any): Promise<void> {
  const sanitizedData = sanitizeForFirestore(data);
  return firebaseSetDoc(reference, sanitizedData, options);
}

export function updateDoc<T>(reference: DocumentReference<T>, data: UpdateData<T>): Promise<void>;
export function updateDoc(reference: DocumentReference<any>, data: any): Promise<void> {
  const sanitizedData = sanitizeForFirestore(data);
  return firebaseUpdateDoc(reference, sanitizedData);
}

export function addDoc<T>(reference: CollectionReference<T>, data: WithFieldValue<T>): Promise<DocumentReference<T>> {
  const sanitizedData = sanitizeForFirestore(data);
  return firebaseAddDoc(reference, sanitizedData);
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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
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
  googleProvider,
  googleDriveProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
};
export type { User };
