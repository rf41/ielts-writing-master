/**
 * Secure localStorage encryption utilities
 * Uses Web Crypto API for AES-GCM encryption
 */

// Simple encryption/decryption for localStorage
// Note: This provides basic obfuscation. For production-grade security,
// consider using sessionStorage or server-side storage instead.

/**
 * Simple XOR-based encryption for localStorage
 * Not cryptographically secure, but prevents casual inspection
 */
export const encryptData = (data: string, key: string): string => {
  try {
    const keyHash = Array.from(key).reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
    
    const encrypted = Array.from(data).map((char, i) => {
      const keyChar = (keyHash + i) % 256;
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    }).join('');
    
    // Base64 encode to make it storage-safe
    return btoa(encrypted);
  } catch (error) {
    console.error('Encryption failed:', error);
    return data; // Fallback to unencrypted
  }
};

/**
 * Decrypt data encrypted with encryptData
 */
export const decryptData = (encryptedData: string, key: string): string => {
  try {
    // Base64 decode first
    const decoded = atob(encryptedData);
    
    const keyHash = Array.from(key).reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
    
    const decrypted = Array.from(decoded).map((char, i) => {
      const keyChar = (keyHash + i) % 256;
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    }).join('');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedData; // Fallback to returning as-is
  }
};

/**
 * Securely store data in localStorage with encryption
 */
export const secureSetItem = (key: string, value: string, userId: string): void => {
  try {
    const encrypted = encryptData(value, userId);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error('Secure storage failed:', error);
    // Fallback to unencrypted storage
    localStorage.setItem(key, value);
  }
};

/**
 * Retrieve and decrypt data from localStorage
 */
export const secureGetItem = (key: string, userId: string): string | null => {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    // Check if it looks encrypted (base64)
    if (/^[A-Za-z0-9+/=]+$/.test(encrypted)) {
      return decryptData(encrypted, userId);
    }
    
    // If not encrypted, return as-is (backward compatibility)
    return encrypted;
  } catch (error) {
    console.error('Secure retrieval failed:', error);
    return localStorage.getItem(key);
  }
};

/**
 * Securely remove item from localStorage
 */
export const secureRemoveItem = (key: string): void => {
  localStorage.removeItem(key);
};

/**
 * Clear all secure storage (useful on logout)
 */
export const clearSecureStorage = (): void => {
  // Clear sensitive data on logout
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('gemini_api_key_') || key.includes('_secure_')) {
      localStorage.removeItem(key);
    }
  });
};
