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

/** Class representing a outbound message to the ACC instance. 
* Consists of a Buffer that the bytes gets written to and a offset property that controls the size of the buffer.
*/
class ACCMessageOutbound {
  constructor() {
    this.buffer = Buffer.alloc(2048);
    this.offset = 0;
  }

  /**
  * Writes a Int8 to the Buffer .
  * @param {string} value The value to be written.
  */
  writeUInt8(value) {
    this.buffer.writeUInt8(value, this.offset);
    this.offset += 1;
  }

  /**
  * Writes a Int16 to the Buffer .
  * @param {string} value The value to be written.
  */
  writeUInt16LE(value) {
    this.buffer.writeUInt16LE(value, this.offset);
    this.offset += 2;
  }

  /**
  * Writes a Int32 to the Buffer .
  * @param {string} value The value to be written.
  */
  writeInt32LE(value) {
    this.buffer.writeInt32LE(value, this.offset);
    this.offset += 4;
  }

  /**
  * Writes a String to the Buffer marking its length using a Int16.
  * @param {string} value The value to be written.
  */
  writeString(value) {
    const bufferStr = Buffer.from(value, 'utf8');
    this.writeUInt16LE(bufferStr.length);
    bufferStr.copy(this.buffer, this.offset);
    this.offset += bufferStr.length;
  }

  /**
  * Gets the current message at the buffer.
  */
  getBuffer() {
    return this.buffer.subarray(0, this.offset);
  }

  /**
  * Gets the current length of the buffer.
  */
  getLength() {
    return this.offset;
  }
}

