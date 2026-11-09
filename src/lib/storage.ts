import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    type: isPdf ? 'pdf' : 'image',
    mimeType: file.type as MessageAttachment['mimeType'],
    size: file.size,
  };
}
