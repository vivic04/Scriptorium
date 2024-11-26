// pages/api/execute.js

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TEMP_DIR = path.join(process.cwd(), 'temp');
const TIMEOUT_MS = 5000; // Maximum execution time in milliseconds

// Helper function to create a temporary file for code execution
function createTempFile(language, code) {
    const filename = language === 'Java' ? 'Main.java' : `${uuidv4()}.${getFileExtension(language)}`;
    const filePath = path.join(TEMP_DIR, filename);
    fs.writeFileSync(filePath, code);
    return filePath;
}

// Helper function to create a temporary file for standard input
function createTempInputFile(stdin) {
    const inputFilePath = path.join(TEMP_DIR, `${uuidv4()}.txt`);
    fs.writeFileSync(inputFilePath, stdin);
    return inputFilePath;
}

// Helper function to determine the file extension for each language
function getFileExtension(language) {
    switch (language) {
        case 'C':
            return 'c';
        case 'C++':
            return 'cpp';
        case 'Java':
            return 'java';
        case 'Python':
            return 'py';
        case 'JavaScript':
            return 'js';
            // Add more languages as needed
        default:
            throw new Error('Unsupported language');
    }
}

// Helper function to get the compile and run command
function getCommand(language, filePath, inputFilePath) {
    const inputRedirection = inputFilePath ? `< "${inputFilePath}"` : '';
    switch (language) {
        case 'C':
            return `gcc "${filePath}" -o "${filePath}.out" && "${filePath}.out" ${inputRedirection}`;
        case 'C++':
            return `g++ "${filePath}" -o "${filePath}.out" && "${filePath}.out" ${inputRedirection}`;
        case 'Java':
            return `javac "${filePath}" && java -cp "${TEMP_DIR}" Main ${inputRedirection}`;
        case 'Python':
            return `python3 "${filePath}" ${inputRedirection}`;
        case 'JavaScript':
            return `node "${filePath}" ${inputRedirection}`;
            // Add more languages as needed
        default:
            throw new Error('Unsupported language');
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, language, stdin } = req.body;
    if (!code || !language) {
        return res.status(400).json({ error: 'Code and language are required' });
    }

    try {
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

        // Step 1: Create a temporary file for the code
        const filePath = createTempFile(language, code);

        // Step 2: Create a temporary file for stdin, if provided
        const inputFilePath = stdin ? createTempInputFile(stdin) : null;

        // Step 3: Get the execution command based on the language
        const command = getCommand(language, filePath, inputFilePath);

        // Measure the start time
        const startTime = Date.now();

        // Step 4: Execute the command with a timeout
        exec(command, { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            // Measure the end time and calculate the duration
            const endTime = Date.now();
            const timeTaken = endTime - startTime; // Time taken in milliseconds

            // Clean up the temp files after execution
            fs.unlinkSync(filePath);
            if (inputFilePath && fs.existsSync(inputFilePath)) fs.unlinkSync(inputFilePath);

            // Clean up compiled files if they exist
            if (language === 'C' || language === 'C++') {
                const outputFilePath = `${filePath}.out`;
                if (fs.existsSync(outputFilePath)) {
                    fs.unlinkSync(outputFilePath);
                }
            }

            if (language === 'Java') {
                const classFilePath = path.join(TEMP_DIR, 'Main.class');
                if (fs.existsSync(classFilePath)) {
                    fs.unlinkSync(classFilePath);
                }
            }

            // Prepare the response object
            const response = {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                timeTaken,
                success: !error || (error && !error.killed && error.code !== 'ENOMEM'),
            };

            // Handle specific errors
            if (error) {
                if (error.killed) {
                    response.stderr = 'Error: Execution timed out. Please optimize your code and try again.';
                    response.success = false;
                } else if (error.code === 'ENOMEM' || error.message.includes('ENOMEM')) {
                    response.stderr = 'Error: Execution failed due to memory limits. Please optimize your code and try again.';
                    response.success = false;
                }
                // You can handle other specific errors here if needed
            }

            // Return the response
            res.status(200).json(response);
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
}