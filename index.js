import { useEffect, useLayoutEffect, useRef, useState } from "react";

const webSerialContext = {
  initialized: false,

  /**
   * @type {[SerialPort]}
   */
  ports: [],
};

/**
 *
 * @param {() => void} callback
 * @param {number} delay
 */
function useInterval(callback, delay) {
  useEffect(() => {
    const id = setInterval(() => callback(), delay);
    return () => clearInterval(id);
  }, [callback, delay]);
}

/**
 * @typedef {1200 | 2400 | 4800 | 9600 | 14400 | 31250 | 38400 | 56000 | 57600 | 76800 | 115200} BaudRatesType
 * @typedef {7 | 8} DataBitsType
 * @typedef {1 | 2} StopBitsType
 */

/**
 *
 * @param {{
 *  onConnect?: (SerialPort) => undefined
 *  onDisconnect?: (SerialPort) => undefined
 *  onData: (Uint8Array) => undefined
 * }}
 * @returns
 */
export function useWebSerial({ onConnect, onDisconnect, onData }) {
  if (!navigator.serial) {
    throw Error("WebSerial is not available")
  }

  /**
   * @type {[SerialPort, React.Dispatch<React.SetStateAction<SerialPort>>]}
   */
  const [port, setPort] = useState(null);

  /**
   * @type {[[SerialPort], React.Dispatch<React.SetStateAction<[SerialPort]>>]}
   */
  const [ports, setPorts] = useState(webSerialContext.ports);

  /**
   * @type {[Boolean, React.Dispatch<React.SetStateAction<Boolean>>]}
   */
  const [isOpen, setIsOpen] = useState(false);

  /**
   * @type {[Boolean, React.Dispatch<React.SetStateAction<Boolean>>]}
   */
  const [isReading, setIsReading] = useState(false);

  /**
   * @type {[BaudRatesType, React.Dispatch<React.SetStateAction<BaudRatesType>>]}
   */
  const [baudRate, setBaudRate] = useState(115200);

  /**
   * @type {[Number, React.Dispatch<React.SetStateAction<Number>>]}
   */
  const [bufferSize, setBufferSize] = useState(255);

  /**
   * @type {[DataBitsType, React.Dispatch<React.SetStateAction<DataBitsType>>]}
   */
  const [dataBits, setDataBits] = useState(8);

  /**
   * @type {[StopBitsType, React.Dispatch<React.SetStateAction<StopBitsType>>]}
   */
  const [stopBits, setStopBits] = useState(1);

  /**
   * @type {[FlowControlType, React.Dispatch<React.SetStateAction<FlowControlType>>]}
   */
  const [flowControl, setFlowControl] = useState("none");

  /**
   * @type {[ParityType, React.Dispatch<React.SetStateAction<ParityType>>]}
   */
  const [parity, setParity] = useState("none");

  const [dataTerminalReady, setDataTerminalReady] = useState(false);
  const [requestToSend, setRequestToSend] = useState(false);
  const [breakSignal, setBreak] = useState(false);

  const [clearToSend, setClearToSend] = useState(false);
  const [dataCarrierDetect, setDataCarrierDetect] = useState(false);
  const [dataSetReady, setDataSetReady] = useState(false);
  const [ringIndicator, setRingIndicator] = useState(false);

  useInterval(() => {
    if (port?.readable) {
      port.getSignals().then((signals) => {
        if (signals.clearToSend !== clearToSend) {
          setClearToSend(signals.clearToSend);
        }
        if (signals.dataCarrierDetect !== clearToSend) {
          setDataCarrierDetect(signals.dataCarrierDetect);
        }
        if (signals.dataSetReady !== clearToSend) {
          setDataSetReady(signals.dataSetReady);
        }
        if (signals.ringIndicator !== clearToSend) {
          setRingIndicator(signals.ringIndicator);
        }
      });
    }
  }, 100);

  useEffect(() => {}, [
    baudRate,
    bufferSize,
    dataBits,
    stopBits,
    flowControl,
    parity,
  ]);

  useEffect(() => {
    if (port && port.readable) {
      port.setSignals({
        break: breakSignal,
        dataTerminalReady,
        requestToSend,
      });
    }
  }, [port, dataTerminalReady, requestToSend, breakSignal]);

  const _onConnect = () => {
    if (onConnect) {
      onConnect();
    }
  }

  const _onDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
  }

  useEffect(() => {
    navigator.serial.addEventListener("connect", _onConnect)
    navigator.serial.addEventListener("disconnect", _onDisconnect)
    return () => {
      navigator.serial.removeEventListener("connect", _onConnect)
      navigator.serial.removeEventListener("disconnect", _onDisconnect)
    }
  })

  useEffect(() => {
    if (webSerialContext.initialized) {
      return;
    }

    webSerialContext.initialized = true;

    navigator.serial
      .getPorts()
      .then((ports) => {
        if (ports.length >= 1) {
          webSerialContext.ports = ports;
          setPorts(ports);
          setPort(ports[0]);
        }
      });
  }, []);

  /**
   *
   * @param {SerialPortFilter} [filters]
   */
  const requestPort = async (filters) => {
    await navigator.serial.requestPort(filters).then((port) => {
      setPort(port);
    });
  };

  /**
   *
   * @param {SerialPort} port
   */
  const portInfo = (port) => {
    const info = port.getInfo();

    return {
      usbVendorId: info.usbVendorId,
      usbProductId: info.usbProductId,
      usbId: `${info.usbVendorId
        .toString(16)
        .padStart(4, "0")}:${info.usbProductId.toString(16).padStart(4, "0")}`,
    };
  };

  const openPort = async () => {
    if (!port) {
      throw new Error("useWebSerial: No port selected");
    }

    if (port.readable) {
      throw new Error("useWebSerial: Port already opened");
    }

    await port.open({
      baudRate,
      bufferSize,
      dataBits,
      flowControl,
      parity,
      stopBits,
    });

    setIsOpen(true);
  };

  const closePort = async () => {
    if (!port) {
      throw new Error("useWebSerial: No port selected");
    }

    if (!port.readable) {
      throw new Error("useWebSerial: Port not opened");
    }

    if (port.readable.locked) {
      throw new Error("useWebSerial: Port is locked (stopReading first)");
    }

    await port.close();

    setIsOpen(false);
  };

  const startReading = async () => {
    if (!port) {
      throw new Error("no port selected");
    }

    if (!port.readable) {
      throw new Error("port not opened");
    }

    setIsReading(true);
    port.cancelRequested = false;
    const reader = port.readable.getReader();

    try {
      /**
       * @type {ReadableStreamReadResult<Uint8Array>}
       */
      let { value, done } = {};

      do {
        ({ value, done } = await reader.read());

        if (done) {
          break;
        }

        onData(value);
      } while (!port.cancelRequested);
    } finally {
      reader.releaseLock();
    }
  };

  const stopReading = async () => {
    if (!port) {
      throw new Error("no port selected");
    }

    if (!port.readable) {
      throw new Error("port not opened");
    }

    setIsReading(false);
    port.cancelRequested = true;
  }

  /**
   *
   * @param {UIntArray} data
   */
  const write = async (data) => {
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  }

  return {
    port,
    ports,
    isOpen,
    isReading,
    setPort,
    portInfo,
    requestPort,
    openPort,
    closePort,
    startReading,
    stopReading,
    write,
    options: {
      baudRate,
      bufferSize,
      dataBits,
      stopBits,
      flowControl,
      parity,
      setBaudRate,
      setBufferSize,
      setDataBits,
      setStopBits,
      setFlowControl,
      setParity,
    },
    signals: {
      break: breakSignal,
      dataTerminalReady,
      requestToSend,
      clearToSend,
      dataCarrierDetect,
      dataSetReady,
      ringIndicator,
      setBreak,
      setDataTerminalReady,
      setRequestToSend,
    },
  };
}
