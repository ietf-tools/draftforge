import { checkNits, MODES } from '@ietf-tools/idnits'
import { Buffer } from 'node:buffer'

export async function checkIdnits (text, filename, mode = MODES.NORMAL, offline = false) {
  const enc = new TextEncoder()
  // convert to Node Buffer expected by checkNits
  return checkNits(Buffer.from(enc.encode(text)), filename, {
    mode,
    offline
  })
}
