'use strict'

function long2ip (long) {
  const a = (long & (0xff << 24)) >>> 24
  const b = (long & (0xff << 16)) >>> 16
  const c = (long & (0xff << 8)) >>> 8
  const d = long & 0xff
  return [a, b, c, d].join('.')
}

function ip2long (ip) {
  const b = String(ip).split('.')
  if ((b.length === 0) || (b.length > 4)) throw new Error('Invalid IP')
  for (let i = 0; i < b.length; i++) {
    const byte = b[i]
    if (isNaN(parseInt(byte, 10))) throw new Error(`Invalid byte: ${byte}`)
    if (byte < 0 || byte > 255) throw new Error(`Invalid byte: ${byte}`)
  }
  return ((b[0] || 0) << 24 | (b[1] || 0) << 16 | (b[2] || 0) << 8 | (b[3] || 0)) >>> 0
}

function ipArray (firstAddress, lastAddress) {
  const first = ip2long(firstAddress)
  const last = ip2long(lastAddress)
  if (last - first < 0) throw new Error('IP Address range is negative')

  const array = []
  for (let ipaddr = first; ipaddr < last; ipaddr++) {
    array.push(long2ip(ipaddr))
  }
  return array
}

module.exports = { long2ip, ip2long, ipArray }