/** Class representing a inbound message from the ACC instance.
 * Consists of a Buffer that the bytes gets read from and a offset property that controls how much of the buffer has already been read.
 *  
 * @param {Buffer} buffer The buffer to be read from.
*/
class ACCMessageInbound {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  readUInt8() {
    const value = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readUInt16LE() {
    const value = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  readInt32LE() {
    const value = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  readString() {
    const length = this.readUInt16LE();
    const value = this.buffer.toString('utf8', this.offset, this.offset + length);
    this.offset += length;
    return value;
  }
}

class CarInfo {
  constructor(carIndex) {
    this.carIndex = carIndex;
    this.carModelType = null;
    this.teamName = '';
    this.raceNumber = null;
    this.cupCategory = null;
    this.currentDriverIndex = null;
    this.drivers = []; // DriverInfo list
    this.nationality = null;
  }
}

class DriverInfo {
  constructor() {
    this.firstName = '';
    this.lastName = '';
    this.shortName = '';
    this.category = null;
    this.nationality = null;
  }
}

class LapInfo {
  constructor() {
    this.laptimeMS = null;
    this.splits = []; // Int list
    this.carIndex = null;
    this.driverIndex = null;
    this.isInvalid = null;
    this.isValidForBest = null;
    this.type = null;
  }
}

class RealtimeUpdate {
  constructor() {
    this.EventIndex = null;
    this.SessionIndex = null;
    this.phase = null;
    this.sessionTime = null;
    this.remainingTime = null;
    this.timeOfDay = null;
    this.rainLevel = null;
    this.clouds = null;
    this.wetness = null;
    this.bestSessionLap = null;
    this.bestLapCarIndex = null;
    this.bestLapDriverIndex = null;
    this.focusedCarIndex = null;
    this.activeCameraSet = '';
    this.activeCamera = '';
    this.isReplayPlaying = false;
    this.replaySessionTime = null;
    this.replayRemainingTime = null;
    this.sessionRemainingTime = null;
    this.sessionEndTime = null;
    this.sessionType = null;
    this.ambientTemp = null;
    this.trackTemp = null;
    this.currentHudPage = '';
  }
}

class RealtimeCarUpdate {
  constructor() {
    this.carIndex = null;
    this.driverIndex = null;
    this.gear = null;
    this.worldPosX = null;
    this.worldPosY = null;
    this.yaw = null;
    this.carLocation = null;
    this.kmh = null;
    this.position = null;
    this.trackPosition = null;
    this.splinePosition = null;
    this.delta = null;
    this.bestSessionLap = null;
    this.lastLap = null;
    this.currentLap = null;
    this.laps = null;
    this.cupPosition = null;
    this.driverCount = null;
  }
}

class TrackData {
  constructor() {
    this.trackName = '';
    this.trackId = null;
    this.trackMeters = null;
    this.cameraSets = []; // CameraSet list
    this.hudPages = []; // HudPage list
  }
}


class ACRemoteTelemetryClient extends EventEmitter {
  constructor(connectionId) {
    super();

    this.connectionId = connectionId;
    this.client = dgram.createSocket('udp4');

    this.entryListCars = [];
  }

  start() {
    if (!this.client) {
      return;
    }

    this.client.on('listening', () => {
      console.log(`UDP Client listening on ${ClientConfiguration.IP}:${ClientConfiguration.PORT}`);
    });

    this.client.on('message', (msg, rinfo) => {
      this.proccessData(msg);
    });
  }


  requestConnection() {
    const message = new ACCMessageOutbound();

    message.writeUInt8(OutboundMessageTypes.REGISTER_COMMAND_APPLICATION);
    message.writeUInt8(ClientConfiguration.BROADCASTING_PROTOCOL_VERSION);
    message.writeString(ClientConfiguration.DISPLAY_NAME);
    message.writeString(ClientConfiguration.CONNECTION_PASSWORD);
    message.writeInt32LE(ClientConfiguration.MS_REALTIME_UPDATE_INTERVAL);
    message.writeString(ClientConfiguration.COMMAND_PASSWORD);

    this.client.send(message.getBuffer(), 0, message.getLength(), ClientConfiguration.PORT, ClientConfiguration.IP);
  }


  requestEntryList() {
    const message = new ACCMessageOutbound();

    message.writeUInt8(OutboundMessageTypes.REQUEST_ENTRY_LIST);
    message.writeInt32LE(this.connectionId);

    this.client.send(message.getBuffer(), 0, message.getLength(), ClientConfiguration.PORT, ClientConfiguration.IP);
  }






  proccessData(data) {
    // Any message starts with an 1-byte command type
    const buffer = Buffer.from(data);
    const message = new ACCMessageInbound(buffer);
    const messageType = message.readUInt8();

    switch (messageType) {
      case InboundMessageTypes.REGISTRATION_RESULT:
        console.log('REGISTRATION_RESULT');
        this.connectionId = message.readInt32LE();

        this.requestEntryList();
        break;
      case InboundMessageTypes.ENTRY_LIST:
        console.log('ENTRY_LIST');

        this.entryListCars = [];
        
        const connectionId = message.readInt32LE();
        const carCount = message.readUInt16LE();
        for (let i = 0; i < carCount; i++) {
          const carInfo = new CarInfo(message.readUInt16LE());

          this.entryListCars.push(carInfo); 
        }

        break;
      case InboundMessageTypes.ENTRY_LIST_CAR:
        console.log('ENTRY_LIST_CAR');

        const carId = message.readUInt16LE();
        const carInfo = this.entryListCars.find(car => car.carIndex === carId);
        if (!carInfo) {
          console.log(`Entry list update for unknown carIndex ${carId}`);
          break;
        }
        
        carInfo.carModelType = message.readUInt8(); // TODO: validade id it the same as readByte()
        carInfo.teamName = message.readString();
        carInfo.raceNumber = message.readInt32LE();
        carInfo.cupCategory = message.readUInt8(); // TODO: validade id it the same as readByte()
        carInfo.currentDriverIndex = message.readUInt8(); // TODO: validade id it the same as readByte()
        carInfo.nationality = message.readUInt16LE();

        const driverCount = message.readUInt8();
        for (let i = 0; i < driverCount; i++) {
          const driverInfo = new DriverInfo();

          driverInfo.firstName = message.readString();
          driverInfo.lastName = message.readString();
          driverInfo.shortName = message.readString();
          driverInfo.category = message.readUInt8(); // TODO: validade id it the same as readByte()
          driverInfo.nationality = message.readUInt16LE();

          carInfo.drivers.push(driverInfo); 
        }

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