import { storage, auth, ref, uploadBytes, getDownloadURL, deleteObject } from '../firebase';

export type UserFolderType = 'profile' | 'notes' | 'documents' | 'uploads';

/**
 * Uploads a file to a specific path under a user's isolated directory:
 * users/{uid}/{type}/{fileName}
 * 
 * @param file The File object from input or drag-and-drop
 * @param type The folder category for access control mapping
 * @param customFileName Optional override for filename
 * @returns Promise with secure download URL and path
 */
export async function uploadUserFile(
  file: File,
  type: UserFolderType,
  customFileName?: string
): Promise<{ downloadUrl: string; fullPath: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required for storage uploads.');
  }

  const name = customFileName || `${Date.now()}_${file.name}`;
  const fullPath = `users/${user.uid}/${type}/${name}`;
  const storageRef = ref(storage, fullPath);

  try {
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return { downloadUrl, fullPath };
  } catch (error) {
    console.error(`Storage Upload Error [${fullPath}]:`, error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Retrieves the secure download URL for a given full storage path.
 * 
 * @param fullPath The full path of the file in Storage
 * @returns Secure download URL
 */
export async function getSecureDownloadUrl(fullPath: string): Promise<string> {
  const storageRef = ref(storage, fullPath);
  try {
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error(`Storage Download URL Error [${fullPath}]:`, error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Deletes a file from Firebase Storage.
 * 
 * @param fullPath The full path of the file to be deleted
 */
export async function deleteUserFile(fullPath: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required for storage deletions.');
  }

  // Basic client path-based protection sanity check (enforced fully by rules)
  if (!fullPath.startsWith(`users/${user.uid}/`) && !auth.currentUser?.email?.includes('admin')) {
    throw new Error('Unauthorized storage action hierarchy.');
  }

  const storageRef = ref(storage, fullPath);
  try {
    await deleteObject(storageRef);
  } catch (error) {
    console.error(`Storage Delete Error [${fullPath}]:`, error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}
