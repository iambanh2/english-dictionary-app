#!/bin/bash

# Auto deploy script with version increment
echo "🚀 Auto Deploy với version increment"

# Check if version type is provided
VERSION_TYPE=${1:-patch}

echo "📋 Updating version ($VERSION_TYPE)..."
./scripts/update-version.sh $VERSION_TYPE

if [ $? -eq 0 ]; then
    echo "🔥 Deploying to Firebase..."
    firebase deploy
    
    if [ $? -eq 0 ]; then
        echo "✅ Deploy thành công!"
        echo "🌐 URL: https://study4-english.web.app"
    else
        echo "❌ Deploy thất bại!"
        exit 1
    fi
else
    echo "❌ Version update thất bại!"
    exit 1
fi
