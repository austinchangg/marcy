# Marcy - Monitoring System

A Node.js-based monitoring system for Windows and macOS.

## Prerequisites

Before installing, make sure you have:

1. **Node.js** (version 16 or higher) - Download from [nodejs.org](https://nodejs.org/)
2. **Build Tools**:
   - **Windows**: Visual Studio Build Tools or Visual Studio Community
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
3. **FFmpeg** (for screen monitoring) - Download from [ffmpeg.org](https://ffmpeg.org/)

## Installation

1. Extract the distribution package to a folder
2. Open terminal/command prompt in that folder
3. Run the installation:
   ```bash
   npm install
   ```

## Configuration

Edit the `.config` file to set your server settings:

```json
{
    "agent_id": "your_unique_agent_id",
    "server": "your_server_ip",
    "protocol": "http",
    "rtmpPort": "1935",
    "key": {
        "send_interval": 5000
    },
    "screen": {
        "framerate": 30,
        "level": 4.2,
        "profilev": "high",
        "bufsize": "2000k"
    }
}
```

## Usage

Start the monitoring system:
```bash
node main.js
```

The system will:
- Start key monitoring automatically
- Start screen streaming automatically
- Log all activities to console
- Send data to the configured server

## Stopping

Press `Ctrl+C` to stop the monitoring system.

## Features

- **Key Monitoring**: Captures keyboard input and window information
- **Screen Streaming**: Streams desktop to RTMP server
- **Real-time Configuration**: Changes to `.config` are applied immediately
- **Cross-platform**: Works on Windows and macOS

## Support

For technical support, contact your system administrator.

## License

MIT License - See LICENSE file for details.
