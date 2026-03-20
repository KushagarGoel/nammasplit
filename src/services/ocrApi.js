/**
 * OCR API Service
 * Calls the Python Flask API with EasyOCR for menu extraction
 */

const API_URL = import.meta.env.VITE_OCR_API_URL || 'http://localhost:5000';

/**
 * Process a single menu image using the EasyOCR API
 * @param {File|Blob} file - The image file to process
 * @returns {Promise<{items: Array, rawText: string}>}
 */
export async function processMenuImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_URL}/ocr`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `OCR request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Process multiple menu images using the batch API
 * @param {Array<File|Blob>} files - The image files to process
 * @param {Function} onProgress - Callback for progress updates (0-100)
 * @returns {Promise<{items: Array, rawText: string}>}
 */
export async function processBatchImages(files, onProgress = () => {}) {
    const formData = new FormData();
    files.forEach((file, index) => {
        formData.append('images', file);
        onProgress(Math.round((index / files.length) * 50)); // Upload progress
    });

    const response = await fetch(`${API_URL}/ocr/batch`, {
        method: 'POST',
        body: formData,
    });

    onProgress(100);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `OCR batch request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Check if the OCR API is available
 * @returns {Promise<boolean>}
 */
export async function isOcrApiAvailable() {
    try {
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            timeout: 5000,
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Validate and normalize a menu item
 * New structure: { name, description, category: 'VEG'|'NON_VEG'|'UNKNOWN', price }
 * @param {Object} item - The menu item to validate
 * @returns {Object} - Validated item with defaults
 */
export function validateMenuItem(item) {
    const validCategories = ['VEG', 'NON_VEG', 'UNKNOWN'];
    const category = validCategories.includes(item.category) ? item.category : 'UNKNOWN';

    return {
        name: (item.name || '').trim().substring(0, 100),
        description: item.description || null,
        category: category,
        price: Math.max(0, parseFloat(item.price) || 0),
    };
}

/**
 * Batch validate multiple menu items
 * @param {Array} items - Array of menu items
 * @returns {Array} - Validated items
 */
export function validateMenuItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map(validateMenuItem).filter(item => item.name.length > 0);
}
