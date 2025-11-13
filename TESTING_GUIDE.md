# Testing the Real-Time Chat Application

## Quick Start Guide

### Step 1: Start the WebSocket Server
Open a PowerShell terminal and run:
```powershell
& "C:\nvm4w\nodejs\npm.cmd" run dev:server
```

You should see:
```
WebSocket server running on port 3001
```

### Step 2: Start the Next.js App
Open another PowerShell terminal and run:
```powershell
& "C:\nvm4w\nodejs\npm.cmd" run dev
```

Or use the combined command to run both:
```powershell
& "C:\nvm4w\nodejs\npm.cmd" run dev:all
```

### Step 3: Test the Chat

1. **Open your browser** to http://localhost:3000
2. **You'll see the Welcome page**:
   - If you're a returning user, your previous username will be pre-filled
   - You can click "Enter Chat" to continue with that username
   - Or click "Start fresh with a new username" to choose a different one
   - Or click "Continue as Guest" to get a random guest name

3. **Enter a username** and click "Enter Chat"

4. **You should see**:
   - "Connected" with a green dot in the top right
   - If you see "Disconnected" with a red dot, the WebSocket server is not running

5. **Test real-time messaging**:
   - Open another browser window/tab to http://localhost:3000
   - Enter a different username
   - Send messages from one window and watch them appear in the other!

## Troubleshooting

### "Disconnected" Status
- **Cause**: WebSocket server is not running
- **Solution**: Make sure you ran `npm run dev:server` in a separate terminal
- **Check**: You should see "WebSocket server running on port 3001" in that terminal

### Redirected to Chat Without Username
- **Cause**: You have a username saved from a previous session
- **Solution**: Click "Change Username" in the chat header, then "Start fresh with a new username"

### Can't Send Messages
- **Cause**: Not connected to WebSocket server
- **Solution**: Check the connection status (green dot = connected, red dot = disconnected)
- **Check**: Make sure the WebSocket server is running on port 3001

## Features to Test

✅ Username selection with validation
✅ Returning user recognition
✅ Real-time message sending/receiving
✅ Connection status indicator
✅ User join notifications
✅ Auto-scroll to latest message
✅ Multiple browser windows chatting together
✅ Timestamp display
✅ Dark mode support
