const crypto = require('crypto');

// Algorithm for encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Get encryption key from environment variable
 * @returns {Buffer} - The encryption key
 */
function getKey() {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables');
  }

  // Ensure the key is 32 bytes for AES-256
  return crypto.scryptSync(encryptionKey, 'salt', 32);
}

/**
 * Encrypt a string value
 * @param {string} text - The text to encrypt
 * @returns {string} - The encrypted text in hex format
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted
    const result = Buffer.concat([salt, iv, tag, encrypted]);

    return result.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedHex - The encrypted text in hex format
 * @returns {string} - The decrypted text
 */
function decrypt(encryptedHex) {
  if (!encryptedHex || typeof encryptedHex !== 'string') {
    return encryptedHex;
  }

  try {
    const key = getKey();
    const data = Buffer.from(encryptedHex, 'hex');

    // Extract components
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.subarray(ENCRYPTED_POSITION);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt an object's specified fields
 * @param {Object} obj - The object to encrypt
 * @param {Array<string>} fields - The fields to encrypt
 * @returns {Object} - The object with encrypted fields
 */
function encryptObject(obj, fields) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const encrypted = { ...obj };

  fields.forEach(field => {
    if (encrypted[field]) {
      // Handle Date objects
      if (encrypted[field] instanceof Date) {
        encrypted[field] = encrypt(encrypted[field].toISOString());
      } else {
        encrypted[field] = encrypt(String(encrypted[field]));
      }
    }
  });

  return encrypted;
}

/**
 * Decrypt an object's specified fields
 * @param {Object} obj - The object to decrypt
 * @param {Array<string>} fields - The fields to decrypt
 * @returns {Object} - The object with decrypted fields
 */
function decryptObject(obj, fields) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const decrypted = { ...obj };

  fields.forEach(field => {
    if (decrypted[field]) {
      decrypted[field] = decrypt(decrypted[field]);
    }
  });

  return decrypted;
}

/**
 * Encrypt donor sensitive data
 * @param {Object} donor - The donor object
 * @returns {Object} - The donor object with encrypted sensitive fields
 */
function encryptDonorData(donor) {
  const sensitiveFields = ['fullName', 'birthDate', 'bloodType', 'phone', 'address'];
  return encryptObject(donor, sensitiveFields);
}

/**
 * Decrypt donor sensitive data
 * @param {Object} donor - The donor object with encrypted data
 * @returns {Object} - The donor object with decrypted sensitive fields
 */
function decryptDonorData(donor) {
  const sensitiveFields = ['fullName', 'birthDate', 'bloodType', 'phone', 'address'];
  const decrypted = decryptObject(donor, sensitiveFields);

  // Convert birthDate back to Date object if it exists
  if (decrypted.birthDate) {
    decrypted.birthDate = new Date(decrypted.birthDate);
  }

  return decrypted;
}

module.exports = {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  encryptDonorData,
  decryptDonorData,
};
