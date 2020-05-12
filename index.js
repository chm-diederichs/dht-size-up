const sha256 = require('sha256-wasm')

module.exports = query

function query (dht, n, find, pops = [], cb) {
  if (typeof n === 'function') return query(dht, 10000, null, [], n)
  if (typeof find === 'function') return query(dht, n, null, [], find)
  if (typeof pops === 'function') return query(dht, n, find, [], pops)

  if (!find) find = shasum(Date.now().toString(16))

  if (n === 0) return cb(null, Math.round(avg(pops)))
  var distances = []

  dht.query('_find_node', find)
    .on('data', function (data) {
      distances.push(xorDistance(data.node.id, find))
    })
    .on('end', function () {
      pops.push(estimatePopulation(distances))
      return query(dht, n - 1, shasum(find), pops, cb)
    })
    .on('error', function (err) {
      return cb(err)
    })
}

function estimatePopulation (arr) {
  var sorted = arr.sort(Buffer.compare).slice(0, 20)
  const limit = BigInt('0x' + sorted.pop().toString('hex'))

  // BigInt only supports int division so use reciprocal
  const scaleBy = Number(2n ** 256n / limit)
  var estimate =  20 * scaleBy

  return estimate
}

function shasum (data) {
  return sha256().update(data).digest()
}

function xorDistance (a, b) {
  return bufferXor(a, b)
}

function bufferXor (a, b) {
  var short = Buffer.alloc(32, a)
  var long = Buffer.alloc(32, b)

  if (short.byteLength > long.byteLength) {
    var tmp = short
    short = long
    long = tmp
  }

  for (let i = 0; i < short.byteLength; i++) {
    short[i] ^= long[i]
  }

  return short
}

function avg (arr) {
  return arr.reduce((acc, a) => acc + a) / arr.length
}
