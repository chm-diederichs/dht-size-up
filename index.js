const crypto = require('crypto')
const dht = require('dht-rpc')

var key = shasum(Date.now().toString(16))

var bootstrap = dht({ ephemeral: true })
bootstrap.listen(10001)

var pops = []

coeffs = new Array(256)
var test = Buffer.alloc(32)

// for (let i = 1; i < 256; i++) coeffs[i] = coeffs[i - 1] + 0.5 ** (i + 1)
console.log(coeffs)

// TEST WITH HASHES

// var tests = []

// for (let i = 0; i < 100; i++) {
//   tests.push(key)
//   key = shasum(key)
// }

// for (let i = 0; i < 1000; i++) {
//   pops.push(estimatePopulation(tests.map(a => xorDistance(a, test)).sort(Buffer.compare).slice(0, 20)))
//   test = shasum(test)
// }
// console.log(Number(pops.reduce((acc, a) => acc + a)) / pops.length)

createNodes(1000)

const nodes = []
function createNodes (n) {
  var node = dht({ bootstrap: [ 'localhost:10001' ] })

  node.on('ready', function () {
    nodes.push(node)
    if (n === 0) return query(key, 1000)
    return createNodes(--n)
  })
}

function query (find, n) {
  console.log(n)
  var distances = []

  if (n === 0) {
    console.log(pops)
    console.log(pops.reduce((acc, a) => acc + a) / BigInt(pops.length))
    return
  }

  bootstrap.query('_find_node', find)
    .on('data', function (data) {
      distances.push(xorDistance(data.node.id, find))
    })
    .on('end', function () {
      pops.push(estimatePopulation(distances))
      return query(shasum(find), n - 1)
    })
    .on('error', function (err) {
      console.log(this.table.unverified)
      throw err
    })
}

function estimate (data) {
  var specificVolume = data.reduce((acc, a) => acc + a)
  console.log(specificVolume, 'sv')

  var number = Number(specificVolume / 256)
  return number / data.length
}

function coeff (n, k, p) {
  var c = 1
  for (let i = 1; i < n; i++) {
    c *= i * p
    c /= i <= k ? i : i - k
  }

  return c
}

function estimatePopulation (arr) {
  var sorted = arr.sort(Buffer.compare)
  const furthest = BigInt('0x' + sorted.pop().toString('hex'))

  const probability = Number(2n ** 256n / furthest)
  var est1 =  BigInt(arr.length * probability)

  return est1
}

function shasum (data) {
  return crypto.createHash('sha256').update(data).digest()
}

function bitCount32 (n) {
  n = n - ((n >> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
  return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
}

function bufferBitCount (buf) {
  var count = 0

  for (let i = 0; i < buf.byteLength; i += 4) {
    count += bitCount32(buf.readUInt32LE(i))
  }

  return count
}

function bigIntSub (a, b) {
  return BigInt(a) - BigInt(b)
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
