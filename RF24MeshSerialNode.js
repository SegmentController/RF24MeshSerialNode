const EventEmitter = require('events');

const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline');

class RF24MeshSerialNode extends EventEmitter {
  port = null
  timeout = 2500

  constructor(port, options) {
    super()

    this.port = port
    this.timeout = options.timeout || this.timeout

    const parser = this.port.pipe(new Readline({ delimiter: '\r\n' }))
    parser.on('data', this.onLineData.bind(this))

    if (!port.isOpen)
      port.open(function (err) {
        if (err) throw new Error(`Error opening port: ${err.message}`)
      })
  }

  lastline = ''
  onLineData(line) {
    this.emit("read", line);

    switch (line) {
      case "READY":
        setImmediate(function () {
          this.emit("ready");
        }.bind(this))
        return;
      case "ERROR Auto renew failed":
        this.lastline = null
        return;
    }

    this.lastline = line
  }

  async writeLineAndWait(line) {
    this.lastline = null

    this.port.write(`${line}\n`, function (err) { if (err) throw new Error(`Error writing com port: {err.message}`) })
    this.emit("write", line);

    const that = this
    return new Promise((resolve, reject) => {
      const start = new Date().getTime()
      const check = () => {
        if (that.lastline && that.lastline.length) {
          if (that.lastline.startsWith("ERROR"))
            return reject(new Error(that.lastline.substring("ERROR".length).trim()))
          return resolve(that.lastline)
        }
        else if (new Date().getTime() - start > this.timeout) {
          return reject(new Error("Timeout"))
        }
        else
          setImmediate(check)
      }
      setImmediate(check)
    })
  }

  async setNodeId(nodeid) { return this.writeLineAndWait(`NODEID 0x${nodeid.toString(16).padStart(2, '0')}`) }
  async setChannel(channel) { return this.writeLineAndWait(`CHANNEL ${channel}`) }
  async setSpeed(speed) { return this.writeLineAndWait(`SPEED ${speed}`) }

  async getAny(name) { return await this.writeLineAndWait(name).then((res) => res.replace(name, '').trim()).catch((error) => { throw error }) }
  async getNodeId() { return this.getAny('NODEID') }
  async getChannel() { return this.getAny('CHANNEL') }
  async getSpeed() { return this.getAny('SPEED') }
  async getVersion() { return this.getAny('VERSION') }
  async getUptime() { return this.getAny('UPTIME') }

  async begin() { return this.writeLineAndWait(`BEGIN`); }
  //async send() { return this.writeLineAndWait(`SEND`); }
  async check() { return this.writeLineAndWait(`CHECK`); }
  async renew() { return this.writeLineAndWait(`RENEW`); }
  async reset() { return this.writeLineAndWait(`RESET`); }
}
module.exports = RF24MeshSerialNode;
