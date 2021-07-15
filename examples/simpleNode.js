const RF24MeshSerialNode = require('../RF24MeshSerialNode.js')

let bootcount = 0
let globalnode = null

function StartRF24MeshNode() {
  RF24MeshSerialNode.find({
    inittimeout: 2500,
    cmdtimeout: 250
  }, async function (node) {
    if (node) {
      globalnode = node;

      console.log("FOUND: " + node.portnumber)

      node.on('close', async () => {
        globalnode = null;
        console.log("Disconnected")
      })

      node.on('newnode', async () => {
        console.log("New node connected. Nodes: " + await node.getNodelist())
      })

      node.on('receive', async (from, type, buffer) => {
        let bvalue = [];
        for (const value of buffer)
          bvalue.push(value.toString(16))

        console.log(`Data arrived from ${from} with type ${type} data: ` + bvalue)
      })

      await node.getVersion()
        .then((version) => console.log("Version: " + version))
        .catch((error) => console.log("Version ERROR: " + error.message))

      async function startup() {
        await node.setNodeId(0)
          .then(() => node.setSpeed(0))
          .then(() => node.begin())
          .then(() => console.log("Started..."))
          .catch((error) => console.log("Startup ERROR: " + error.message))
      }

      bootcount++
      node.on('reready', () => {
        bootcount++
        console.log(`Bootcount: ${bootcount}`)
        startup()
      })

      startup()


      // setInterval(async () => {
      //   await node.getUptime()
      //     .then((uptime) => console.log("Uptime: " + uptime))
      //     .catch((error) => console.log("Uptime ERROR: " + error.message))
      // }, 2500)

      // setInterval(async () => {
      //   let bufarray = []
      //   for (let i = 0; i < Math.random() * 10; i++)
      //     bufarray.push(Math.random() * 256)
      //   await node.send(5, Math.random() * 127, Buffer.from(bufarray))
      //     .then(() => console.log("Sent"))
      //     .catch((error) => console.log("Send ERROR: " + error.message))
      // }, 150)

      // setInterval(async () => {
      //   await node.reset()
      //     .then(() => console.log("Reset sent"))
      //     .catch((error) => console.log("ERROR: " + error.message))
      // }, 30 * 1000)
    }
    //node.on('read', (line) => console.log('p->' + line))
    //node.on('write', (line) => console.log('p<-' + line))
  })
}

setInterval(async () => {
  if (!globalnode || !globalnode.isopened)
    return

  await globalnode.send(5, 0, Buffer.from([62, 1, 2]))
    .then(() => console.log("Sent"))
    .catch((error) => console.log("Send ERROR: " + error.message))
}, 150)

StartRF24MeshNode()

setInterval(() => {
  if (!globalnode)
    StartRF24MeshNode()
}, 1500)
