const crypto = require('crypto')
const dht = require('dht-rpc')

var key = shasum(Date.now().toString(16))

var bootstrap = dht({ ephemeral: true })
bootstrap.listen(10001)

var pops = []

createNodes(500)

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
  var distances = []

  if (n === 0) {
    return console.log(avg(pops.map(Number)))
  }

  bootstrap.query('_find_node', find)
    .on('data', function (data) {
      distances.push(xorDistance(data.node.id, find))
    })
    .on('end', function () {
      pops.push(estimatePopulation(distances.sort(Buffer.compare).slice(0, 20)))
      return query(shasum(find), n - 1)
    })
    .on('error', function (err) {
      console.log(this.table.unverified)
      throw err
    })
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
