import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import sharp from "sharp"
import { adminJwtSecret } from "@/lib/admin-auth"

export const CAPTCHA_COOKIE = "admin_captcha"
export const CAPTCHA_SECONDS = 300

export function captchaHash(token: string, answer: string) {
  return createHmac("sha256", adminJwtSecret()).update(`${token}:${answer.trim().toUpperCase()}`).digest("hex")
}

export function captchaMatches(token: string, answer: string, hash: string) {
  const actual = Buffer.from(captchaHash(token, answer), "hex")
  const expected = Buffer.from(hash, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function createCaptchaImage() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const answer = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("")
  const letters = [...answer].map((letter, index) => {
    const x = 24 + index * 35
    const y = randomInt(42, 56)
    return `<text x="${x}" y="${y}" transform="rotate(${randomInt(-12, 13)} ${x} ${y})" font-family="sans-serif" font-size="32" font-weight="700" fill="#765315">${letter}</text>`
  }).join("")
  const noise = Array.from({ length: 45 }, () => `<circle cx="${randomInt(250)}" cy="${randomInt(76)}" r="1" fill="#bc9448" opacity=".5"/>`).join("")
  const lines = Array.from({ length: 4 }, () => `<path d="M0 ${randomInt(76)} Q125 ${randomInt(76)} 250 ${randomInt(76)}" stroke="#bc9448" fill="none" opacity=".45"/>`).join("")
  const png = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="250" height="76"><rect width="250" height="76" rx="8" fill="#fcf7ed"/>${noise}${letters}${lines}</svg>`)).png().toBuffer()
  return { answer, image: `data:image/png;base64,${png.toString("base64")}` }
}
