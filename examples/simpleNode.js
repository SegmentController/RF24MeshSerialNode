const RF24MeshSerialNode = require('../RF24MeshSerialNode.js')

//let node = null;

RF24MeshSerialNode.find({
  inittimeout: 2500,
  cmdtimeout: 250,
}, async function (node) {
  if (node) {
    console.log("FOUND: " + node.portnumber);

    await node.setNodeId(0)
      .then((res) => console.log("OK: " + res))
      .catch((error) => console.log("ERROR: " + error.message))

    await node.setChannel(90)
      .then((res) => console.log("OK: " + res))
      .catch((error) => console.log("ERROR: " + error.message))

    await node.setSpeed(0)
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

    await node.begin()
      .then((res) => console.log("OK: " + res))
      .catch((error) => console.log("ERROR: " + error.message))

  }
  else
    console.log("NOT FOUND");
});


return;

try {
  node = new RF24MeshSerialNode('COM14',
    {
      inittimeout: 2500,
      cmdtimeout: 250,
    });

  node.on('error', (error) => {
    console.log("ErrorX:" + error);
  })

  node.on('nodevice', () => { console.log("NO DEVICE") })

  node.on('ready', async () => {

    await node.setNodeId(0)
      .then((res) => console.log("OK: " + res))
      .catch((error) => console.log("ERROR: " + error.message))

    await node.setChannel(90)
      .then((res) => console.log("OK: " + res))
      .catch((error) => console.log("ERROR: " + error.message))

    await node.setSpeed(0)
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

    // await node.check()
    //   .then((res) => console.log("OK: " + res))
    //   .catch((error) => console.log("ERROR: " + error.message))

    // await node.reset()
    //   .then((res) => console.log("OK: " + res))
    //   .catch((error) => console.log("ERROR: " + error.message))

  })
}
catch (exception) {
  console.log("HIBA: " + exception.message);
}

//node.on('read', (line) => console.log('p->' + line))
//node.on('write', (line) => console.log('p<-' + line))
