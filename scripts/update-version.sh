#!/bin/bash

# Version Update Script for English Dictionary App
# Usage: ./update-version.sh [major|minor|patch] [version_number]

VERSION_FILE="version.txt"
INDEX_FILE="index.html"
SCRIPT_FILE="DictionaryApp.js"

# Get current version from file
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        grep -o "Version [0-9]\+\.[0-9]\+\.[0-9]\+" "$VERSION_FILE" | head -n1 | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+"
    else
        echo "1.0.0"
    fi
}

# Update version in files
update_version() {
    local new_version=$1
    local timestamp=$(date '+%Y-%m-%d')
    
    echo "🔄 Updating to version $new_version..."
    
    # Update index.html
    sed -i "s/v=[0-9]\+\.[0-9]\+\.[0-9]\+/v=$new_version/g" "$INDEX_FILE"
    sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$new_version/g" "$INDEX_FILE"
    
    # Update DictionaryApp.js
    sed -i "s/this\.version = '[0-9]\+\.[0-9]\+\.[0-9]\+'/this.version = '$new_version'/g" "$SCRIPT_FILE"
    
    # Add version entry to version.txt
    sed -i "1i## Version $new_version ($timestamp)\n### Updated\n- Version bump to $new_version\n- Cache busting updated\n" "$VERSION_FILE"
    
    echo "✅ Updated to version $new_version"
    echo "📁 Updated files: $INDEX_FILE, $SCRIPT_FILE, $VERSION_FILE"
    echo "🚀 Ready to deploy with: firebase deploy"
}

# Main logic
if [ $# -eq 0 ]; then
    current_version=$(get_current_version)
    echo "📋 Current version: $current_version"
    echo ""
    echo "Usage:"
    echo "  ./update-version.sh 2.1.1    # Set specific version"
    echo "  ./update-version.sh patch     # Auto increment patch (2.1.0 -> 2.1.1)"
    echo "  ./update-version.sh minor     # Auto increment minor (2.1.0 -> 2.2.0)"
    echo "  ./update-version.sh major     # Auto increment major (2.1.0 -> 3.0.0)"
    exit 0
fi

current_version=$(get_current_version)
echo "📋 Current version: $current_version"

if [[ $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # Specific version provided
    update_version $1
elif [ "$1" = "patch" ]; then
    # Auto increment patch
    IFS='.' read -r major minor patch <<< "$current_version"
    patch=$((patch + 1))
    new_version="$major.$minor.$patch"
    update_version $new_version
elif [ "$1" = "minor" ]; then
    # Auto increment minor
    IFS='.' read -r major minor patch <<< "$current_version"
    minor=$((minor + 1))
    new_version="$major.$minor.0"
    update_version $new_version
elif [ "$1" = "major" ]; then
    # Auto increment major
    IFS='.' read -r major minor patch <<< "$current_version"
    major=$((major + 1))
    new_version="$major.0.0"
    update_version $new_version
else
    echo "❌ Invalid version format. Use: major.minor.patch (e.g., 2.1.1)"
    exit 1
fi
