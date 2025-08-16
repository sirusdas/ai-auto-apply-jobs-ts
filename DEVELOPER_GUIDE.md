# Developer Guide

This guide provides an overview of the LinkedIn Jobs AI Auto Apply extension architecture, coding practices, and development workflow.

## Project Overview

The LinkedIn Jobs AI Auto Apply extension is a Chrome extension built with React, TypeScript, and Webpack. It automates the job application process on LinkedIn by automatically filling forms and submitting applications based on user-defined criteria.

## Architecture

### High-Level Components

1. **Popup UI** (`src/popup/`)
   - Main user interface accessible via the extension icon
   - Built with React and TypeScript
   - Contains multiple tabs for different settings

2. **Content Script** (`src/content/`)
   - Runs in the context of LinkedIn pages
   - Handles the automation logic
   - Interacts directly with the DOM

3. **Background Script** (`src/background/`)
   - Runs in the background and persists between page loads
   - Handles long-running tasks and communication

4. **Settings Page** (`src/settings/`)
   - Advanced configuration options
   - Accessible through Chrome's extension settings

5. **Utility Functions** (`src/utils/`)
   - Shared utility functions like delay management and storage access

6. **Type Definitions** (`src/types/`)
   - TypeScript interfaces and types used throughout the project

### Data Flow

```
User Configuration (Popup UI) 
       ↓
   Storage API
       ↓
Content Script (LinkedIn Page)
       ↓
    Automation
```

The extension uses Chrome's storage API to persist user settings and applied job history. The content script reads these settings and applies them when automating job applications.

## Coding Practices

### TypeScript

This project uses TypeScript for type safety. All new code should be written in TypeScript, and existing JavaScript code should be gradually migrated.

- Use interfaces for complex data structures (see `src/types/index.ts`)
- Prefer explicit typing over implicit typing
- Use strict mode (`"strict": true` in tsconfig.json)

### React Components

React components follow these conventions:

1. Use functional components with hooks rather than class components
2. Use TypeScript interfaces for props
3. Keep components focused and small
4. Use meaningful component names that describe their purpose

Example:
```tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  isActive: boolean;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, isActive }) => {
  return (
    <div className={isActive ? 'active' : 'inactive'}>
      {title}
    </div>
  );
};

export default MyComponent;
```

### State Management

1. Use React's useState and useEffect hooks for component state
2. Use Chrome's storage API for persistent data (see `src/utils/storage.ts`)
3. For complex state management, consider using Context API or a state management library

### DOM Manipulation

The content script directly manipulates the LinkedIn DOM:

1. Use native DOM APIs rather than jQuery
2. Be careful with selectors as LinkedIn may change their class names
3. Always check if elements exist before manipulating them
4. Use try/catch blocks for error handling

### Asynchronous Operations

1. Use async/await rather than callbacks
2. Handle errors appropriately with try/catch
3. Provide user feedback for long-running operations

### Styling

1. Use CSS modules or CSS-in-JS for component-specific styles
2. Global styles are in `src/assets/styles/popup.css`
3. Follow BEM naming convention for CSS classes

## Development Workflow

### Setting Up the Environment

1. Install Node.js (v14 or higher)
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode with watch

### Building

- `npm run build` - Builds the extension for production
- `npm run dev` - Builds in development mode with watch
- `npm run clean` - Removes the dist directory

### Testing

Currently, the project doesn't have automated tests. When adding tests:

1. Use Jest for unit tests
2. Use Puppeteer for integration tests
3. Test critical user flows like:
   - Saving settings
   - Applying to jobs
   - Handling errors

### Debugging

1. Use Chrome DevTools to debug the popup and content script
2. Check the background script console in `chrome://extensions`
3. Use console.log statements for debugging (remove before committing)
4. Handle errors gracefully and provide user feedback

## Extension APIs

The extension uses several Chrome APIs:

1. **Storage API** - Persist user settings and job history
2. **Tabs API** - Interact with browser tabs
3. **ActiveTab Permission** - Access the currently active tab

When adding new API usage:

1. Add the required permissions to `manifest.json`
2. Check for API availability before using
3. Handle permission errors gracefully

## Project Structure Details

### src/assets/
Static assets like images and stylesheets.

### src/background/
Background script that runs persistently. Currently handles:
- Message passing between content script and popup
- Long-running tasks

### src/content/
Content script that runs on LinkedIn pages. Handles:
- UI injection (buttons, overlays)
- Job application automation
- Form filling
- DOM manipulation

### src/popup/
Popup UI shown when clicking the extension icon. Contains:
- Settings management
- Applied jobs tracking
- User configuration

### src/settings/
Settings page accessible through Chrome's extension settings.

### src/types/
TypeScript interfaces and types used throughout the project.

### src/utils/
Utility functions:
- Storage access functions
- Delay functions for mimicking human behavior

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Pull Request Guidelines

1. Keep PRs focused on a single feature or bug fix
2. Write clear commit messages
3. Update documentation as needed
4. Ensure code follows the established patterns
5. Test your changes thoroughly

## Common Tasks

### Adding a New Setting

1. Add the setting type to `src/types/index.ts`
2. Create a new component in `src/popup/components/`
3. Add the component to `src/popup/App.tsx`
4. Update the content script to read the setting
5. Handle the setting in the automation logic

### Modifying the Automation Logic

1. Locate the relevant code in `src/content/index.ts`
2. Make changes to the automation flow
3. Test on actual LinkedIn job pages
4. Handle edge cases and errors
5. Add appropriate delays to mimic human behavior

### Updating the UI

1. Identify the component to modify in `src/popup/components/`
2. Make changes to the React component
3. Update styles in `src/assets/styles/popup.css` if needed
4. Test the changes in the popup UI

## Troubleshooting

### Common Issues

1. **Extension not loading**
   - Check that all files are built correctly
   - Verify manifest.json is valid
   - Check Chrome's extension console for errors

2. **Settings not saving**
   - Verify Chrome storage API permissions
   - Check for errors in the popup console
   - Ensure async operations are handled correctly

3. **Automation not working**
   - Check that the content script is loaded on the page
   - Verify LinkedIn page structure hasn't changed
   - Check console for errors in the content script

### Debugging Tips

1. Use console.log statements liberally during development
2. Test on different LinkedIn page layouts
3. Check network requests in DevTools
4. Verify element selectors are still valid
5. Test with different user configurations

## Future Improvements

1. Add automated tests
2. Implement more sophisticated job matching algorithms
3. Add support for other job sites
4. Improve error handling and user feedback
5. Add analytics for usage tracking (with user consent)
6. Implement more granular control over automation