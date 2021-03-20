const SerialPort = require('serialport')
const RF24MeshSerialNode = require('../RF24MeshSerialNode.js')

const port = new SerialPort('COM3', {
  autoOpen: true,
  baudRate: 115200
}, function (err) {
  if (err) return console.log('Port open Error: ', err.message)

  const node = new RF24MeshSerialNode(port, true);

  node.on('ready', async () => {
    const a =  node.setNodeId(20)
    console.log("A")
    console.log(a)
    const b =  node.begin()
    console.log("B")
    console.log(b)
  })
})
