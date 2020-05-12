# dht-size-up

Estimate the size of a DHT using find_node queries.

```
npm install dht-size-up
```

## Usage

``` js
const size = require('dht-size-up')
const dht = require('dht-rpc')

var bootstrap = dht({ ephemeral: true })
bootstrap.listen(10001)

createNodes(1000)

function createNodes (n) {
  dht({ bootstrap: ['localhost:10001'] })
    .on('ready', function () {
      if (n === 0) return size(bootstrap, console.log)
      return createNodes(--n)
    })
}
```

## API

#### size(dht, [n = 1000], cb)

Returns an estimate of the size of the DHT or an error to the callback `cb`. `dht` should be node capable of performing `_find_node` queries to the network. `n` is the number of trials to perform, default is 1000.

## License

MIT
