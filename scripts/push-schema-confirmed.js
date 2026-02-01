#!/usr/bin/env node
/**
 * Auto-confirm Drizzle Schema Push
 * This script runs drizzle-kit push with automatic confirmation
 */

const { spawn } = require('child_process');

console.log('🔄 Running Drizzle schema push with auto-confirmation...\n');

const drizzle = spawn('npx', ['drizzle-kit', 'push:sqlite'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'inherit', 'inherit']
});

// Wait a bit for the prompt to appear, then send confirmation
setTimeout(() => {
    console.log('\n✅ Sending confirmation...\n');
    // Send down arrow to select "Yes" option, then Enter
    drizzle.stdin.write('\x1B[B\r'); // Down arrow + Enter
}, 3000);

drizzle.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ Schema push completed successfully!');
        process.exit(0);
    } else {
        console.error(`\n❌ Schema push failed with code ${code}`);
        process.exit(code);
    }
});

drizzle.on('error', (err) => {
    console.error('❌ Failed to start drizzle-kit:', err);
    process.exit(1);
});
