const EventEmitter = require('events');

const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline');

class RF24MeshSerialNode extends EventEmitter {
  static async find(options, foundcb) {
    for (const port of await SerialPort.list()) {
      const serialnode = new RF24MeshSerialNode(port.path, options);

      serialnode.on('close', () => { console.log("Find Closed:") })
      serialnode.on('error', (error) => { serialnode.close(); console.log("Find ErrorX:" + error) })
      serialnode.on('nodevice', () => { serialnode.close(); console.log("Find NO DEVICE") })
      serialnode.on('ready', () => { foundcb(serialnode); });
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

    this.portnumber = portnumber;
    this.cmdtimeout = options.cmdtimeout || this.cmdtimeout
    this.port = new SerialPort(portnumber, {
      baudRate: 115200,
    })

    const inittimer = setTimeout(function () {
      if (!this.isready)
        this.emit("nodevice");
    }.bind(this), options.inittimeout || 2500);

    const parser = this.port.pipe(new Readline({ delimiter: '\r\n' }))
    parser.on('data', function (line) {
      this.emit("read", line);

      switch (line) {
        case "RF24MESHSERIAL READY":
          setImmediate(function () {
            clearTimeout(this.inittimer);
            this.isready = true;
            this.emit("ready");
          }.bind(this))
          return;

        case "ERROR Auto renew failed":
          this.lastline = null
          return;
      }

      this.lastline = line
    }.bind(this))

    this.port.on("open", function () {
      this.isopened = true;
      this.emit("open");
      console.log("Opened");
    }.bind(this));

    this.port.on('close', function () {
      this.emit("close");
      console.log("Closed");
    }.bind(this));

    this.port.on("error", function (err) {
      this.emit("error", err);
    }.bind(this));
  }

  close() {
    if (this.port)
      if (this.isopened)
        this.port.close()
  }

  async writeLineAndWait(line) {
    this.lastline = null

    this.port.write(`${line}\n`, function (err) {
      if (err) throw new Error(`Error writing com port: {err.message}`)
    })
    this.emit("write", line);

    const that = this
    return new Promise((resolve, reject) => {
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
