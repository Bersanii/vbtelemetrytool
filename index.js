const dgram = require('dgram');
const EventEmitter = require('events');

// let CONNECTION_ID;

const ClientConfiguration = {
  IP: '127.0.0.1',
  PORT: 9000,
  DISPLAY_NAME: 'AC Remote Telemetry Client',
  CONNECTION_PASSWORD: 'asd',
  COMMAND_PASSWORD: '',
  MS_REALTIME_UPDATE_INTERVAL: 1000,
  BROADCASTING_PROTOCOL_VERSION: 4
}

const OutboundMessageTypes = {
  REGISTER_COMMAND_APPLICATION: 1,
  UNREGISTER_COMMAND_APPLICATION: 9,

  REQUEST_ENTRY_LIST: 10,
  REQUEST_TRACK_DATA: 11,

  CHANGE_HUD_PAGE: 49,
  CHANGE_FOCUS: 50,
  INSTANT_REPLAY_REQUEST: 51,

  PLAY_MANUAL_REPLAY_HIGHLIGHT: 52, // TODO, but planned
  SAVE_MANUAL_REPLAY_HIGHLIGHT: 60
};

const InboundMessageTypes = {
  REGISTRATION_RESULT: 1,
  REALTIME_UPDATE: 2,
  REALTIME_CAR_UPDATE: 3,
  ENTRY_LIST: 4,
  ENTRY_LIST_CAR: 6,
  TRACK_DATA: 5,
  BROADCASTING_EVENT: 7
}











class ACCMessage {
  constructor() {
    this.buffer = Buffer.alloc(2048);
    this.offset = 0;
  }

  writeUInt8(value) {
    this.buffer.writeUInt8(value, this.offset);
    this.offset += 1;
  }

  writeUInt16LE(value) {
    this.buffer.writeUInt16LE(value, this.offset);
    this.offset += 2;
  }

  writeInt32LE(value) {
    this.buffer.writeInt32LE(value, this.offset);
    this.offset += 4;
  }

  writeString(value) {
    const bufferStr = Buffer.from(value, 'utf8');
    this.writeUInt16LE(bufferStr.length);
    bufferStr.copy(this.buffer, this.offset);
    this.offset += bufferStr.length;
  }

  getBuffer() {
    return this.buffer.subarray(0, this.offset);
  }
}


class ACRemoteTelemetryClient extends EventEmitter {
  constructor(connectionId) {
    super();

    this.connectionId = connectionId;
    this.client = dgram.createSocket('udp4');
  }

  start() {
    if (!this.client) {
      return;
    }

    this.client.on('listening', () => {
      console.log(`UDP Client listening on ${IP}:${PORT}`);
    });

    this.client.on('message', (msg, rinfo) => {
      this.proccessData(msg);
    });
  }


  requestConnection() {
    const messageBuffer = Buffer.alloc(2048);

    let offset = 0;
    messageBuffer.writeUInt8(OutboundMessageTypes.REGISTER_COMMAND_APPLICATION, offset);
    offset += 1;
    messageBuffer.writeUInt8(ClientConfiguration.BROADCASTING_PROTOCOL_VERSION, offset);
    offset += 1;


    let bufferStr;

    bufferStr = Buffer.from(DISPLAY_NAME, 'utf8');
    messageBuffer.writeUInt16LE(bufferStr.length, offset);
    offset += 2; // 2 bytes for the length
    bufferStr.copy(messageBuffer, offset);
    offset += bufferStr.length;

    bufferStr = Buffer.from(CONNECTION_PASSWORD, 'utf8');
    messageBuffer.writeUInt16LE(bufferStr.length, offset);
    offset += 2; // 2 bytes for the length
    bufferStr.copy(messageBuffer, offset);
    offset += bufferStr.length;


    messageBuffer.writeInt32LE(MS_REALTIME_UPDATE_INTERVAL, offset);
    offset += 4;

    bufferStr = Buffer.from(COMMAND_PASSWORD, 'utf8');
    messageBuffer.writeUInt16LE(bufferStr.length, offset);
    offset += 2; // 2 bytes for the length
    bufferStr.copy(messageBuffer, offset);
    offset += bufferStr.length;

    // slices the buffer to the correct size
    const message = messageBuffer.subarray(0, offset);

    console.log(message);

    this.client.send(message, 0, message.length, PORT, IP);
  }


  requestEntryList() {
    const messageBuffer = Buffer.alloc(2048);

    let offset = 0;
    messageBuffer.writeUInt8(OutboundMessageTypes.REQUEST_ENTRY_LIST, offset);
    offset += 1;

    messageBuffer.writeInt32LE(CONNECTION_ID, offset);
    offset += 4;

    // slices the buffer to the correct size
    const message = messageBuffer.subarray(0, offset);

    this.client.send(message, 0, message.length, PORT, IP);
  }






  proccessData(data) {
    // Any message starts with an 1-byte command type

    const buffer = Buffer.from(data);
    let offset = 0;

    console.log(buffer);

    const messageType = buffer.readUInt8(offset);
    offset += 1;

    console.log(messageType);

    switch (messageType) {
      case InboundMessageTypes.REGISTRATION_RESULT:
        console.log('REGISTRATION_RESULT');
        CONNECTION_ID = buffer.readInt32LE(offset);
        offset += 4;

        this.requestEntryList();

        break;
      case InboundMessageTypes.ENTRY_LIST_CAR:
        console.log('ENTRY_LIST_CAR');
        const carId = buffer.readInt16LE(offset);
        offset += 2;
        const carModel = buffer.readInt8(offset);
        offset += 1;

        const length = buffer.readInt16LE(offset);
        offset += 2;
        const name = buffer.toString('utf8', offset, offset + length);
        offset += length;

        console.log(carId, carModel, name);
        break;
      default:
        console.log('Unknown message type');
        break
    }

  }
}

const client = new ACRemoteTelemetryClient();

client.start();

client.requestConnection();

// client.sendHandshaker(OutboundMessageTypes.REGISTER_COMMAND_APPLICATION);