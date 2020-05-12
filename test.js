const query = require('./')
const sha256 = require('sha256-wasm')
const dht = require('dht-rpc')

var bootstrap = dht({ ephemeral: true })
bootstrap.listen(10001)

createNodes(1000)

function createNodes (n) {
  dht({ bootstrap: ['localhost:10001'] })
    .on('ready', function () {
      if (n === 0) return query(bootstrap, console.log)
      return createNodes(--n)
    })
}
