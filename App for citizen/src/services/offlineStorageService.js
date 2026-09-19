/**
 * PRITHVI-SHIELD / SafeGround Offline Storage & Image Optimization Service
 * Reliable IndexedDB storage for offline emergency hazard reports and evidence images.
 * Eliminates localStorage QuotaExceededError by storing compressed image blobs in IndexedDB.
 */

const DB_NAME = 'safeground_offline_db';
const DB_VERSION = 1;
const STORE_REPORTS = 'offline_reports';
const STORE_IMAGES = 'offline_images';

/**
 * Compresses and downscales photos for efficient offline storage and rapid disaster transmission.
 * Limits max dimension to 1280px while preserving landslide forensic clarity.
 */
export async function compressImage(source, maxDimension = 1280, quality = 0.8) {
  if (!source) return null;

  return new Promise((resolve) => {
    try {
      // If running in an environment without document/Image, return source
      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        return resolve(source);
      }

      let srcUrl = source;
      let isObjectUrl = false;
      if (typeof File !== 'undefined' && source instanceof File) {
        srcUrl = URL.createObjectURL(source);
        isObjectUrl = true;
      } else if (typeof Blob !== 'undefined' && source instanceof Blob) {
        srcUrl = URL.createObjectURL(source);
        isObjectUrl = true;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // If image is already within bounds and small, return original
          if (width <= maxDimension && height <= maxDimension && typeof source === 'string' && source.length < 400000) {
            if (isObjectUrl) URL.revokeObjectURL(srcUrl);
            return resolve(source);
          }

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (isObjectUrl) URL.revokeObjectURL(srcUrl);
            return resolve(source);
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          if (isObjectUrl) URL.revokeObjectURL(srcUrl);
          resolve(compressedDataUrl);
        } catch (canvasErr) {
          console.warn('[OfflineStorage] Canvas compression note:', canvasErr);
          if (isObjectUrl) URL.revokeObjectURL(srcUrl);
          resolve(source);
        }
      };

      img.onerror = () => {
        if (isObjectUrl) URL.revokeObjectURL(srcUrl);
        resolve(source);
      };

      img.src = srcUrl;
    } catch (e) {
      console.warn('[OfflineStorage] Image processing note:', e);
      resolve(source);
    }
  });
}

/**
 * Open or upgrade the IndexedDB database
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'reportId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class OfflineStorageService {
  /**
   * Saves a hazard report and its evidence image offline in IndexedDB.
   * Compresses the image first and separates image payload from report metadata.
   */
  async queueReportOffline(report, rawImageData) {
    try {
      const reportId = report.id || report.report_code || `off_${Date.now()}`;
      report.id = reportId;
      report.status = 'WAITING_FOR_CONNECTION';
      report.isOfflineQueued = true;
      report.queuedAt = new Date().toISOString();

      let compressedPhoto = null;
      if (rawImageData) {
        compressedPhoto = await compressImage(rawImageData, 1280, 0.82);
      }

      const db = await openDatabase();

      // Store image in image store
      if (compressedPhoto) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_IMAGES, 'readwrite');
          const store = tx.objectStore(STORE_IMAGES);
          store.put({
            reportId,
            imageData: compressedPhoto,
            savedAt: new Date().toISOString()
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      // Clone report metadata WITHOUT heavy image data
      const metadataOnly = { ...report };
      delete metadataOnly.photo;
      delete metadataOnly.image_data;
      metadataOnly.hasOfflineImage = !!compressedPhoto;

      // Store metadata in report store
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_REPORTS, 'readwrite');
        const store = tx.objectStore(STORE_REPORTS);
        store.put(metadataOnly);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Keep a tiny index in localStorage for zero-latency UI counts
      this._updateLocalStorageIndex(reportId, 'add');

      console.info(`[OfflineStorage] Successfully queued report ${reportId} with compressed photo in IndexedDB`);
      return report;
    } catch (err) {
      console.warn('[OfflineStorage] Fallback to memory/localStorage queue:', err);
      // Fallback: strip image data if saving to localStorage to prevent QuotaExceededError
      const safeReport = { ...report, hasOfflineImage: false };
      delete safeReport.photo;
      delete safeReport.image_data;
      const queue = JSON.parse(localStorage.getItem('safeground_offline_report_queue') || '[]');
      queue.unshift(safeReport);
      localStorage.setItem('safeground_offline_report_queue', JSON.stringify(queue));
      return safeReport;
    }
  }

  /**
   * Retrieves all pending offline reports with their attached photos restored
   */
  async getPendingReports() {
    try {
      const db = await openDatabase();

      // 1. Fetch all report metadata
      const reports = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_REPORTS, 'readonly');
        const store = tx.objectStore(STORE_REPORTS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      // 2. Attach photos from image store
      for (const rep of reports) {
        if (rep.hasOfflineImage) {
          const imgRecord = await new Promise((resolve) => {
            const tx = db.transaction(STORE_IMAGES, 'readonly');
            const store = tx.objectStore(STORE_IMAGES);
            const req = store.get(rep.id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          });
          if (imgRecord && imgRecord.imageData) {
            rep.photo = imgRecord.imageData;
            rep.image_data = imgRecord.imageData;
          }
        }
      }

      return reports;
    } catch (e) {
      console.warn('[OfflineStorage] Error retrieving pending reports:', e);
      return JSON.parse(localStorage.getItem('safeground_offline_report_queue') || '[]');
    }
  }

  /**
   * Deletes a report and its associated photo from IndexedDB after successful cloud confirmation
   */
  async removeReport(reportId) {
    try {
      const db = await openDatabase();
      await new Promise((resolve) => {
        const tx = db.transaction([STORE_REPORTS, STORE_IMAGES], 'readwrite');
        tx.objectStore(STORE_REPORTS).delete(reportId);
        tx.objectStore(STORE_IMAGES).delete(reportId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      this._updateLocalStorageIndex(reportId, 'remove');
    } catch (e) {
      console.warn('[OfflineStorage] Remove note:', e);
    }
  }

  _updateLocalStorageIndex(reportId, action) {
    try {
      const KEY = 'safeground_offline_ids';
      let ids = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (action === 'add') {
        if (!ids.includes(reportId)) ids.push(reportId);
      } else {
        ids = ids.filter(i => i !== reportId);
      }
      if (ids.length) localStorage.setItem(KEY, JSON.stringify(ids));
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }
}

export const offlineStorageService = new OfflineStorageService();
