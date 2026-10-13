const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function fakeSig(len = 64) {
  let out = ''
  for (let i = 0; i < len; i += 1) out += B58[Math.floor(Math.random() * B58.length)]
  return out
}

export function short(value: string, left = 4, right = 4) {
  if (value.length <= left + right + 1) return value
  return `${value.slice(0, left)}…${value.slice(-right)}`
}
