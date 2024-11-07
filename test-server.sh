#!/bin/bash

echo "Testing server health..."
curl -s http://localhost:3000/health

echo -e "\n\nTesting API health..."
curl -s http://localhost:3000/api/health

echo -e "\n\nTesting rooms endpoint..."
curl -s http://localhost:3000/api/rooms

echo -e "\n\nTesting static file serving..."
curl -s -I http://localhost:3000/index.html