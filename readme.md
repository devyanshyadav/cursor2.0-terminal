# Cursor2.0 Terminal Agent
![banner](public/banner.png)

A terminal-based AI agent for creating, updating, and executing coding projects with minimal folder structures and production-ready code. Powered by the Gemini API, it supports various project types (e.g., HTML, Python, React) and provides detailed execution instructions.

## Features
- **Project Creation**: Generate new projects with minimal folder structures (e.g., HTML to-do lists, Python scripts).
- **Project Updates**: Fix issues in existing files without regenerating entire projects (e.g., "CSS file not working").
- **Execution Guidance**: Provide detailed instructions via an `execute.md` file for running projects, including dependencies, compatibility, and troubleshooting.
- **Interactive CLI**: Approve proposed project structures and input commands via a terminal interface.
- **Beautiful UI for Web Projects**: Generate visually appealing HTML/React interfaces with Tailwind CSS, responsive design, and subtle animations.
- **Spinner & Animations**: Display loading spinners and celebratory animations for a polished user experience.

## Prerequisites
- **Node.js**: Version 14 or higher (includes npm). Download from [nodejs.org](https://nodejs.org/).
- **Gemini API Key**: Obtain an API key and set it in a `.env` file as `GEMINI_API_KEY`.

## Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd cursor2.0-terminal-agent
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your-api-key-here
   ```
4. Run the agent:
   ```bash
   npm start
   ```

## Usage
1. Start the terminal agent:
   ```bash
   node index.js
   ```
2. Interact with the CLI:
   - **Create a project**: `Create a to-do list in HTML` or `Write a Python script for a calculator`.
   - **Update a project**: `css file is not working` or `fix the python script`.
   - **Run a project**: `run the project` or `execute the python script`.
   - **Other commands**:
     - `help`: Display available commands.
     - `exit` or `quit`: Exit the program.
3. Approve project structures when prompted (for new projects).
4. Find projects in the `chaicode` directory, with `execute.md` for execution instructions.

## Project Structure
All projects are stored in the `chaicode` directory. Example structures:
- **HTML Project** (e.g., to-do list):
  ```
  chaicode/todo-app/
  ├── index.html
  ├── style.css
  ├── script.js
  ├── README.md
  ├── execute.md
  ```
- **Python Script** (e.g., calculator):
  ```
  chaicode/calculator/
  ├── calculator.py
  ├── README.md
  ├── execute.md
  ```

## Dependencies
- **Node.js Modules**:
  - `dotenv`: Load environment variables.
  - `node-fetch`: Make HTTP requests to the Gemini API.
  - `chalk`: Add color to terminal output.
  - `fs`, `path`, `readline`: Node.js built-in modules for file operations and CLI input.
- **External Services**:
  - Gemini API for content generation.
  - Tailwind CSS (via CDN for HTML projects).
  - FontAwesome (via CDN for icons in web projects).
  - Pexels or Placehold.co for placeholder images.

## Execution Instructions
- Detailed instructions are provided in each project's `execute.md` file, including:
  - Steps to run the project (e.g., `python calculator.py`, `npm start`).
  - Required dependencies (e.g., Python 3.6+, Node.js).
  - Compatibility (e.g., browser support, OS compatibility).
  - Potential issues and fixes (e.g., port conflicts, missing dependencies).
- To run the agent itself, see the [Installation](#installation) section.

## Compatibility
- **OS**: Works on Windows, macOS, and Linux.
- **Node.js**: Requires version 14 or higher.
- **Browsers** (for web projects): Chrome, Firefox, Edge, Safari (modern versions).

## Potential Issues
- **Gemini API Key Missing**: Ensure `GEMINI_API_KEY` is set in `.env`.
- **Node.js Not Installed**: Install Node.js if `node` or `npm` commands fail.
- **OS Not Supported**: Ensure you're using a supported OS (Windows, macOS, Linux).
- **Network Issues**: Ensure a stable internet connection for API requests.
- **File Path Errors**: Avoid nested `chaicode` directories (handled automatically).
- **Dependency Errors**: Run `npm install` if module errors occur.
