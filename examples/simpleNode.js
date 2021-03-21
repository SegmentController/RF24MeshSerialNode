const SerialPort = require('serialport')
const RF24MeshSerialNode = require('../RF24MeshSerialNode.js')

const port = new SerialPort('COM3', {
  autoOpen: false,
  baudRate: 115200
})

const node = new RF24MeshSerialNode(port,
  {
    timeout: 2000
  });

//node.on('read', (line) => console.log('p->' + line))
//node.on('write', (line) => console.log('p<-' + line))

node.on('ready', async () => {

  await node.setNodeId(20)
    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))

  await node.setChannel(90)
    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))

  await node.setSpeed(2)
    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))

  await node.getNodeId()
    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))

  await node.getChannel()
    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))

  await node.getSpeed()
    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))
  await node.getVersion()

    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))

  await node.getUptime()
    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))

  // try {
  //   const a = await node.setNodeId(200)
  //   console.log("OK: " + a)
  // }
  // catch (error) { console.log("Error: " + error.message) }

  await node.begin()
    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))

  await node.check()
    .then((res) => console.log("OK: " + res))
    .catch((error) => console.log("ERROR: " + error.message))

  // await node.reset()
  //   .then((res) => console.log("OK: " + res))
  //   .catch((error) => console.log("ERROR: " + error.message))

})
