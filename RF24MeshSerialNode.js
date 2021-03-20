const EventEmitter = require('events');

const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline');

class RF24MeshSerialNode extends EventEmitter {
  port = null
  echo = false

  createParser() {
    const parser = this.port.pipe(new Readline({ delimiter: '\r\n' }))
    parser.on('data', this.onLineData.bind(this))
  }

  constructor(port, echo) {
    super()

    this.port = port
    this.echo = echo;

    if (!port.isOpen)
      port.open(function (err) {
        if (err) return console.log('Error opening port: ', err.message)

        this.createParser()
      })
    else
      this.createParser()
  }

  lastline = ''
  onLineData(line) {
    if (this.echo) console.log(`-> ${line}`)

    this.lastline = line

    switch (line) {
      case "READY":
        this.emit("ready");
        break;
    }
  }

  writeLine(line) {
    this.lastline = ''

    this.port.write(`${line}\n`, function (err) { if (err) throw new Error(`Error writing com port: {err.message}`) })
    if (this.echo) console.log(`<- ${line}`)

    return new Promise(async function (resolve, reject) {
      setTimeout(function () {
        if (this.lastline)
          resolve(this.lastline)
      }.bind(this), 0)
    }.bind(this));
  }

  async setNodeId(nodeid) {
    return await this.writeLine(`NODEID 0x${nodeid.toString(16)}`);
  }

  async begin() {
    return await this.writeLine(`BEGIN`);
  }
}
module.exports = RF24MeshSerialNode;
