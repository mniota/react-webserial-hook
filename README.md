# @mniota/react-webserial-hook

> A React Hook for WebSerial API

## Install

```
npm i @mniota/react-webserial-hook
```

## Usage

For more options, check the API autocomplete in your IDE:

```js
import { useWebSerial } from "@mniota/react-webserial-hook"

function Component() {
  const serial = useWebSerial({
    onData: data => {
      const decored = new TextDecoder();
      console.log(decoder.decode(data));
    }
  })

  return (
    <div>
      <button onClick={() => serial.requestPort()}>
        Pair a new port
      </button>
      <button onClick={() => serial.openPort()}>
        Open the selected port
      </button>
      <button onClick={() => serial.startReading()}>
        Start reading
      </button>
    <div>
    )
}
```
