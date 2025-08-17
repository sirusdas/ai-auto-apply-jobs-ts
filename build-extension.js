const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Copy popup.html to dist
const popupHtmlSrc = path.join(__dirname, 'src', 'popup', 'popup.html');
const popupHtmlDest = path.join(distDir, 'popup.html');
fs.copyFileSync(popupHtmlSrc, popupHtmlDest);
console.log('Copied popup.html to dist folder');

// Copy settings.html to dist
const settingsHtmlSrc = path.join(__dirname, 'src', 'settings', 'settings.html');
const settingsHtmlDest = path.join(distDir, 'settings.html');
fs.copyFileSync(settingsHtmlSrc, settingsHtmlDest);
console.log('Copied settings.html to dist folder');

// Copy manifest.json to dist
const manifestSrc = path.join(__dirname, 'manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');
fs.copyFileSync(manifestSrc, manifestDest);
console.log('Copied manifest.json to dist folder');

// Copy settings.css to dist
const settingsCssSrc = path.join(__dirname, 'settings.css');
const settingsCssDest = path.join(distDir, 'settings.css');
if (fs.existsSync(settingsCssSrc)) {
  fs.copyFileSync(settingsCssSrc, settingsCssDest);
  console.log('Copied settings.css to dist folder');
}

// Copy icons to dist
const icons = ['1616.png', '4848.png', '128128.png'];
icons.forEach(icon => {
  const srcIcon = path.join(__dirname, icon);
  const destIcon = path.join(distDir, icon);
  if (fs.existsSync(srcIcon)) {
    fs.copyFileSync(srcIcon, destIcon);
    console.log(`Copied ${icon} to dist folder`);
  }
});

// Copy compressed_resume.yaml to dist
const resumeSrc = path.join(__dirname, 'assets', 'compressed_resume.yaml');
const resumeDest = path.join(distDir, 'assets', 'compressed_resume.yaml');

const distAssets = path.join(distDir, 'assets');
if (!fs.existsSync(distAssets)) {
  fs.mkdirSync(distAssets);
}

if (fs.existsSync(resumeSrc)) {
  fs.copyFileSync(resumeSrc, resumeDest);
  console.log('Copied compressed_resume.yaml to dist/assets folder');
} else {
  // Try to copy from plain_text_resume.yaml
  const plainTextResumeSrc = path.join(__dirname, 'plain_text_resume.yaml');
  if (fs.existsSync(plainTextResumeSrc)) {
    fs.copyFileSync(plainTextResumeSrc, resumeDest);
    console.log('Copied plain_text_resume.yaml to dist/assets/compressed_resume.yaml');
  } else {
    console.log('No resume file found, skipping');
  }
}

// Copy JSON editor and chart.js files if they exist in the root directory
const jsonEditorSrc = path.join(__dirname, 'jsoneditor.min.js');
const jsonEditorDest = path.join(distDir, 'jsoneditor.min.js');
if (fs.existsSync(jsonEditorSrc)) {
  fs.copyFileSync(jsonEditorSrc, jsonEditorDest);
  console.log('Copied jsoneditor.min.js to dist folder');
}

const jsonEditorCssSrc = path.join(__dirname, 'jsoneditor.min.css');
const jsonEditorCssDest = path.join(distDir, 'jsoneditor.min.css');
if (fs.existsSync(jsonEditorCssSrc)) {
  fs.copyFileSync(jsonEditorCssSrc, jsonEditorCssDest);
  console.log('Copied jsoneditor.min.css to dist folder');
}

const chartJsSrc = path.join(__dirname, 'chart.js');
const chartJsDest = path.join(distDir, 'chart.js');
if (fs.existsSync(chartJsSrc)) {
  fs.copyFileSync(chartJsSrc, chartJsDest);
  console.log('Copied chart.js to dist folder');
}

// Copy create_elements.js if it exists in the root directory
const createElementsSrc = path.join(__dirname, 'create_elements.js');
const createElementsDest = path.join(distDir, 'create_elements.js');
if (fs.existsSync(createElementsSrc)) {
  fs.copyFileSync(createElementsSrc, createElementsDest);
  console.log('Copied create_elements.js to dist folder');
}

// Copy shared.js if it exists in the root directory
const sharedSrc = path.join(__dirname, 'shared.js');
const sharedDest = path.join(distDir, 'shared.js');
if (fs.existsSync(sharedSrc)) {
  fs.copyFileSync(sharedSrc, sharedDest);
  console.log('Copied shared.js to dist folder');
}

// Copy settings-accordion.js if it exists in the root directory
const settingsAccordionSrc = path.join(__dirname, 'settings-accordion.js');
const settingsAccordionDest = path.join(distDir, 'settings-accordion.js');
if (fs.existsSync(settingsAccordionSrc)) {
  fs.copyFileSync(settingsAccordionSrc, settingsAccordionDest);
  console.log('Copied settings-accordion.js to dist folder');
}

// Copy CSS files from assets
const assetsCssSrc = path.join(__dirname, 'src', 'assets', 'styles');
const distAssetsCss = path.join(distDir, 'assets', 'styles');
if (!fs.existsSync(distAssetsCss)) {
  fs.mkdirSync(distAssetsCss, { recursive: true });
}

const cssFiles = ['popup.css', 'settings.css'];
cssFiles.forEach(cssFile => {
  const srcCss = path.join(assetsCssSrc, cssFile);
  const destCss = path.join(distAssetsCss, cssFile);
  if (fs.existsSync(srcCss)) {
    fs.copyFileSync(srcCss, destCss);
    console.log(`Copied ${cssFile} to dist/assets/styles folder`);
  }
});

// Copy JavaScript files from assets
const assetsScriptsSrc = path.join(__dirname, 'src', 'assets', 'scripts');
const distAssetsScripts = path.join(distDir, 'assets', 'scripts');
if (fs.existsSync(assetsScriptsSrc)) {
  if (!fs.existsSync(distAssetsScripts)) {
    fs.mkdirSync(distAssetsScripts, { recursive: true });
  }
  
  const scriptFiles = fs.readdirSync(assetsScriptsSrc);
  scriptFiles.forEach(scriptFile => {
    const srcScript = path.join(assetsScriptsSrc, scriptFile);
    const destScript = path.join(distAssetsScripts, scriptFile);
    if (fs.existsSync(srcScript)) {
      fs.copyFileSync(srcScript, destScript);
      console.log(`Copied ${scriptFile} to dist/assets/scripts folder`);
    }
  });
}

console.log('Extension build completed!');