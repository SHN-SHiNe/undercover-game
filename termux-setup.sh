#!/data/data/com.termux/files/usr/bin/bash
# Termux setup script for SheishiWodi game
# Run this in Termux after copying project files

echo "=== Installing Python ==="
pkg update -y
pkg install -y python

echo "=== Installing Flask ==="
pip install flask

echo "=== Done! ==="
echo ""
echo "To start the game server, run:"
echo "  cd sheishiwodi && python app.py"
echo ""
echo "Then open browser: http://localhost:5000"
