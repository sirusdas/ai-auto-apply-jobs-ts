# LinkedIn Jobs AI Auto Apply Extension

A Chrome extension that automates and auto-fills job applications on LinkedIn with AI assistance.

## Features

- Automatically apply to jobs on LinkedIn with a single click
- AI-powered form filling for job applications
- Customizable settings for job matching criteria
- Resume management with YAML format
- Applied jobs tracking
- Configurable delays to mimic human behavior
- Token-based authentication for API access

## Installation

1. Clone or download this repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Development mode with watch
npm run dev
```

### Project Structure

```
src/
├── assets/           # Static assets
│   └── styles/       # CSS styles
├── background/       # Background scripts
├── content/          # Content scripts
├── popup/            # Popup UI components
│   ├── components/   # React components
│   └── App.tsx       # Main popup application
├── settings/         # Settings page
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

### Key Components

1. **Popup UI** - Main user interface with settings and job tracking
2. **Content Script** - Runs on LinkedIn pages to automate job applications
3. **Background Script** - Handles background tasks and communication
4. **Settings Page** - Advanced configuration options

## Usage

1. After installing the extension, click on the extension icon in the toolbar
2. Configure your API token in the Settings tab
3. Set up your personal information and resume
4. Configure job matching criteria
5. Navigate to LinkedIn jobs page
6. Click the green play button added to the page
7. Watch as the extension automatically applies to matching jobs

## Configuration

### API Token

The extension requires an API token to function. This token is used to authenticate with the backend service that provides AI-powered form filling.

### Personal Information

Configure your personal information in the "Personal Info" tab:
- First and last name
- Phone number
- Email address
- Years of experience
- City

### Resume Management

Upload your resume in YAML format. This will be used to auto-fill application forms with relevant information.

### Job Matching Settings

Configure which jobs to apply to:
- Job titles to target
- Locations to include/exclude
- Job types to consider
- Companies to prefer/avoid

### Delay Settings

Configure delays between actions to mimic human behavior and avoid detection:
- Base delay between actions
- Variation in delays
- Short and very short delays for specific actions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.