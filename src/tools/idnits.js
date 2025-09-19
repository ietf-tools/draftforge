import { checkNits, MODES } from '@ietf-tools/idnits'

export async function checkIdnits (text, filename, mode = MODES.NORMAL, offline = false) {
  const enc = new TextEncoder()
  return checkNits(new Uint8Array(enc.encode(text)), filename, {
    mode,
    offline
  })
}
