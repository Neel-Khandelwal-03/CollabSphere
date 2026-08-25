import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Uploads a FormData payload with real progress events. Plain `fetch`
 * has no upload-progress API at all — XMLHttpRequest is the only way to
 * get one in a browser, which is why this exists as its own utility
 * rather than being folded into the shared `api` fetch wrapper every
 * other hook in this app uses.
 *
 * @param {string} path - API path, e.g. '/files'
 * @param {FormData} formData
 * @param {(percent: number) => void} [onProgress]
 * @param {(xhr: XMLHttpRequest) => void} [onAbortRef] - receives the xhr so the caller can abort()
 */
export function uploadWithProgress(path, formData, onProgress, onAbortRef) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const accessToken = useAuthStore.getState().accessToken;

    xhr.open('POST', `${API_URL}${path}`);
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.message || 'Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed — network error'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));

    if (onAbortRef) onAbortRef(xhr);
    xhr.send(formData);
  });
}
