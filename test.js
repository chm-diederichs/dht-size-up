const query = require('./')
const DHT = require('dht-rpc')

main()

async function main () {
  const bootstrap = new DHT({
    ephemeral: true,
    firewalled: false,
    port: 10001
  })

  await bootstrap.ready()

  const all = [bootstrap]
  for (let i = 0; i < 1000; i++) {
    all.push(new DHT({ bootstrap: ['localhost:10001'] }))
  }

  await Promise.all(all.map(n => n.ready()))
  query(all[all.length - 1], console.log)
}
