#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Production Build...\n');

const distDir = path.join(__dirname, 'dist');
let hasErrors = false;

// Check 1: Verify dist folder exists
if (!fs.existsSync(distDir)) {
    console.error('❌ ERROR: dist/ folder not found. Run "npm run build" first.');
    process.exit(1);
}

// Check 2: Look for .md files in dist
console.log('📝 Checking for .md files...');
const findMdFiles = (dir, fileList = []) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findMdFiles(filePath, fileList);
        } else if (file.endsWith('.md')) {
            fileList.push(filePath);
        }
    });
    return fileList;
};

const mdFiles = findMdFiles(distDir);
if (mdFiles.length > 0) {
    console.error('❌ ERROR: Found .md files in dist:');
    mdFiles.forEach(file => console.error(`   - ${file}`));
    hasErrors = true;
} else {
    console.log('✅ No .md files found in dist/');
}

// Check 3: Verify essential files exist
console.log('\n📦 Checking essential files...');
const essentialFiles = [
    'manifest.json',
    'popup.html',
    'popup.js',
    'content.js',
    'background.js',
    'settings.html',
    'settings.js'
];

essentialFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
    } else {
        console.error(`❌ Missing: ${file}`);
        hasErrors = true;
    }
});

// Check 4: Verify code is minified (check file sizes)
console.log('\n📊 Checking code minification...');
const jsFiles = ['popup.js', 'content.js', 'background.js', 'settings.js'];
jsFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const size = fs.statSync(filePath).size;

        // Check if code appears minified (few lines relative to size)
        const avgLineLength = size / lines.length;
        if (avgLineLength > 100) {
            console.log(`✅ ${file} appears minified (${(size / 1024).toFixed(2)} KB)`);
        } else {
            console.warn(`⚠️  ${file} may not be minified (${(size / 1024).toFixed(2)} KB)`);
        }
    }
});

// Check 5: Sample check for console.log in built files
console.log('\n🔍 Checking for console statements...');
let foundConsole = false;
jsFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        // Look for console.log, console.error, etc.
        // Note: obfuscated code might have these in strings, so we check for actual calls
        const consoleMatches = content.match(/console\.(log|error|warn|debug|info)\s*\(/g);
        if (consoleMatches && consoleMatches.length > 0) {
            console.warn(`⚠️  Found ${consoleMatches.length} console statements in ${file}`);
            foundConsole = true;
        }
    }
});

if (!foundConsole) {
    console.log('✅ No console statements found in JS files');
}

// Check 6: Verify source maps are not present
console.log('\n🗺️  Checking for source maps...');
const sourceMapFiles = findMdFiles(distDir).filter(f => f.endsWith('.map'));
if (sourceMapFiles.length > 0) {
    console.warn('⚠️  Found source map files:');
    sourceMapFiles.forEach(file => console.warn(`   - ${file}`));
} else {
    console.log('✅ No source map files found');
}

// Check 7: Calculate total size
console.log('\n📏 Build size analysis...');
const calculateDirSize = (dir) => {
    let size = 0;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            size += calculateDirSize(filePath);
        } else {
            size += stats.size;
        }
    });
    return size;
};

const totalSize = calculateDirSize(distDir);
console.log(`Total build size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

// Final summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.error('\n❌ Build verification FAILED!');
    console.error('Please fix the errors above before distributing.\n');
    process.exit(1);
} else {
    console.log('\n✅ Build verification PASSED!');
    console.log('Your extension is ready for production distribution.\n');
    console.log('Next steps:');
    console.log('1. Test the extension in Chrome');
    console.log('2. Create a zip file: cd dist && zip -r ../extension.zip . && cd ..');
    console.log('3. Upload to Chrome Web Store\n');
}
