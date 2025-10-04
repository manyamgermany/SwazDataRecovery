# Swaz Data Recovery Labs & P2P Transfer

This is a responsive web application that serves two main purposes:
1.  **Data Recovery Simulation**: It simulates the process of recovering lost or deleted files from various storage devices, educating users on the potential outcomes of a real data loss scenario.
2.  **Secure Peer-to-Peer File Transfer**: It provides a fully-featured, end-to-end encrypted file sharing utility that allows users to send files directly between two browsers without uploading them to a central server.

The application is built with a modern tech stack and emphasizes security, user experience, and a clean, component-based architecture.

## Core Features

### 1. Data Recovery Simulation
A guided, three-step process that demonstrates how professional data recovery works.
- **Drive Selection**: Users can choose from a list of mock storage devices (SSD, HDD, USB) to begin a scan.
- **Simulated Scanning**: A visually engaging progress bar shows the scan's progress as the application generates a list of "recoverable" files.
- **Results & Filtering**: Displays a list of found files with details like recovery chance and path. Users can filter results by file type (Image, Video, Document, Audio).
- **Gemini-Powered Previews**: Utilizes the Google Gemini API to generate dynamic, context-aware summaries and descriptions for simulated files, providing a rich preview experience.

### 2. Secure Peer-to-Peer (P2P) File Transfer
A robust and secure system for sharing files directly between two users.
-   **End-to-End Encryption (E2E)**: Establishes a secure channel using the Elliptic Curve Diffie-Hellman (ECDH) key exchange protocol. All files are encrypted chunk-by-chunk using AES-256-GCM before being transmitted, ensuring only the sender and receiver can access the data.
-   **Serverless Transfer via WebRTC**: While a lightweight WebSocket server is used for initial signaling (connecting the two peers), the actual file data is transferred directly between browsers using WebRTC data channels, ensuring privacy and speed.
-   **Large File Support & Memory Efficiency**: Utilizes streaming to send files chunk-by-chunk, keeping memory usage low and constant even for very large files. The transfer speed automatically adapts to network conditions using data channel backpressure for a smooth and reliable experience.
-   **Real-Time Transfer Metrics**: The UI provides users with live feedback on the transfer, including the current speed, average speed, and an estimated time of arrival (ETA), allowing them to monitor the process effectively.
