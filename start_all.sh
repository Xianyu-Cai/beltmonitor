#!/bin/bash
echo "Starting backend..."
(cd backend && cnpm install && npm run start) &

echo "Starting frontend..."
(cd frontend && cnpm install && npm run dev) &

wait
