/*
capture key down and up events

@example
```
import keylogger from "keylogger.js";

keylogger.start((key, isKeyUp, keyCode, windowTitle, clipboardData) => {
  console.log("keyboard event", key, isKeyUp, keyCode, windowTitle, clipboardData);
});
```
*/

/**
 * Start listening to keyboard events
 *
 * `key`: string matching KeyboardEvent.key value as listed in this table https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
 *
 * `isKeyUp`: boolean that will be `true` if the key is released and `false` if it's pressed down
 *
 * `keyCode`: numerical code representing the value of the pressed key
 *
 * `windowTitle`: string containing the title of the active window
 *
 * `clipboardData`: string containing clipboard data when Ctrl+C is pressed, empty string otherwise
 */
export const start: (
  callback: (key: string, isKeyUp: boolean, keyCode: number, windowTitle: string, clipboardData: string) => void
) => void;

/**
 * Stop listening to keyboard events
 */
export const stop: () => void;
