import { gzipSync, gunzipSync } from "zlib"
import { BSON } from "mongodb"

/**
 * Backup file format: gzip-compressed canonical Extended JSON, so ObjectIds
 * and dates survive a round trip and `scripts/restore-backup.mjs` can put the
 * documents back exactly as they were.
 */
export const BACKUP_FORMAT = "certistage-backup/1"

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  createdAt: Date
  app: string
  collections: Record<string, unknown[]>
}

export function serializeBackup(collections: Record<string, unknown[]>, app = "CertiStage"): Buffer {
  const file: BackupFile = { format: BACKUP_FORMAT, createdAt: new Date(), app, collections }
  const json = BSON.EJSON.stringify(file, { relaxed: false })
  return gzipSync(Buffer.from(json, "utf8"), { level: 9 })
}

export function parseBackup(buffer: Buffer): BackupFile {
  const json = gunzipSync(buffer).toString("utf8")
  const file = BSON.EJSON.parse(json) as BackupFile
  if (file?.format !== BACKUP_FORMAT) throw new Error("Not a CertiStage backup file")
  return file
}

export function backupFilename(date = new Date()): string {
  return `certistage-backup-${date.toISOString().slice(0, 10)}.json.gz`
}
