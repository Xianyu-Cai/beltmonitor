const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from ../server.confi.env
const envPath = path.resolve(__dirname, '../server.confi.env');
dotenv.config({ path: envPath });

async function initializeCameras() {
    console.log('Starting camera initialization process...');

    // Create database connection
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '123456',
            database: 'beltmonitortem'
        });

        console.log('Connected to database successfully');

        // Get all cameras from the database
        const [cameras] = await connection.execute('SELECT * FROM camera');
        console.log(`Found ${cameras.length} cameras in database`);

        // Process each camera
        for (const camera of cameras) {
            try {
                console.log(`Processing camera ID: ${camera.id}`);

                // Spawn process to run the Python script with appropriate parameters
                const pythonProcess = exec('python', [
                    path.resolve(__dirname, '../../ai-end/detect-cap-1.py'),
                    '--hls_filename', `${camera.cameraID}.m3u8`,
                    '--source', camera.rtsp
                ]);

                // Update camera online status to true if process exits successfully
                console.log(`Camera ${camera.cameraID} script completed successfully`);
                await connection.execute(
                    'UPDATE camera SET online = ? WHERE id = ?',
                    [1, camera.id]
                );
                console.log(`Camera ${camera.cameraID} marked as online in database`);
            } catch (error) {
                console.error(`Error processing camera ${camera.cameraID}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in camera initialization:', error);
    }
}

// Execute initialization
initializeCameras()
    .then(() => console.log('Camera initialization process started'))