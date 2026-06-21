import CryptoJS from 'crypto-js'

const STORAGE_KEY_RECORDS = 'health_records_encrypted'
const STORAGE_KEY_INDICATORS = 'health_indicators'
const STORAGE_KEY_AUTH = 'health_auth_hash'

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString()
}

export function setPassword(password: string): void {
  const hash = hashPassword(password)
  localStorage.setItem(STORAGE_KEY_AUTH, hash)
}

export function verifyPassword(password: string): boolean {
  const stored = localStorage.getItem(STORAGE_KEY_AUTH)
  if (!stored) return false
  return hashPassword(password) === stored
}

export function hasPassword(): boolean {
  return !!localStorage.getItem(STORAGE_KEY_AUTH)
}

export function encryptData(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password).toString()
}

export function decryptData(encrypted: string, password: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, password)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (!decrypted) return null
    return decrypted
  } catch {
    return null
  }
}

export function saveEncryptedRecords(records: unknown, password: string): void {
  const json = JSON.stringify(records)
  const encrypted = encryptData(json, password)
  localStorage.setItem(STORAGE_KEY_RECORDS, encrypted)
}

export function loadEncryptedRecords<T>(password: string): T | null {
  const encrypted = localStorage.getItem(STORAGE_KEY_RECORDS)
  if (!encrypted) return null
  const decrypted = decryptData(encrypted, password)
  if (!decrypted) return null
  try {
    return JSON.parse(decrypted) as T
  } catch {
    return null
  }
}

export function cacheIndicators(indicators: unknown): void {
  localStorage.setItem(STORAGE_KEY_INDICATORS, JSON.stringify(indicators))
}

export function loadCachedIndicators<T>(): T | null {
  const raw = localStorage.getItem(STORAGE_KEY_INDICATORS)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
