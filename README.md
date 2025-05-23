# WebTiles

## Your Personal Web Dashboard: Turn any website into a live widget.

![WebTiles Dashboard Screenshot](webtiles_screenshot.png)

## Overview

In our rapidly evolving digital world, it is essential to have quick access to relevant information for both professional and personal purposes. Users often start their day with a routine that involves checking various platforms, such as news feeds, social media updates, and essential work tools. However, this process can be time-consuming and inefficient, especially as one has to navigate through a sea of tabs and applications, each containing only a portion of the necessary information.

The need for a more streamlined approach to digital interaction is clear. A platform that allows users to consolidate essential components from various websites into a single, organized dashboard would significantly enhance daily efficiency. **WebTiles** offers a solution by enabling users to create a personalized dashboard that aligns with both their morning routines and professional workflows. This allows them to quickly gather the information they need without constantly switching between different sites and apps. As a result, users can start their day more focused and productive, providing a solid foundation for both professional tasks and personal activities throughout the day.

## Table of Contents ()

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Development Setup](#development-setup)
- [Technology Stack](#technology-stack)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Embed Any Website:** Turn parts of your favorite websites into interactive widgets.
- **Customizable Dashboard:** Arrange and resize widgets to create your perfect workspace.
- **Personalized Styling:** Apply custom CSS to tailor the look and feel of each widget.
- **Multiple Workspaces (if applicable):** Organize widgets across different dashboards for different tasks.
- **Local Data Storage:** All your configurations and widget URLs are stored locally in your browser for privacy and speed.
- **Designed for Efficiency:** Quickly access the information you need without tab-switching.

## Installation (For End Users)

1.  Install WebTiles from the [Chrome Web Store](Coming soon).
2.  Pin the WebTiles extension icon to your browser toolbar for easy access.

## Usage

1.  Click the WebTiles extension icon in your browser toolbar to open your dashboard.
2.  Click the "Add Widget" (or similar) button.
3.  Enter the URL of the website you want to embed.
4.  Optionally, add a name and custom CSS for the widget.
5.  Arrange your widgets on the dashboard as desired.
6.  Your dashboard configuration is automatically saved.

## Development Setup

Interested in contributing to WebTiles? Here's how to get the development environment set up:

### Prerequisites

- Node.js
- pnpm or other package manager

### 1. Clone the Repository

```bash
git clone https://github.com/devconinck/WebTiles.git
cd webtiles
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run the Angular App (for UI development)

This will start the Angular development server, typically on http://localhost:4200. Changes to the frontend code will auto-reload here.

```bash
pnpm start
```

### 4. Build and Test the Chrome Extension

To test the full extension functionality within a Chromium browser:

#### 1. Build the Angular app for the extension:

This command compiles the Angular frontend and places the output into the Extension (or your specified build output) folder.

```bash
pnpm build
```

#### 2. Load the Unpacked Extension:

- Open your Chromium-based browser (e.g., Chrome, Edge, Brave).
- Navigate to chrome://extensions.
- Enable the "Developer mode" toggle (usually in the top-right corner).
- Click the "Load unpacked" button.
- Select the Extension folder from your project directory.

#### 3. Access the Dashboard:

- Pin the WebTiles extension icon to your browser's toolbar.
- Click the icon to open the dashboard (which is the index.html from your Angular build).

### Making Changes:

- Frontend (Angular UI): After making changes to the Angular app code (e.g., in the src folder), you need to rebuild for the extension:

```bash
pnpm build
```

Then, refresh the WebTiles dashboard page in your browser.

- Extension Logic (e.g., background.js, manifest.json): After making changes to files directly within the Extension folder (like background.js), go to chrome://extensions, find WebTiles, and click its refresh icon (a circular arrow).

## Technology Stack

- Frontend: Angular
- Extension APIs: Chrome Extension Manifest V3 (Service Worker, `chrome.storage`, `chrome.webNavigation`, `chrome.scripting`, `chrome.declarativeNetRequest`)
- Styling: CSS (and any specific CSS frameworks/libraries you use)
- Package Manager: pnpm

## Contributing

Contributions are welcome! If you have ideas for improvements or find a bug, please feel free to:

- Open an issue to discuss the change or report the bug.
- Submit a pull request with your proposed changes.

Please try to follow the existing code style and add tests if applicable.

## License

This project is licensed under the [MIT License](LICENSE.md).
