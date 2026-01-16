# Sample Manager

A modern, high-performance desktop application for managing your audio sample library. Built with Electron, React, and Vite.

## 🚀 Features

-   **Library Management**: Easily add and scan folders to build your sample database.
-   **Fast Navigation**: Virtualized lists allow for smooth scrolling even with thousands of samples.
-   **Audio Playback**: Integrated waveform player (using `wavesurfer.js`) for quick previewing.
-   **Tagging System**: Organize your sounds with a custom tagging system (add/remove tags).
-   **Search & Filter**:
    -   Real-time search by name.
    -   Filter by tags.
    -   Sort by Name, Size, Duration, or Creation Date.
-   **Persistent Library**: Your library state, including scanned samples and tags, is saved automatically.
-   **Optimized Performance**: efficiently rescans folders and loads persistent data to minimize startup time.

## 🛠️ Tech Stack

-   **Runtime**: [Electron](https://www.electronjs.org/)
-   **Frontend**: [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Audio Visualization**: [wavesurfer.js](https://wavesurfer-js.org/)
-   **Metadata**: [music-metadata](https://github.com/borewit/music-metadata)
-   **UI Virtualization**: [react-window](https://github.com/bvaughn/react-window)
-   **Icons**: [Lucide React](https://lucide.dev/)

## 📦 Installation & Development

### Prerequisites

-   Node.js (v16 or higher recommended)
-   npm or yarn

### Steps

1.  **Clone the repository**
    ```bash
    git clone https://github.com/enorrmann/sample_manager.git
    cd sample_manager
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run in Development Mode**
    Start the Vite dev server and Electron app:
    ```bash
    npm run dev
    # or
    yarn dev
    ```

4.  **Build for Production**
    To build the application for your OS (configured for Linux AppImage/deb):
    ```bash
    npm run build
    # or
    yarn build
    ```

## 📖 Usage

1.  **Add Folders**: Click the "Add Folder" button in the sidebar to select a directory on your computer containing audio samples.
2.  **Scan**: The app will automatically scan the folder and add compatible audio files to your library.
3.  **Preview**: Click on any sample in the list to play it. The waveform will appear in the player at the bottom.
4.  **Tag**: Right-click or use the UI options to add tags to your samples for easier categorization.
5.  **Search/Sort**: Use the search bar or sorting dropdowns to find specific sounds.

## 📄 License

[MIT](LICENSE)
