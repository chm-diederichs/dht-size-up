const sha256 = require('sha256-wasm')

module.exports = query

function query (dht, n, find, pops = [], nodes, cb) {
  if (typeof n === 'function') return query(dht, 20, null, [], null, n)
  if (typeof find === 'function') return query(dht, n, null, [], null, find)
  if (typeof pops === 'function') return query(dht, n, find, [], null, pops)
  if (typeof set === 'function') return query(dht, n, find, [], null, set)

  if (!nodes) nodes = new Set()

  if (!find) find = shasum(Date.now().toString(16))

  if (n === 0) {
    var average = Math.round(avg(pops))
    var result = Math.max(average, nodes.size)
    return cb(null, result, nodes.size, pops.length)
  }

  var distances = []

  dht.query('_find_node', find)
    .on('data', function (data) {
      if (data.node.id) {
        nodes.add(data.node.id.toString('hex'))
        distances.push(xorDistance(data.node.id, find))
      }
    })
    .on('end', function () {
      pops.push(estimatePopulation(distances))
      return query(dht, n - 1, shasum(find), pops, nodes, cb)
    })
    .on('error', function (err) {
      return cb(err)
    })
}

function estimatePopulation (arr) {
  var len = Math.min(20, arr.length - 6)
  var sorted = arr.sort(Buffer.compare).slice(0, len)

  const limit = BigInt('0x' + sorted.pop().toString('hex'))

  // BigInt only supports int division so use reciprocal
  const scaleBy = Number(2n ** 256n / limit)
  var estimate = len * scaleBy

  return estimate
}

function shasum (data) {
  return Buffer.from(sha256().update(data).digest())
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
