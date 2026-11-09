import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { firebaseStorage, isFirebaseConfigured } from './firebaseClient';
import type { MessageAttachment } from '@/types/tribbu.types';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAttachmentFile(file: File): UploadValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Format non autorisé (${file.name}). Seuls les fichiers .png, .jpg et .pdf sont acceptés.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Le fichier "${file.name}" dépasse la limite maximale de 10 Mo.`,
    };
  }

  return { valid: true };
}

/**
 * Téléverse un fichier (.png, .jpg, .pdf) dans Firebase Cloud Storage (`chat-attachments/...`)
 * ou génère une Data URL locale en mode démo hors-ligne.
 */
export async function uploadChatAttachment(
  file: File,
  canalId: string,
  userId: string
): Promise<MessageAttachment> {
  const validation = validateAttachmentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const isPdf = file.type === 'application/pdf';
  const ext = file.name.split('.').pop()?.toLowerCase() || (isPdf ? 'pdf' : 'png');
  const attachmentId = crypto.randomUUID();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `chat-attachments/${canalId}/${userId}/${attachmentId}_${safeFileName}`;

  if (isFirebaseConfigured && firebaseStorage) {
    const fileRef = ref(firebaseStorage, storagePath);
    await uploadBytes(fileRef, file, {
      contentType: file.type,
      cacheControl: 'public,max-age=3600',
    });

    const publicUrl = await getDownloadURL(fileRef);

    return {
      id: attachmentId,
      name: file.name || `document.${ext}`,
      url: publicUrl,
      storagePath,
      type: isPdf ? 'pdf' : 'image',
      mimeType: file.type as MessageAttachment['mimeType'],
      size: file.size,
    };
  }

  // Mode Démo / Prévisualisation locale : conversion en Data URL
  const localUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Impossible de lire le fichier local.'));
    reader.readAsDataURL(file);
  });

  return {
    id: attachmentId,
    name: file.name,
    url: localUrl,
    storagePath,
    type: isPdf ? 'pdf' : 'image',
    mimeType: file.type as MessageAttachment['mimeType'],
    size: file.size,
  };
}

/**
 * Supprime définitivement de Firebase Cloud Storage tous les fichiers (images, PDF, etc.)
 * postés dans l'ensemble des canaux d'une association lors de sa suppression par le Grand Manitou.
 */
export async function deleteAssociationStorageFiles(
  attachments: MessageAttachment[],
  canalIds: string[]
): Promise<number> {
  if (!isFirebaseConfigured || !firebaseStorage) {
    return attachments.length;
  }

  let deletedCount = 0;
  const deletedPaths = new Set<string>();

  // 1. Suppression directe par storagePath ou URL Firebase Storage référencée dans les messages
  for (const att of attachments) {
    const targetRefStr =
      att.storagePath ||
      (att.url && att.url.startsWith('http') && !att.url.startsWith('data:')
        ? att.url
        : null);
    if (!targetRefStr || deletedPaths.has(targetRefStr)) continue;

    try {
      const fileRef = ref(firebaseStorage, targetRefStr);
      await deleteObject(fileRef);
      deletedPaths.add(targetRefStr);
      deletedCount++;
    } catch {
      // Ignore si l'objet a déjà été supprimé ou s'il s'agissait d'une URL externe/locale
    }
  }

  // 2. Balayage exhaustif de chaque dossier `chat-attachments/{canalId}/{userId}/{file}`
  for (const canalId of canalIds) {
    try {
      const canalFolderRef = ref(firebaseStorage, `chat-attachments/${canalId}`);
      const canalList = await listAll(canalFolderRef);

      for (const itemRef of canalList.items) {
        if (!deletedPaths.has(itemRef.fullPath)) {
          try {
            await deleteObject(itemRef);
            deletedPaths.add(itemRef.fullPath);
            deletedCount++;
          } catch {
            // Ignore
          }
        }
      }

      for (const userFolderRef of canalList.prefixes) {
        try {
          const userFiles = await listAll(userFolderRef);
          for (const fileRef of userFiles.items) {
            if (!deletedPaths.has(fileRef.fullPath)) {
              try {
                await deleteObject(fileRef);
                deletedPaths.add(fileRef.fullPath);
                deletedCount++;
              } catch {
                // Ignore
              }
            }
          }
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore si les règles Storage n'autorisent pas listAll
    }
  }

  return Math.max(deletedCount, attachments.length);
}
