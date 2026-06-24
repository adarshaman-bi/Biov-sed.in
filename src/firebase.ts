import { supabase } from './utils/supabaseClient';
import localMasterImport from './data/biovised_master_firestore_import.json';
import localPlaylistsJson from './data/playlists.json';
import localVideosJson from './data/videos.json';

// Define OperationType
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Emulate simple client-side Firestore db namespace
export const db = { isMock: true };

// Keep track of active Supabase user to return synchronously in auth.currentUser
let activeUser: any = null;

// Immediately hydrate Supabase session
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    activeUser = session.user;
  }
}).catch((err) => {
  if (!err?.message?.includes('Invalid API key')) {
    console.warn('Failed to retrieve initial session from Supabase in firebase initializer:', err);
  }
});

// Update in real-time
supabase.auth.onAuthStateChange((event, session) => {
  activeUser = session?.user || null;
});

// Mock Firebase auth object that forwards to Supabase
export const auth = {
  get currentUser() {
    if (!activeUser) return null;
    return {
      uid: activeUser.id,
      id: activeUser.id,
      email: activeUser.email,
      displayName: activeUser.user_metadata?.displayName || activeUser.user_metadata?.full_name || 'Pupil',
      emailVerified: !!activeUser.email_confirmed_at,
      isAnonymous: false,
      tenantId: null,
      providerData: []
    };
  },
  onAuthStateChanged: (callback: (user: any | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          uid: session.user.id,
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.full_name || 'Pupil',
        });
      } else {
        callback(null);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }
};

// -------------------------------------------------------------
// CLIENT-SIDE LOCALSTORAGE-BACKED FIRESTORE EMULATION LAYER
// -------------------------------------------------------------

export function collection(dbObj: any, path: string, ...subpaths: string[]): any {
  return { type: 'collection', path: [path, ...subpaths].join('/') };
}

export function doc(dbObj: any, path?: any, ...subpaths: any[]): any {
  if (!path) {
    const parentPath = dbObj?.path || 'auto_docs';
    const docId = `auto_${Math.random().toString(36).substring(2, 11)}`;
    return { type: 'doc', path: `${parentPath}/${docId}`, id: docId, delete: async () => {} };
  }
  // If the first argument is already a collection reference, use its path
  let basePrefix = typeof dbObj === 'object' && dbObj?.path ? dbObj.path : '';
  let parts: string[] = [];
  if (basePrefix) {
    parts.push(basePrefix);
  }
  if (path) {
    parts.push(path);
  }
  if (subpaths.length > 0) {
    parts.push(...subpaths);
  }
  const fullPath = parts.join('/');
  const docParts = fullPath.split('/');
  const docId = docParts[docParts.length - 1];
  return { type: 'doc', path: fullPath, id: docId, delete: async () => {} };
}

export async function getDoc(docRef: any) {
  const path = docRef?.path || '';
  const parts = path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  
  // Try to load any overrides from localStorage first
  const existing = localStorage.getItem(`fs_mock_${collectionName}_${docId}`);
  if (existing) {
    const parsed = JSON.parse(existing);
    return {
      exists: () => true,
      data: () => parsed,
      id: docId
    };
  }

  // Fallback to static master import structures
  if (collectionName === 'teachers') {
    const match = localMasterImport?.teachers?.find((t: any) => t.id === docId);
    if (match) return { exists: () => true, data: () => match, id: docId };
  }
  
  return {
    exists: () => false,
    data: () => null,
    id: docId
  };
}

