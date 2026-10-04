#!/usr/bin/env node
/**
 * Restore a CertiStage backup (.json.gz from the admin Backups card or the
 * weekly backup email) into a MongoDB database.
 *
 *   node scripts/restore-backup.mjs certistage-backup-2026-10-03.json.gz --uri "mongodb+srv://..."
 *
 * Options:
 *   --only recipients,events   restore only these collections
 *   --drop                     empty each collection before restoring it
 *   --dry-run                  show what would happen and exit
 *
 * Without --drop, documents are inserted with their original ids and ones
 * that already exist are skipped, so a restore on top of live data only
 * fills in what is missing. Admin password hashes are not in the file; use
 * the setup route or reset-admin-password.js afterwards if needed.
 */
import { readFileSync } from "node:fs"
import { gunzipSync, inflateRawSync } from "node:zlib"
import { MongoClient, BSON } from "mongodb"

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith("--"))
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const uri = opt("--uri") || process.env.MONGODB_URI
const only = opt("--only")?.split(",").map((s) => s.trim()).filter(Boolean)
const drop = args.includes("--drop")
const dryRun = args.includes("--dry-run")

if (!file || !uri) {
  console.error("Usage: node scripts/restore-backup.mjs <backup.zip | backup.json.gz> --uri <MONGODB_URI> [--only a,b] [--drop] [--dry-run]")
  process.exit(1)
}

// Emailed backups are a .zip holding the .json.gz; downloads are the .json.gz itself
function backupBytes(path) {
  const buf = readFileSync(path)
  if (buf.readUInt32LE(0) !== 0x04034b50) return buf
  const method = buf.readUInt16LE(8)
  const size = buf.readUInt32LE(18)
  const start = 30 + buf.readUInt16LE(26) + buf.readUInt16LE(28)
  const data = buf.subarray(start, start + size)
  return method === 8 ? inflateRawSync(data) : data
}

const backup = BSON.EJSON.parse(gunzipSync(backupBytes(file)).toString("utf8"))
if (backup?.format !== "certistage-backup/1") { console.error("Not a CertiStage backup file"); process.exit(1) }

// Collection names as mongoose stores them
const collectionFor = { users: "users", admins: "admins", events: "events", certificateTypes: "certificatetypes", recipients: "recipients", payments: "payments", settings: "settings", trashItems: "trashitems" }

console.log(`Backup from ${new Date(backup.createdAt).toISOString()}`)
const plan = Object.entries(backup.collections).filter(([key]) => !only || only.includes(key))
for (const [key, docs] of plan) console.log(`${key}: ${docs.length} documents -> ${collectionFor[key] || key}${drop ? " (drop first)" : ""}`)
if (dryRun) { console.log("Dry run complete, nothing written"); process.exit(0) }

const client = new MongoClient(uri)
await client.connect()
const db = client.db()
for (const [key, docs] of plan) {
  if (docs.length === 0) continue
  const col = db.collection(collectionFor[key] || key)
  if (drop) await col.deleteMany({})
  try {
    const res = await col.insertMany(docs, { ordered: false })
    console.log(`  inserted ${res.insertedCount}`)
  } catch (err) {
    if (err?.code === 11000 || err?.writeErrors) console.log(`  inserted ${err.result?.insertedCount ?? err.insertedCount ?? 0}, skipped ${err.writeErrors?.length ?? 0} already present`)
    else throw err
  }
}
await client.close()
console.log("Restore complete")
