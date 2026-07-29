const fs = require('fs');
const path = require('path');

console.log('⚙️ Setting up INTERLUDE environment...');

const rootDir = path.resolve(__dirname, '..');
const envExamplePath = path.join(rootDir, '.env.example');
const envPath = path.join(rootDir, '.env');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
  } else {
    console.error('❌ .env.example not found');
  }
} else {
  console.log('ℹ️ .env file already exists');
}

console.log('🚀 Setup completed! Run `npm install` and `npm run dev` to start.');
