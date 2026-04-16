#!/bin/bash
echo "Starting Chatty - Backend and Frontend..."
echo ""

trap 'kill 0' EXIT

(cd "$(dirname "$0")/backend" && npm run start:dev) &
(cd "$(dirname "$0")/frontend" && npm run dev) &

echo "Backend running on http://localhost:3000"
echo "Frontend running on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

wait