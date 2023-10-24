const sha256 = require('sha256-wasm')

module.exports = query

function query (dht, n, find, pops = [], nodes, ips = new Set(), cb) {
  if (typeof n === 'function') return query(dht, 20, null, [], null, new Set(), n)
  if (typeof find === 'function') return query(dht, n, null, [], null, new Set(), find)
  if (typeof pops === 'function') return query(dht, n, find, [], null, new Set(), pops)
  if (typeof nodes === 'function') return query(dht, n, find, pops, null, new Set(), nodes)
  if (typeof ips === 'function') return query(dht, n, find, nodes, pops, new Set(), ips)

  if (!nodes) nodes = new Set()

  if (!find) find = shasum(Date.now().toString(16))

  if (n === 0) {
    const average = Math.round(avg(pops))
    const result = Math.max(average, nodes.size)
    return cb(null, result, nodes.size, pops.length, [...ips])
  }

  const distances = []

  dht.findNode(find)
    .on('data', function (data) {
      if (data.from.host) ips.add(data.from.hot)
      if (data.from.id) {
        nodes.add(data.from.id.toString('hex'))
        distances.push(xorDistance(data.from.id, find))
      }
      if (data.closerNodes) {
        for (const n of data.closerNodes) {
          ips.add(n.host)
        }
      }
    })
    .on('end', function () {
      if (distances.length) pops.push(estimatePopulation(distances))
      return query(dht, n - 1, shasum(find), pops, nodes, ips, cb)
    })
    .on('error', function (err) {
      return cb(err)
    })
}

function estimatePopulation (arr) {
  const len = Math.min(20, arr.length - 6)
  const sorted = arr.sort(Buffer.compare).slice(0, len)

  const limit = BigInt('0x' + sorted.pop().toString('hex'))

  // BigInt only supports int division so use reciprocal
  const scaleBy = Number(2n ** 256n / limit)
  const estimate = len * scaleBy

  return estimate
}

function shasum (data) {
  return Buffer.from(sha256().update(data).digest())
}

function xorDistance (a, b) {
  return bufferXor(a, b)
}

function bufferXor (a, b) {
  let short = Buffer.alloc(32, a)
  let long = Buffer.alloc(32, b)

  if (short.byteLength > long.byteLength) {
    const tmp = short
    short = long
    long = tmp
  }

  for (let i = 0; i < short.byteLength; i++) {
    short[i] ^= long[i]
  }

  return short
}

function avg (arr) {
  if (!arr.length) return 0
  return arr.reduce((acc, a) => acc + a) / arr.length
}
