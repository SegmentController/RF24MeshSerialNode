const EventEmitter = require('events')

const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')

class RF24MeshSerialNode extends EventEmitter {
  static async find(options, foundcb) {
    for (const port of await SerialPort.list()) {
      const serialnode = new RF24MeshSerialNode(port.path, options)

      serialnode.on('error', (error) => serialnode.close())
      serialnode.on('nodevice', () => serialnode.close())
      serialnode.on('ready', () => foundcb(serialnode))
    }
  }

  port = null
  portnumber = null
  cmdtimeout = 250
  isopened = false
  isready = false
  lastline = ''
  constructor(portnumber, options) {
    super()

    this.portnumber = portnumber
    this.cmdtimeout = options.cmdtimeout || this.cmdtimeout
    this.port = new SerialPort(portnumber, { baudRate: 115200 })

    const inittimer = setTimeout(function () {
      if (!this.isready)
        this.emit("nodevice")
    }.bind(this), options.inittimeout || 2500)

    const parser = this.port.pipe(new Readline({ delimiter: '\r\n' }))
    parser.on('data', function (line) {
      this.emit("read", line)

      switch (line) {
        case "RF24MESHSERIAL READY":
          setImmediate(function () {
            clearTimeout(this.inittimer)
            if (!this.isready) {
              this.isready = true
              this.emit("ready")
            }
            else
              this.emit("reready")
          }.bind(this))
          return

        case "ERROR Auto renew failed":
          this.lastline = null
          return

        case "NEWNODE":
          this.emit("newnode")
          this.lastline = null
          return
      }

      if (line.startsWith("RECEIVE ")) {
        const parts = line.split(' ')
        if (parts.length == 3 || parts.length == 4) {
          function CreateBuffer() {
            if (parts.length == 4)
              if (parts[3].startsWith("0x") && (parts[3].length % 2) == 0) {
                const data = parts[3].substring(2)
                const size = data.length / 2

                let bytes = []
                for (let i = 0; i < size; i++)
                  bytes.push(parseInt(Number(data.substring(i * 2, 2)), 10))
                return Buffer.from(bytes)
              }
            return null
          }
          this.emit(
            "receive",
            parseInt(Number(parts[1]), 10),
            parseInt(Number(parts[2]), 10),
            CreateBuffer())
        }
        return;
      }

      this.lastline = line
    }.bind(this))

    this.port.on("open", function () {
      this.isopened = true
      this.emit("open")
    }.bind(this))

    this.port.on('close', function () {
      this.isopened = false
      this.emit("close")
    }.bind(this))

    this.port.on("error", function (err) {
      this.isopened = false
      this.emit("error", err)
    }.bind(this))
  }

  close() {
    if (this.port && this.isopened)
      this.port.close()
  }

  async writeLine(line, wait = true) {
    this.lastline = null

    this.port.write(`${line}\n`, function (err) {
      if (err) throw new Error(`Error writing com port: {err.message}`)
    })
    this.emit("write", line)

    const that = this
    return new Promise((resolve, reject) => {
      if (!wait) return resolve()
      const start = new Date().getTime()
      const waiter = () => {
        if (that.lastline && that.lastline.length) {
          if (that.lastline.startsWith("ERROR"))
            return reject(new Error(that.lastline.substring("ERROR".length).trim()))
          return resolve(that.lastline)
        }
        else if (new Date().getTime() - start > this.cmdtimeout) {
          return reject(new Error("Timeout"))
        }
        else
          setImmediate(waiter)
      }
      waiter()
    })
  }

  byteToHex(d, padding = 2) {
    d = Math.round(d)
    let hex = Number(d).toString(16).toUpperCase()
    while (hex.length < padding)
      hex = '0' + hex
    return '0x' + hex
  }

  bufferToHex(b) {
    let hex = ''
    for (let v of b) {
      let vhex = Number(v).toString(16).toUpperCase()
      while (vhex.length < 2)
        vhex = '0' + vhex
      hex += vhex
    }
    return '0x' + hex
  }

  async setNodeId(nodeid) { return this.writeLine(`NODEID 0x${nodeid.toString(16).padStart(2, '0')}`) }
  async setChannel(channel) { return this.writeLine(`CHANNEL ${channel}`) }
  async setSpeed(speed) { return this.writeLine(`SPEED ${speed}`) }

  async getAny(name) { return await this.writeLine(name).then((res) => res.replace(name, '').trim()).catch((error) => { throw error }) }
  async getNodeId() { return this.getAny('NODEID') }
  async getChannel() { return this.getAny('CHANNEL') }
  async getSpeed() { return this.getAny('SPEED') }
  async getVersion() { return this.getAny('VERSION') }
  async getUptime() { return this.getAny('UPTIME') }

  async getNodelist() {
    const nodesstr = await this.getAny('NODELIST')
    if (!nodesstr) return []

    const result = []
    for (const node of nodesstr.split(' '))
      result.push(parseInt(Number(node), 10))
    return result;
  }

  async begin() { return this.writeLine('BEGIN') }
  async check() { return this.writeLine('CHECK') }
  async renew() { return this.writeLine('RENEW') }
  async reset() { return this.writeLine('RESET', false) }

  async send(targetnode, msgtype, databuffer) { return this.writeLine(`SEND ${this.byteToHex(targetnode)} ${this.byteToHex(msgtype)} ${this.bufferToHex(databuffer)}`) }

}
module.exports = RF24MeshSerialNode
