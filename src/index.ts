import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import fetch from 'node-fetch';
import chalk from 'chalk';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

type StepType = 'initialization' | 'analyze' | 'generate_structure' | 'generate_files' | 'final_result';

interface StepResponse {
  step: StepType;
  content: string;
  function: string | null;
  args: any;
}

let contents: { role: string; parts: { text: string }[] }[] = [];
let proposedStructure: string[] = [];
const ROOT_DIR = 'chaicode';
let projectType: string | undefined;
let projectName: string | undefined;

// Ensure root directory exists
const ensureRootDir = () => {
  if (!fs.existsSync(ROOT_DIR)) {
    fs.mkdirSync(ROOT_DIR, { recursive: true });
  }
};

// Normalize paths to prevent nested chaicode folders
const normalizePath = (filePath: string): string => {
  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  const parts = normalized.split('/').filter(part => part);
  const chaicodeIndex = parts.indexOf('chaicode');
  if (chaicodeIndex !== -1 && chaicodeIndex !== 0) {
    parts.splice(0, chaicodeIndex);
  }
  return path.join(ROOT_DIR, ...parts).replace(/\\/g, '/');
};

// Terminal spinner animation
const showSpinner = async (message: string, duration: number): Promise<void> => {
  const frames = ['🌟', '✨', '💫', '🌠', '🌟', '✨', '💫', '🌠'];
  let i = 0;
  const start = Date.now();
  process.stdout.write(chalk.cyan.bold(`${message} `));
  return new Promise(resolve => {
    const interval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan.bold(`${message} ${frames[i++ % frames.length]}`)}`);
      if (Date.now() - start >= duration) {
        clearInterval(interval);
        process.stdout.write(`\r${chalk.cyan.bold(`${message} Done!`)}\n`);
        resolve();
      }
    }, 100);
  });
};

// Animation after user approves structure
const showApprovalAnimation = async (): Promise<void> => {
  const frames = ['🎉', '🎈', '🎊', '🎁', '🎉', '🎈', '🎊', '🎁'];
  let i = 0;
  const duration = 1000;
  const start = Date.now();
  process.stdout.write(chalk.green.bold('Structure Approved! '));
  return new Promise(resolve => {
    const interval = setInterval(() => {
      process.stdout.write(`\r${chalk.green.bold(`Structure Approved! ${frames[i++ % frames.length]}`)}`);
      if (Date.now() - start >= duration) {
        clearInterval(interval);
        process.stdout.write(`\r${chalk.green.bold('Structure Approved! Creating Your Project!')}\n`);
        process.stdout.write(`\r${chalk.yellow.bold('Waiting for approval...')}\n`);
        resolve();
      }
    }, 100);
  });
};

// Generate content for execute.md
const generateExecuteMdContent = (projectType: string, projectName: string): string => {
  let content = `# Execution Instructions for ${projectName}\n\n`;
  content += `This document provides detailed instructions on how to run your ${projectType} project, along with necessary dependencies, compatibility information, and potential issues you might encounter.\n\n`;

  content += `## How to Run the Project\n\n`;
  if (projectType.toLowerCase().includes('html')) {
    content += `- **Step 1**: Navigate to the project directory: \`${ROOT_DIR}/${projectName}\`\n`;
    content += `- **Step 2**: Open \`index.html\` in a web browser (e.g., Chrome, Firefox) by double-clicking the file or right-clicking and selecting "Open with" your browser.\n\n`;
    content += `### Dependencies\n- None required. This is a static HTML project that runs directly in a browser.\n\n`;
    content += `### Compatibility\n- Works on all modern browsers (Chrome, Firefox, Edge, Safari).\n- No additional software needed.\n\n`;
    content += `### Potential Issues\n- **Browser Compatibility**: Ensure your browser is up to date to support modern HTML5/CSS3 features.\n- **File Path Issues**: If the page doesn't load correctly, ensure you're opening the file directly from the file system (not through a server unless specified).\n`;
  } else if (projectType.toLowerCase().includes('python')) {
    content += `- **Step 1**: Open your terminal.\n`;
    content += `- **Step 2**: Navigate to the project directory:\n`;
    content += `  \`\`\`bash\n  cd ${ROOT_DIR}/${projectName}\n  \`\`\`\n`;
    content += `- **Step 3**: Run the script:\n`;
    content += `  \`\`\`bash\n  python ${projectName}.py\n  \`\`\`\n\n`;
    content += `### Dependencies\n- **Python**: Version 3.6 or higher is required.\n- No additional libraries are needed for this basic script.\n\n`;
    content += `### Compatibility\n- Works on Windows, macOS, and Linux.\n- Requires Python to be installed (download from https://www.python.org/downloads/).\n\n`;
    content += `### Potential Issues\n- **Python Not Installed**: If Python isn't installed, you'll see a "command not found" error. Install Python and ensure it's added to your PATH.\n- **Version Mismatch**: Ensure you're using Python 3 (run \`python --version\` or \`python3 --version\`).\n- **File Path Issues**: Ensure you're in the correct directory when running the script.\n`;
  } else if (projectType.toLowerCase().includes('react')) {
    content += `- **Step 1**: Open your terminal.\n`;
    content += `- **Step 2**: Navigate to the project directory:\n`;
    content += `  \`\`\`bash\n  cd ${ROOT_DIR}/${projectName}\n  \`\`\`\n`;
    content += `- **Step 3**: Install dependencies:\n`;
    content += `  \`\`\`bash\n  npm install\n  \`\`\`\n`;
    content += `- **Step 4**: Start the development server:\n`;
    content += `  \`\`\`bash\n  npm start\n  \`\`\`\n`;
    content += `- **Step 5**: Open http://localhost:3000 in your browser.\n\n`;
    content += `### Dependencies\n- **Node.js**: Version 14 or higher (includes npm). Download from https://nodejs.org/.\n- **React**: Included in the project (installed via npm).\n- **Tailwind CSS**: Assumed to be set up in the project (via npm).\n\n`;
    content += `### Compatibility\n- Works on Windows, macOS, and Linux.\n- Requires Node.js and npm to be installed.\n- Best viewed in modern browsers (Chrome, Firefox, Edge).\n\n`;
    content += `### Potential Issues\n- **Node.js Not Installed**: If Node.js isn't installed, you'll see a "command not found" error. Install Node.js and npm.\n- **Port Conflict**: If port 3000 is in use, the React dev server will prompt you to use a different port.\n- **Dependency Errors**: If \`npm install\` fails, delete the \`node_modules\` folder and \`package-lock.json\` file, then run \`npm install\` again.\n`;
  } else {
    content += `- **Step 1**: Navigate to the project directory: \`${ROOT_DIR}/${projectName}\`\n`;
    content += `- **Step 2**: Refer to the specific instructions in the \`README.md\` file for running the project.\n\n`;
    content += `### Dependencies\n- Refer to the \`README.md\` file for any required dependencies.\n\n`;
    content += `### Compatibility\n- Refer to the \`README.md\` file for compatibility information.\n\n`;
    content += `### Potential Issues\n- **Missing Dependencies**: Ensure all required software and libraries are installed as per the \`README.md\`.\n- **Environment Setup**: Check your environment configuration if the project fails to run.\n`;
  }

  return content;
};

// Display celebratory message with reference to execute.md
const showSuccessAnimation = () => {
  const asciiArt = `
  ${chalk.green('============================================')}
  ${chalk.green.bold('🎉 Project Created Successfully! 🎉')}
  ${chalk.green('============================================')}
  ${chalk.yellow('       🚀 Ready to Launch! 🚀')}
  ${chalk.white('        Your project is now live in:')}
  ${chalk.cyan.bold(`          ${ROOT_DIR}/${projectName || '___'}`)}
  ${chalk.green('============================================')}
  `;
  console.log(asciiArt);

  console.log(chalk.cyan('========= How to Start Your Project ========='));
  console.log(chalk.white(`📜 Detailed instructions are available in:`));
  console.log(chalk.white(`   ${ROOT_DIR}/${projectName || '___'}/execute.md`));
  console.log(chalk.white(`   This includes steps to run the project, dependencies, compatibility, and troubleshooting.`));
  console.log(chalk.cyan('============================================'));
};

// Read directory contents
const readDirectory = (dirPath: string = ROOT_DIR) => {
  try {
    ensureRootDir();
    const items = fs.readdirSync(dirPath);
    const fileDetails = items.map(item => {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      return {
        name: item,
        path: itemPath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        created: stats.birthtime,
      };
    });
    return {
      path: dirPath,
      items: fileDetails,
      message: `Successfully read directory: ${dirPath}`,
    };
  } catch (error) {
    return {
      path: dirPath,
      items: [],
      message: `Error reading directory ${dirPath}: ${(error as Error).message}`,
    };
  }
};

// Create or update a file with content
const createDynamicFile = (args: { fileName: string; content: string }) => {
  try {
    ensureRootDir();
    const fileName = normalizePath(args.fileName);
    const dirPath = path.dirname(fileName);
    if (dirPath !== ROOT_DIR && !fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    if (fs.existsSync(fileName)) {
      const existingContent = fs.readFileSync(fileName, 'utf-8');
      if (existingContent === args.content) {
        console.log(chalk.yellow(`📄 ${fileName} unchanged (content identical)`));
        return `File ${fileName} unchanged (content identical)`;
      }
      fs.writeFileSync(fileName, args.content);
      console.log(chalk.blue(`🔄 ${fileName} updated successfully`));
      return `File ${fileName} updated successfully`;
    }
    fs.writeFileSync(fileName, args.content);
    console.log(chalk.green(`✅ ${fileName} created successfully`));
    return `File ${fileName} created successfully`;
  } catch (error) {
    console.log(chalk.red(`❌ Error creating/updating file ${args.fileName}: ${(error as Error).message}`));
    return `Error creating/updating file: ${(error as Error).message}`;
  }
};

// Generate project structure with execute.md
const generateProjectStructure = async (projectType: string, description: string): Promise<string> => {
  const prompt = `Generate a JSON object representing the folder and file structure for a ${projectType} project that ${description}. Keep the structure minimal and appropriate for the project type (e.g., a simple HTML project should only have essential files like index.html, style.css, and script.js; a Python script should avoid unnecessary folders like src/ or tests/ unless explicitly needed). Include all necessary files and folders with their relative paths inside the "${ROOT_DIR}" directory. Always include a "README.md" file for project details and an "execute.md" file for execution instructions. Return only the JSON object with a "structure" array. Example for an HTML project:
  {
    "structure": [
      "${ROOT_DIR}/todo-app/index.html",
      "${ROOT_DIR}/todo-app/style.css",
      "${ROOT_DIR}/todo-app/script.js",
      "${ROOT_DIR}/todo-app/README.md",
      "${ROOT_DIR}/todo-app/execute.md"
    ]
  }
  Example for a simple Python script:
  {
    "structure": [
      "${ROOT_DIR}/calculator/calculator.py",
      "${ROOT_DIR}/calculator/README.md",
      "${ROOT_DIR}/calculator/execute.md"
    ]
  }`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data: any = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanedText = rawText
      .replace(/^```json\s*|\s*```$/gm, '')
      .replace(/^```.*$/gm, '')
      .trim();
    try {
      JSON.parse(cleanedText);
      return cleanedText;
    } catch (error) {
      return '{}';
    }
  } catch (error) {
    return '{}';
  }
};

// Generate file content with beautiful UI for web projects
const generateFileContent = async (filePath: string, projectType: string, description: string, isUpdate: boolean = false, updateIssue?: string): Promise<string> => {
  const normalizedFilePath = normalizePath(filePath);
  const fileType = path.extname(filePath).slice(1) || path.basename(filePath);
  let prompt = `Generate production-ready content for a ${fileType} file at "${normalizedFilePath}" in a ${projectType} project that ${description}. Follow best practices (e.g., modular code, error handling, comments). For config files, include sensible defaults. For source files, include necessary imports/exports. Return ONLY the file content.`;

  // Handle execute.md content
  if (fileType === 'md' && normalizedFilePath.endsWith('execute.md')) {
    return generateExecuteMdContent(projectType, projectName || 'unknown');
  }

  // For web-related files (HTML, React, etc.), apply the UI design guidelines
  if (fileType === 'html' || projectType.toLowerCase().includes('react') || projectType.toLowerCase().includes('web')) {
    prompt = `You are an expert UI developer specializing in creating beautiful, production-ready web interfaces. Your task is to generate a ${fileType} file at "${normalizedFilePath}" for a ${projectType} project that ${description}. Follow these guidelines to ensure a visually appealing and functional UI:

    Analysis Requirements:
    1. Component Structure:
       - Use a clear hierarchy and layout structure
       - Include interactive elements and states (e.g., buttons, forms)
       - Consider responsive design for mobile and desktop
       - Ensure accessibility (e.g., alt text for images, semantic markup)
    2. Visual Elements:
       - Use modern typography (e.g., sans-serif fonts like Arial or Poppins)
       - Apply a consistent color scheme (e.g., soft blues, whites, and accents like teal or orange)
       - Use consistent spacing (e.g., 4px, 8px, 16px scale)
       - Add subtle animations (e.g., hover effects, transitions)
       - Include icons (e.g., from a CDN like FontAwesome) and images (e.g., from Pexels: https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&cs=tinysrgb&w=600, or fallback to https://placehold.co/600x400)
       - Apply rounded borders and subtle shadows
    3. Layout Analysis:
       - Use Flexbox for layout (flex, flex-col, justify-center, items-center)
       - Ensure proper alignment and spacing between elements
       - Make the layout responsive (mobile-first, adjust for larger screens)
       - Prevent content overflow (e.g., use flex-wrap for multiple elements)
    4. Style Specifications:
       - Use a color palette with soft tones (e.g., bg-blue-100, text-teal-600)
       - Apply a typography hierarchy (e.g., larger headings, smaller body text)
       - Use a consistent spacing system (e.g., p-4, m-2)
       - Add subtle borders (e.g., border, rounded-md) and shadows (e.g., shadow-md)

    Development Guidelines:
    1. Code Structure:
       - Use semantic HTML (for HTML files) or JSX (for React)
       - Follow best practices for the project type
       - Include responsive design considerations
    2. Styling Requirements:
       - For HTML: Use inline Tailwind CSS via CDN (e.g., <script src="https://cdn.tailwindcss.com"></script>)
       - For React: Assume Tailwind CSS is set up and use Tailwind classes
       - Use Tailwind's color palette, spacing scale, and utilities
    3. Layout Requirements:
       - Use Flexbox for layout (e.g., flex, flex-col, justify-center)
       - Apply flex-wrap for containers with multiple elements to prevent overflow
       - Use responsive classes (e.g., sm:, md:)
    4. Asset Handling:
       - For icons: Use FontAwesome via CDN (e.g., <i class="fas fa-plus"></i>)
       - For images: Use Pexels (e.g., https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&w=600) or fallback to https://placehold.co/600x400
       - Include alt text for accessibility
    5. Responsive Design:
       - Use a mobile-first approach
       - Ensure the layout works on all screen sizes
    6. Functionality:
       - Include basic interactivity (e.g., JavaScript for HTML, React state for React)
       - Handle events properly (e.g., onclick)

    Output Requirements:
    - Provide only the complete, working code for the ${fileType} file
    - Include all necessary Tailwind classes (via CDN for HTML)
    - No explanations or comments
    - Ready-to-use implementation

    ${isUpdate && updateIssue ? `The file has an issue: "${updateIssue}". Update the content to fix this issue while preserving the file's core functionality.` : 'If the file exists, enhance or update the existing functionality while preserving its purpose.'}

    Return ONLY the file content.`;

  } else if (fileType === 'py' && projectType.toLowerCase().includes('web')) {
    prompt += ` If this Python script generates a web interface (e.g., using Flask), ensure the HTML output follows the same UI guidelines as above for HTML files.`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || `// Default ${fileType} content`;
  } catch (error) {
    return `// Error generating content for ${normalizedFilePath}`;
  }
};

// Present structure to user and get confirmation
const presentStructure = async (structure: string[]): Promise<boolean> => {
  return new Promise(resolve => {
    console.log(chalk.cyan('========= Proposed Project Structure ========='));
    structure.forEach(file => console.log(chalk.white(`  📂 ${file}`)));
    console.log(chalk.cyan('============================================='));
    rl.question(chalk.cyan.bold('Do you approve this structure? (yes/no): '), async answer => {
      if (answer.trim().toLowerCase() === 'yes') {
        await showApprovalAnimation();
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
};

const available_tools = {
  read_directory: {
    fn: readDirectory,
    description: 'Reads the contents of a directory and returns files and subdirectories',
  },
  create_dynamic_file: {
    fn: createDynamicFile,
    description: 'Creates or updates a file with the specified name and content',
  },
  generate_project_structure: {
    fn: generateProjectStructure,
    description: 'Generates the folder and file structure for a project',
  },
  generate_file_content: {
    fn: generateFileContent,
    description: 'Generates content for a file based on its path, project type, and description',
  },
};

const reqBody = {
  system_instruction: {
    parts: [
      {
        text: `You are an AI assistant specialized in creating and updating full-fledged projects of any type based on user requests. All projects are stored in the "${ROOT_DIR}" directory. You will analyze the request, determine the project type, generate a minimal folder structure within "${ROOT_DIR}", present it to the user for approval (for new projects), and create or update files with appropriate content. For update requests (e.g., "css file is not working"), identify the issue, locate the relevant file, and fix it without recreating the entire project. Additionally, you can guide users on how to execute their projects and respond to terminal execution-related queries. Always include an "execute.md" file in the project structure to provide detailed execution instructions, dependencies, compatibility, and potential issues.

        For a given user input, break it down into exactly 5 steps:
        1. "initialization": Understand the user's request and determine if it's a new project, an update, or an execution query.
        2. "analyze": Identify the project type, name, and requirements, checking existing files in "${ROOT_DIR}". For updates, identify the specific issue and relevant file. For execution queries, identify the project and execution needs. Always include the project name in the content (e.g., "I'll name it 'todo-app'").
        3. "generate_structure": For new projects, generate and propose a minimal folder/file structure within "${ROOT_DIR}", including "README.md" and "execute.md". Skip this step for updates or execution queries.
        4. "generate_files": Create or update files with appropriate content. For updates, fix the specific issue in the relevant file. Skip this step for execution queries. For "execute.md", populate it with execution instructions, dependencies, compatibility, and potential issues.
        5. "final_result": Confirm successful creation/update or provide execution instructions for execution queries, referencing the "execute.md" file.

        Rules:
        - Analyze the request to determine the project type (e.g., Python script, web app, API) and functionality.
        - Correctly infer the project type from the request (e.g., "to-do list in HTML" is an HTML web app, not Python).
        - Always extract and include the project name in the "analyze" step content (e.g., "I'll name it 'todo-app'").
        - All file operations (read/write) occur within "${ROOT_DIR}".
        - Check for existing files in "${ROOT_DIR}" during "analyze" to support updates.
        - For new projects, generate a minimal structure (e.g., a simple HTML project should only have index.html, style.css, script.js; a Python script should avoid unnecessary folders like src/ or tests/ unless needed).
        - Always include "README.md" for project details and "execute.md" for execution instructions in the structure.
        - For update requests (e.g., "css file is not working"), identify the project (e.g., todo-app), locate the relevant file (e.g., style.css), and fix the issue without regenerating the entire project.
        - For execution queries (e.g., "run the project", "execute the python script"), provide detailed terminal execution instructions without modifying files, referencing the "execute.md" file.
        - Output JSON: { "step": <step_name>, "content": <step_content>, "function": <function_name> | null, "args": <function_args> | null }.
        - Perform one step at a time, waiting for the next input.
        - Ensure files follow best practices (e.g., modular code, error handling).
        - Create directories as needed within "${ROOT_DIR}".
        - In "generate_structure", store the structure for user confirmation (for new projects).
        - In "generate_files", update existing files or create new ones only if necessary.
        - Process the request in exactly 5 steps.

        Available Tools:
        ${Object.entries(available_tools)
          .map(([toolName, { description }]) => ` - ${toolName}: ${description}`)
          .join('\r\n')}

        Example Flows:
        User Query: "Create a to-do list in HTML"
        1. { "step": "initialization", "content": "I'll create a new HTML to-do list project in '${ROOT_DIR}'.", "function": null, "args": null }
        2. { "step": "analyze", "content": "The project is an HTML to-do list app. I'll name it 'todo-app' in '${ROOT_DIR}' with HTML, CSS, and JavaScript.", "function": "read_directory", "args": "${ROOT_DIR}" }
        3. { "step": "generate_structure", "content": "Generating structure for the to-do list app.", "function": "generate_project_structure", "args": { "projectType": "HTML web app", "description": "creates a to-do list with add, edit, and delete functionality" } }
        4. { "step": "generate_files", "content": "Creating files for the to-do list app.", "function": "create_dynamic_file", "args": [{ "fileName": "todo-app/index.html", "content": "..." }, ...] }
        5. { "step": "final_result", "content": "Successfully created '${ROOT_DIR}/todo-app' with HTML, CSS, and JavaScript for a to-do list. Execution instructions are in 'execute.md'.", "function": null, "args": null }

        User Query: "Write a Python script for a calculator"
        1. { "step": "initialization", "content": "I'll create a new Python calculator project in '${ROOT_DIR}'.", "function": null, "args": null }
        2. { "step": "analyze", "content": "The project is a Python calculator script. I'll name it 'calculator' in '${ROOT_DIR}'.", "function": "read_directory", "args": "${ROOT_DIR}" }
        3. { "step": "generate_structure", "content": "Generating structure for the Python calculator.", "function": "generate_project_structure", "args": { "projectType": "Python script", "description": "implements a calculator with basic arithmetic operations" } }
        4. { "step": "generate_files", "content": "Creating files for the Python calculator.", "function": "create_dynamic_file", "args": [{ "fileName": "calculator/calculator.py", "content": "..." }, ...] }
        5. { "step": "final_result", "content": "Successfully created '${ROOT_DIR}/calculator' with a Python script. Execution instructions are in 'execute.md'.", "function": null, "args": null }

        User Query: "run the project"
        1. { "step": "initialization", "content": "I'll provide instructions to run an existing project in '${ROOT_DIR}'.", "function": null, "args": null }
        2. { "step": "analyze", "content": "The request is to run a project. Found project 'todo-app' in '${ROOT_DIR}', identified as an HTML web app.", "function": "read_directory", "args": "${ROOT_DIR}" }
        3. { "step": "generate_structure", "content": "Skipping structure generation for execution request.", "function": null, "args": null }
        4. { "step": "generate_files", "content": "Skipping file generation for execution request.", "function": null, "args": null }
        5. { "step": "final_result", "content": "Execution instructions for '${ROOT_DIR}/todo-app' are in 'chaicode/todo-app/execute.md'.", "function": null, "args": null }
        `,
      },
    ],
  },
  contents: contents,
};

async function generateContent(): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.log(chalk.red('❌ Error generating content:', error));
    return null;
  }
}

async function runAgent(userMsg: string) {
  console.log(chalk.cyan('========= Processing Request ========='));
  console.log(chalk.white(`📋 Request: ${userMsg}`));
  console.log(chalk.cyan('====================================='));
  contents.push({ role: 'user', parts: [{ text: userMsg }] });

  let isUpdateRequest = false;
  let isExecutionRequest = false;
  let updateIssue: string | undefined;
  let updateFile: string | undefined;

  while (true) {
    const response = await generateContent();
    if (!response) {
      console.log(chalk.red('❌ Failed to get a response from the API'));
      break;
    }

    const cleaned = response
      .replace(/^```json\s*|\s*```$/gm, '')
      .replace(/^```.*$/gm, '')
      .replace(/\n\s*/g, '')
      .trim();

    let dataObj: StepResponse;

    try {
      dataObj = JSON.parse(cleaned);
      console.log(chalk.cyan(`📍 Step: ${dataObj.step}`));
      console.log(chalk.white(`📝 ${dataObj.content}`));

      contents.push({ role: 'model', parts: [{ text: JSON.stringify(dataObj) }] });

      if (dataObj.step === 'initialization') {
        const lowerMsg = userMsg.toLowerCase();
        if (lowerMsg.includes('not working') || lowerMsg.includes('fix') || lowerMsg.includes('update')) {
          isUpdateRequest = true;
          updateIssue = userMsg;
        } else if (lowerMsg.includes('run') || lowerMsg.includes('execute') || lowerMsg.includes('start')) {
          isExecutionRequest = true;
        }
      }

      if (dataObj.step === 'analyze') {
        // Extract project type and name for execution instructions
        const typeMatch = dataObj.content.match(/identified as an? ([\w\s]+)\./);
        const nameMatch = dataObj.content.match(/I'll name it '([^']+)'/) || dataObj.content.match(/Found project '([^']+)'/);
        if (typeMatch) projectType = typeMatch[1];
        if (nameMatch) projectName = nameMatch[1];

        if (isUpdateRequest) {
          const match = dataObj.content.match(/Found project '([^']+)' in '.*' with a ([^']+)\.(\w+)/);
          if (match) {
            const projectName = match[1];
            const fileName = match[2];
            const fileExt = match[3];
            updateFile = `${projectName}/${fileName}.${fileExt}`;
          }
        }
      }

      if (dataObj.function && available_tools[dataObj.function as keyof typeof available_tools]) {
        let functionResult;
        const toolFn: any = available_tools[dataObj.function as keyof typeof available_tools].fn;

        if (dataObj.function === 'generate_project_structure') {
          await showSpinner('Generating project structure...', 1500);
          functionResult = await toolFn(dataObj.args.projectType, dataObj.args.description);
          const parsedResult = JSON.parse(functionResult);
          proposedStructure = parsedResult.structure || [];
          functionResult = JSON.stringify(parsedResult);
        } else if (dataObj.function === 'generate_file_content') {
          await showSpinner(`Generating content for ${dataObj.args.filePath}...`, 1000);
          functionResult = await toolFn(
            dataObj.args.filePath,
            dataObj.args.projectType,
            dataObj.args.description,
            isUpdateRequest,
            updateIssue
          );
        } else if (dataObj.function === 'create_dynamic_file') {
          if (Array.isArray(dataObj.args)) {
            functionResult = [];
            for (const arg of dataObj.args) {
              await showSpinner(`Processing ${arg.fileName}...`, 800);
              functionResult.push(toolFn(arg));
            }
            functionResult = functionResult.join('\n');
          } else {
            await showSpinner(`Processing ${dataObj.args.fileName}...`, 800);
            functionResult = toolFn(dataObj.args);
          }
        } else {
          functionResult = toolFn(dataObj.args);
        }

        contents.push({ role: 'user', parts: [{ text: JSON.stringify(functionResult) }] });
      }

      if (dataObj.step === 'generate_structure' && proposedStructure.length > 0 && !isUpdateRequest && !isExecutionRequest) {
        const approved = await presentStructure(proposedStructure);
        if (!approved) {
          console.log(chalk.red('❌ Structure not approved. Aborting project creation.'));
          break;
        }
      }

      if (dataObj.step === 'generate_files' && isUpdateRequest && updateFile) {
        dataObj.function = 'create_dynamic_file';
        dataObj.args = [{
          fileName: updateFile,
          content: await generateFileContent(updateFile, dataObj.args?.projectType || 'HTML web app', dataObj.args?.description || userMsg, true, updateIssue),
        }];
        const toolFn: any = available_tools['create_dynamic_file'].fn;
        await showSpinner(`Updating ${updateFile}...`, 800);
        const functionResult = toolFn(dataObj.args);
        contents.push({ role: 'user', parts: [{ text: JSON.stringify(functionResult) }] });
      }

      if (dataObj.step === 'final_result') {
        console.log(chalk.cyan('========= Project Summary ========='));
        console.log(chalk.white(`📝 ${dataObj.content}`));
        if (isExecutionRequest) {
          console.log(chalk.cyan('========= Execution Instructions ========='));
          console.log(chalk.white(`📜 Detailed instructions are available in:`));
          console.log(chalk.white(`   ${ROOT_DIR}/${projectName || 'unknown'}/execute.md`));
          console.log(chalk.white(`   This includes steps to run the project, dependencies, compatibility, and troubleshooting.`));
          console.log(chalk.cyan('==========================================='));
        } else {
          showSuccessAnimation();
        }
        proposedStructure = [];
        projectType = undefined;
        projectName = undefined;
        isUpdateRequest = false;
        isExecutionRequest = false;
        updateIssue = undefined;
        updateFile = undefined;
        break;
      }

      contents.push({ role: 'user', parts: [{ text: 'Proceed to next step' }] });
    } catch (error) {
      console.log(chalk.red('❌ Error processing response:', error));
      break;
    }
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Process user input
async function processInput(input: string): Promise<void> {
  const inputLower = input.toLowerCase().trim();
  if (inputLower === 'exit' || inputLower === 'quit') {
    console.log(chalk.cyan('========= Goodbye! ========='));
    console.log(chalk.white('👋 Thank you for using the Cursor2.0 Terminal!'));
    console.log(chalk.cyan('============================'));
    rl.close();
    process.exit(0);
    return;
  }
  if (inputLower === 'help') {
    showHelp();
    return;
  }
  await runAgent(input);
}

// Show help message
function showHelp(): void {
  console.log(chalk.cyan('========= Cursor2.0 Terminal Help ========='));
  console.log(chalk.white('📜 Welcome to the Cursor2.0 Terminal Agent!'));
  console.log(chalk.white('Here’s how to use it:\n'));
  console.log(chalk.white('🔹 Create a new project:'));
  console.log(chalk.white('  "Create a to-do list in HTML"'));
  console.log(chalk.white('  "Write a Python script for a calculator"'));
  console.log(chalk.white('🔹 Update an existing project:'));
  console.log(chalk.white('  "css file is not working"'));
  console.log(chalk.white('🔹 Run or execute a project:'));
  console.log(chalk.white('  "run the project"'));
  console.log(chalk.white('  "execute the python script"'));
  console.log(chalk.white('\n🔹 Other commands:'));
  console.log(chalk.white('  help - Show this help message'));
  console.log(chalk.white('  exit/quit - Exit the program'));
  console.log(chalk.white(`\n📂 All projects are stored in the "${ROOT_DIR}" directory.`));
  console.log(chalk.cyan('========================================'));
  console.log();
  rl.prompt();
}

// Main function
async function main(): Promise<void> {
  console.log(chalk.cyan('========= Welcome to Cursor2.0 Terminal ========='));
  console.log(chalk.white('🌟 Create amazing projects with ease!'));
  console.log(chalk.white('📂 All projects will be created/updated in the "chaicode" directory'));
  console.log(chalk.white('💡 Type your request or "help" to see available commands'));
  console.log(chalk.cyan('============================================='));
  console.log();
  ensureRootDir();
  rl.prompt();
  rl.on('line', async (input: string) => {
    if (input.trim()) await processInput(input.trim());
    console.log();
    rl.prompt();
  });
  rl.on('close', () => {
    console.log(chalk.cyan('========= Goodbye! ========='));
    console.log(chalk.white('👋 Thank you for using the Cursor2.0 Terminal!'));
    console.log(chalk.cyan('============================'));
    process.exit(0);
  });
}

main().catch(error => {
  console.log(chalk.red('❌ Unhandled error:', error));
  process.exit(1);
});

