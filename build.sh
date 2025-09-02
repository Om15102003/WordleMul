#!/bin/bash

echo "Building VsWordle for production..."

# Install dependencies
npm install

# Build the frontend
npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Frontend build successful"
    echo "📁 Build output in dist/ directory"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo "🚀 Ready for deployment!"
echo "📋 Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Render"
echo "3. Deploy using the render.yaml configuration"