export async function getDocs(queryObj: any): Promise<any> {
  const path = queryObj?.path || (queryObj?.collectionRef ? queryObj.collectionRef.path : '');
  const collectionName = path.split('/')[0];

  // Fetch local storage overrides
  const keys = Object.keys(localStorage);
  const localItems: any[] = [];
  const prefix = `fs_mock_${collectionName}_`;
  for (const k of keys) {
    if (k.startsWith(prefix)) {
      try {
        localItems.push(JSON.parse(localStorage.getItem(k) || '{}'));
      } catch {}
    }
  }

  // If there are overrides, we merge/use them. Else fallback to base datasets
  if (localItems.length === 0) {
    let docsArr: any[] = [];
    if (collectionName === 'teachers') {
      docsArr = (localMasterImport?.teachers || []).map((t: any) => ({
        data: () => t,
        id: t.id,
        ref: { type: 'doc', path: `teachers/${t.id}` }
      }));
    } else if (collectionName === 'test_series') {
      docsArr = (localMasterImport?.test_series || []).map((t: any) => ({
        data: () => t,
        id: t.id,
        ref: { type: 'doc', path: `test_series/${t.id}` }
      }));
    } else if (collectionName === 'playlists') {
      docsArr = (localPlaylistsJson || []).map((p: any) => ({
        data: () => p,
        id: p.id,
        ref: { type: 'doc', path: `playlists/${p.id}` }
      }));
    } else if (collectionName === 'videos' || collectionName === 'lectures') {
      docsArr = (localVideosJson || []).map((v: any) => ({
        data: () => v,
        id: v.id,
        ref: { type: 'doc', path: `${collectionName}/${v.id}` }
      }));
    }
    return {
      docs: docsArr,
      empty: docsArr.length === 0,
      size: docsArr.length,
      forEach: (callback: (d: any) => void) => {
        docsArr.forEach(callback);
      }
    };
  }

  const finalDocs = localItems.map((item: any) => ({
    data: () => item,
    id: item.id,
    ref: { type: 'doc', path: `${collectionName}/${item.id}` }
  }));

  return {
    docs: finalDocs,
    empty: finalDocs.length === 0,
    size: finalDocs.length,
    forEach: (callback: (d: any) => void) => {
      finalDocs.forEach(callback);
    }
  };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const path = docRef?.path || '';
  const parts = path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  
  if (options?.merge) {
    const key = `fs_mock_${collectionName}_${docId}`;
    const existing = localStorage.getItem(key);
    const current = existing ? JSON.parse(existing) : {};
    const updated = { ...current, ...data };
    localStorage.setItem(key, JSON.stringify(updated));
    return;
  }
  
  localStorage.setItem(`fs_mock_${collectionName}_${docId}`, JSON.stringify(data));
}

export async function updateDoc(docRef: any, updates: any) {
  const path = docRef?.path || '';
  const parts = path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  const key = `fs_mock_${collectionName}_${docId}`;
  const existing = localStorage.getItem(key);
  const current = existing ? JSON.parse(existing) : {};
  const updated = { ...current, ...updates };
  localStorage.setItem(key, JSON.stringify(updated));
}

export async function deleteDoc(docRef: any) {
  const path = docRef?.path || '';
  const parts = path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  localStorage.removeItem(`fs_mock_${collectionName}_${docId}`);
}

export function query(collectionRef: any, ...constraints: any[]): any {
  return { type: 'query', collectionRef, path: collectionRef?.path };
}

export function onSnapshot(
  queryObj: any,
  callback: (snap: any) => void,
  onError?: (err: any) => void
): any {
  getDocs(queryObj).then(callback).catch((err) => {
    if (onError) onError(err);
  });
  return () => {};
}

export function where(field: string, op: string, val: any) {
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, dir: string = 'asc') {
  return { type: 'orderBy', field, dir };
}

export function limit(v: number) {
  return { type: 'limit', val: v };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export function increment(val: number) {
  return val;
}

export function writeBatch(dbObj: any) {
  const ops: any[] = [];
  return {
    set: (docRef: any, data: any) => {
      ops.push({ type: 'set', docRef, data });
    },
    update: (docRef: any, updates: any) => {
      ops.push({ type: 'update', docRef, updates });
    },
    delete: (docRef: any) => {
      ops.push({ type: 'delete', docRef });
    },
    commit: async () => {
      for (const op of ops) {
        if (op.type === 'set') {
          await setDoc(op.docRef, op.data);
        } else if (op.type === 'update') {
          await updateDoc(op.docRef, op.updates);
        } else if (op.type === 'delete') {
          await deleteDoc(op.docRef);
        }
      }
    }
  };
}

// -------------------------------------------------------------
// CLIENT-SIDE Mock Firebase Storage
// -------------------------------------------------------------
export const storage = {
  app: {
    options: {
      storageBucket: 'biovised-storage-mock'
    }
  }
};

export function ref(storageObj: any, path: string) {
  return { type: 'storageRef', path };
}

export async function getDownloadURL(refObj: any) {
  return `https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=600&auto=format&fit=crop&q=60`;
}

export async function uploadBytes(refObj: any, bytes: any) {
  return { ref: refObj };
}

export async function deleteObject(refObj: any) {
  return true;
}

// Legacy error handling stub
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errText = error instanceof Error ? error.message : String(error);
  console.error('[Legacy Firestore Error Mocked]:', errText);
  throw new Error(errText);
}
