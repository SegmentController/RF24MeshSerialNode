import EventEmitter from 'events'

import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

export type RF24MeshSerialNodeOptions = {
  cmdtimeout: number,
  inittimeout: number,
  checkinterval: number,
}

export class RF24MeshSerialNode extends EventEmitter {
  static async find(options: RF24MeshSerialNodeOptions, foundcb: (node: RF24MeshSerialNode) => void) {
    for (const port of await SerialPort.list()) {
      const serialnode = new RF24MeshSerialNode(port.path, options)

      serialnode.on('error', () => serialnode.close())
      serialnode.on('nodevice', () => serialnode.close())
      serialnode.on('ready', () => foundcb(serialnode))
    }
  }

  private port: SerialPort
  private portnumber: string
  private cmdtimeout: number = 250
  private isopened: boolean = false
  private isready: boolean = false
  private lastline: string = ''
  private inittimer: number = 0;
  private checktimer: number = 0;

  public getPortnumber(): string { return this.portnumber; }
  public isOpened(): boolean { return this.isopened; }

  constructor(portnumber: string, options: RF24MeshSerialNodeOptions) {
    super()

    this.portnumber = portnumber
    this.cmdtimeout = options.cmdtimeout || this.cmdtimeout
    this.port = new SerialPort({ path: this.portnumber, baudRate: 115200 })

    const that = this;

    this.inittimer = setTimeout(function () {
      if (!that.isready)
        that.emit("nodevice")
    }, options.inittimeout || 2500) as unknown as number;

    this.port.on("open", function () {
      that.isopened = true

      const parser = that.port.pipe(new ReadlineParser({ delimiter: '\r\n' }))
      parser.on('data', function (line: string) {
        that.emit("read", line)

        switch (line) {
          case "RF24MESHSERIAL READY":
            setImmediate(function () {
              clearTimeout(that.inittimer)
              if (!that.isready) {
                that.isready = true
                that.emit("ready")
              }
              else
                that.emit("reready")
            })
            return

          case "ERROR Auto renew failed":
            that.lastline = ''
            return

          case "NEWNODE":
            that.emit("newnode")
            that.lastline = ''
            return
        }

        if (line.startsWith("RECEIVE ")) {
          const parts = line.split(' ')
          if (parts.length == 3 || parts.length == 4) {
            function CreateBuffer() {
              if (parts.length == 4)
                if (parts[3]?.startsWith("0x") && (parts[3].length % 2) == 0) {
                  const data = parts[3].substring(2)
                  const size = data.length / 2

                  let bytes: number[] = []
                  for (let i = 0; i < size; i++)
                    bytes.push(parseInt(data.substring(i * 2, i * 2 + 2), 16))
                  return Buffer.from(bytes)
                }
              return null
            }
            if (parts.length > 2)
              that.emit(
                "receive",
                parseInt(parts[1] ?? '', 16),
                parseInt(parts[2] ?? '', 16),
                CreateBuffer())
          }
          return;
        }

        that.lastline = line
      })

      that.checktimer = setInterval(function () {
        that.port.write('\n');
      }, options.checkinterval || 500) as unknown as number;

      that.emit("open")
    })

    this.port.on('close', function () {
      that.isopened = false
      that.emit("close")
      clearInterval(that.checktimer);
      that.removeAllListeners();
    })

    this.port.on("error", function (err) {
      that.isopened = false
      that.emit("error", err)
    })
  }

  close(): void {
    if (this.port && this.isopened)
      this.port.close()
  }

  async writeLine(line: string, wait = true): Promise<string> {
    this.lastline = ''

    this.port.write(`${line}\n`)
    this.emit("write", line)

    const that = this
    return new Promise((resolve, reject) => {
      if (!wait) return resolve('')
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

  byteToHex(d: number, padding = 2): string {
    d = Math.round(d)
    let hex = Number(d).toString(16).toUpperCase()
    while (hex.length < padding)
      hex = '0' + hex
    return '0x' + hex
  }

  bufferToHex(b: Buffer): string {
    let hex = ''
    for (let v of b) {
      let vhex = Number(v).toString(16).toUpperCase()
      while (vhex.length < 2)
        vhex = '0' + vhex
      hex += vhex
    }
    return '0x' + hex
  }

  async setNodeId(nodeid: number): Promise<string> { return this.writeLine(`NODEID 0x${nodeid.toString(16).padStart(2, '0')}`) }
  async setChannel(channel: number): Promise<string> { return this.writeLine(`CHANNEL ${channel}`) }
  async setSpeed(speed: number): Promise<string> { return this.writeLine(`SPEED ${speed}`) }

  async getAny(name: string): Promise<string> { return await this.writeLine(name).then((res) => res.replace(name, '').trim()).catch((error) => { throw error }) }
  async getNodeId(): Promise<string> { return this.getAny('NODEID') }
  async getChannel(): Promise<string> { return this.getAny('CHANNEL') }
  async getSpeed(): Promise<string> { return this.getAny('SPEED') }
  async getVersion(): Promise<string> { return this.getAny('VERSION') }
  async getUptime(): Promise<string> { return this.getAny('UPTIME') }

  async getNodelist(): Promise<number[]> {
    const nodesstr = await this.getAny('NODELIST')
    if (!nodesstr) return []

    const result = []
    for (const node of nodesstr.split(' '))
      result.push(parseInt(node, 16))
    return result;
  }

  async begin(): Promise<string> { return this.writeLine('BEGIN') }
  async check(): Promise<string> { return this.writeLine('CHECK') }
  async renew(): Promise<string> { return this.writeLine('RENEW') }
  async reset(): Promise<string> { return this.writeLine('RESET', false) }

  async send(targetnode: number, msgtype: number, databuffer: Buffer): Promise<string> { return this.writeLine(`SEND ${this.byteToHex(targetnode)} ${this.byteToHex(msgtype)} ${this.bufferToHex(databuffer)}`) }
}
