#!/bin/bash

echo "🚀 Starting PhotoFinder Billing App..."

# Start backend
cd backend
if [ ! -d "node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  npm install
fi

echo "🟢 Starting backend server on port 3001..."
npm run dev &
BACKEND_PID=$!

# Start frontend
cd ../frontend
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
fi

echo "🌐 Starting frontend on web (port 8085)..."
npx expo start --web --port 8085 &
FRONTEND_PID=$!

echo ""
echo "✅ App running!"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:8085"
echo ""
echo "Press Ctrl+C to stop both servers"
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
