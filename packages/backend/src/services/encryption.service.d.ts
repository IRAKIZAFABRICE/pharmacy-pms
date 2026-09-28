/**
 * Data Encryption Service
 *
 * Provides column-level encryption for sensitive patient data
 * compliant with Rwanda Data Privacy Law (Law Nº 058/2021).
 *
 * Features:
 * - AES-256-GCM symmetric encryption for PII fields
 * - Deterministic encryption for searchable fields (phone, email)
 * - Key rotation support
 * - Automatic decryption on read
 * - Audit logging of all encryption operations
 */
export declare class EncryptionService {
    private algorithm;
    private key;
    private keyVersion;
    private ivLength;
    private authTagLength;
    constructor();
    /**
     * Encrypt a value using AES-256-GCM
     * Returns: iv:authTag:ciphertext:keyVersion
     */
    encrypt(plaintext: string): string;
    /**
     * Decrypt a value that was encrypted with AES-256-GCM
     * Input format: iv:authTag:ciphertext:keyVersion
     */
    decrypt(encryptedString: string): string;
    /**
     * Deterministic encryption for searchable fields (phone, email)
     * Uses AES-256-GCM with deterministic IV derived from the plaintext
     * This allows exact matching while still being encrypted
     */
    deterministicEncrypt(plaintext: string): string;
    /**
     * Search for an encrypted value (for deterministic fields only)
     */
    searchEncrypted(searchValue: string): string;
    /**
     * Encrypt all PII fields in a patient/sale object
     */
    encryptPatientData(data: {
        name?: string;
        phone?: string;
        email?: string;
        patientId?: string;
    }): {
        name?: string;
        phone: string;
        email?: string;
        patientId: string;
    };
    /**
     * Decrypt all PII fields in a patient/sale object
     */
    decryptPatientData(data: {
        name?: string;
        phone?: string;
        email?: string;
        patientId?: string;
    }): {
        name?: string;
        phone?: string;
        email?: string;
        patientId?: string;
    };
    /**
     * Rotate encryption key (re-encrypt all data with new key)
     * This is a placeholder - in production, this would be a batch process
     */
    rotateKey(newKeyHex: string): Promise<void>;
    /**
     * Get encryption status
     */
    getStatus(): {
        algorithm: string;
        keyVersion: number;
        keyConfigured: boolean;
        ivLength: number;
        authTagLength: number;
        environment: string;
    };
}
declare const _default: EncryptionService;
export default _default;
//# sourceMappingURL=encryption.service.d.ts.map