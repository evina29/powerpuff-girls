/* ============================================================
   ESP32 WAND INPUT — future hardware bridge (placeholders).

   The physical magic wands are ESP32 boards with an IMU that
   recognize gestures on-device and transmit one plain-text
   spell command per gesture:

       FIREBALL\n  LIGHTNING\n  ICE\n  SHIELD\n  HEAL\n

   Optionally prefixed with a wand id: "P1:FIREBALL".

   Both classes below extend InputSource, so once connected the
   game works WITHOUT ANY MODIFICATION — commands flow through
   the same InputManager the keyboard uses.
   ============================================================ */

/* ---------------- Web Bluetooth (BLE UART) ---------------- */
class ESP32BluetoothInput extends InputSource {
  // Nordic UART Service — the de-facto BLE serial for ESP32/NimBLE
  static SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  static TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

  constructor(playerIndex = 1) {
    super('esp32-bluetooth');
    this.playerIndex = playerIndex;
    this.device = null;
    this.connected = false;
  }

  /**
   * PLACEHOLDER — pair with a wand over Web Bluetooth.
   * Requires HTTPS (or localhost) and a user gesture.
   */
  async connectBluetooth() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser.');
    }
    // --- Future implementation outline ---
    // this.device = await navigator.bluetooth.requestDevice({
    //   filters: [{ services: [ESP32BluetoothInput.SERVICE_UUID] }]
    // });
    // const server = await this.device.gatt.connect();
    // const service = await server.getPrimaryService(ESP32BluetoothInput.SERVICE_UUID);
    // const char = await service.getCharacteristic(ESP32BluetoothInput.TX_CHAR_UUID);
    // await char.startNotifications();
    // char.addEventListener('characteristicvaluechanged',
    //   (e) => this.parseESP32Data(new TextDecoder().decode(e.target.value)));
    // this.connected = true;
    throw new Error('ESP32 Bluetooth wands are not built yet.');
  }

  /** PLACEHOLDER — called for each raw chunk received from the wand. */
  receiveSpell(rawText) {
    this.parseESP32Data(rawText);
  }

  /**
   * Parse raw wand text into game commands.
   * Accepts "FIREBALL" or "P2:FIREBALL" (one command per line).
   */
  parseESP32Data(rawText) {
    for (const line of String(rawText).split(/\r?\n/)) {
      const msg = line.trim().toUpperCase();
      if (!msg) continue;
      const m = msg.match(/^P(\d)\s*[:\-]\s*(\w+)$/);
      if (m) this.emit(parseInt(m[1], 10), m[2]);
      else this.emit(this.playerIndex, msg);
    }
  }

  disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.connected = false;
  }
}

/* ---------------- Web Serial (USB cable) ---------------- */
class ESP32SerialInput extends InputSource {
  constructor(playerIndex = 1) {
    super('esp32-serial');
    this.playerIndex = playerIndex;
    this.port = null;
    this.connected = false;
    this._buffer = '';
  }

  /**
   * PLACEHOLDER — open a serial connection to a wand (115200 baud).
   * Requires HTTPS (or localhost) and a user gesture.
   */
  async connectSerial() {
    if (!navigator.serial) {
      throw new Error('Web Serial is not supported in this browser.');
    }
    // --- Future implementation outline ---
    // this.port = await navigator.serial.requestPort();
    // await this.port.open({ baudRate: 115200 });
    // this.connected = true;
    // const reader = this.port.readable.getReader();
    // const decoder = new TextDecoder();
    // while (this.connected) {
    //   const { value, done } = await reader.read();
    //   if (done) break;
    //   this.receiveSpell(decoder.decode(value));
    // }
    throw new Error('ESP32 Serial wands are not built yet.');
  }

  /** Buffer partial chunks until a full newline-terminated command arrives. */
  receiveSpell(rawChunk) {
    this._buffer += rawChunk;
    const lines = this._buffer.split(/\r?\n/);
    this._buffer = lines.pop(); // keep incomplete tail
    for (const line of lines) this.parseESP32Data(line);
  }

  /** Same wire format as Bluetooth: "FIREBALL" or "P1:FIREBALL". */
  parseESP32Data(line) {
    const msg = String(line).trim().toUpperCase();
    if (!msg) return;
    const m = msg.match(/^P(\d)\s*[:\-]\s*(\w+)$/);
    if (m) this.emit(parseInt(m[1], 10), m[2]);
    else this.emit(this.playerIndex, msg);
  }

  async disconnect() {
    this.connected = false;
    if (this.port) { try { await this.port.close(); } catch (e) { /* ignore */ } }
  }
}

window.ESP32BluetoothInput = ESP32BluetoothInput;
window.ESP32SerialInput = ESP32SerialInput;
