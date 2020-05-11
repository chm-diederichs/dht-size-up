const crypto = require('crypto')
const dht = require('dht-rpc')
// const distance = require('xor-distance')

var key = shasum(Date.now().toString(16))

var test = Buffer.from('d25df0e0420aefd3b7142d892d0bf38f09a7575504aee700fac313a873dc23f8', 'hex')
var target = Buffer.from('cca010e60d853f6d8be93c1752de18daea2112caae81e3c6ca98dde139fb998f', 'hex')

var ref = shasum('reference')

var bootstrap = dht({ ephemeral: true })
bootstrap.listen(10001)

var tests = []
for (let i = 0; i < 10000; i++) {
  tests.push(key)
  key = shasum(key)
}

var pops = []

coeffs = new Array(256)
coeffs[0] = 0
for (let i = 1; i < 256; i++) coeffs[i] = coeffs[i - 1] + coeff(256, i, 0.5)

for (let i = 0; i < 1000; i++) {
  pops.push(findVolume(tests.map(a => xorDistance(a, test)).sort((a, b) => a - b).slice(0, 20)))
  test = shasum(test)
}
console.log(pops.reduce((acc, a) => acc + a) / pops.length)

createNodes(1000)

const nodes = []
function createNodes (n) {
  var node = dht({ bootstrap: [ 'localhost:10001' ] })

  node.on('ready', function () {
    nodes.push(node)
    if (n === 0) return query(key, 999)
    return createNodes(--n)
  })
}

function query (find, n) {
  console.log(n)
  var distances = []

  if (n === 0) return console.log(pops.reduce((acc, a) => acc + a) / pops.length)

  nodes[n].query('_find_node', find)
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
  const furthest = Math.max(...arr)
  return arr.length / coeffs[furthest]
}

function bufferNotPresentIn (buf, arr) {
  if (!arr.length) return true
  return arr.findIndex(b => Buffer.compare(buf, b) === 0) < 0
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

function sortXorDistance (ref) {
  return (a, b) => xorDistance(a, ref) - xorDistance(b, ref)
}

function xorDistance (a, b) {
  return bufferBitCount(bufferXor(a, b))
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

function closest (nodes, key) {
  var min = Number.MAX_SAFE_INTEGER
  ret = null

  var tmp
  for (let i = 0; i < nodes.length; i++) {
    tmp = xorDistance(nodes[i], key)
    if (tmp < min) {
      min = tmp
      ret = nodes[i]
    }
  }


  return ret
}
