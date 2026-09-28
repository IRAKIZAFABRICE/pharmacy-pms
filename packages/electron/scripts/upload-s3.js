// scripts/upload-s3.js
// Uploads build artifacts to S3 for production updates
const fs = require('fs');
const path = require('path');

const RELEASE_DIR = path.join(__dirname, '..', 'release');
const BUCKET = 'pharmacy-pms-updates';
const REGION = 'us-east-1';
const S3_PATH = 'win/';

console.log('========================================');
console.log('  Uploading Updates to S3');
console.log('========================================\n');

// Check if release directory exists
if (!fs.existsSync(RELEASE_DIR)) {
  console.error('❌ Release directory not found. Run "npm run dist" or "npm run pack" first.');
  process.exit(1);
}

// Check if AWS SDK is available
let S3Client, PutObjectCommand;
try {
  ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
} catch (e) {
  console.error('❌ @aws-sdk/client-s3 is not installed.');
  console.error('   Install it with: npm install --save-dev @aws-sdk/client-s3');
  process.exit(1);
}

// Configure AWS
const s3 = new S3Client({ region: REGION });

async function uploadToS3() {
  // Get all files in release directory
  const files = fs.readdirSync(RELEASE_DIR);
  
  // Files to upload
  const uploadFiles = [
    'latest.yml',
    'latest.yml.blockmap',
  ];

  // Add installer file
  const installerFile = files.find(f => f.endsWith('.exe') && f.includes('Setup'));
  if (installerFile) {
    uploadFiles.push(installerFile);
  }

  // Also upload any .exe files
  const exeFiles = files.filter(f => f.endsWith('.exe'));
  for (const file of exeFiles) {
    if (!uploadFiles.includes(file)) {
      uploadFiles.push(file);
    }
  }

  // Upload each file
  let uploaded = 0;
  for (const file of uploadFiles) {
    const filePath = path.join(RELEASE_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }

    const fileContent = fs.readFileSync(filePath);
    const key = `${S3_PATH}${file}`;

    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fileContent,
        ACL: 'public-read',
        ContentType: file.endsWith('.yml') ? 'text/yaml' : 
                    file.endsWith('.exe') ? 'application/octet-stream' : 
                    'application/octet-stream',
      }));

      uploaded++;
      const size = (fileContent.length / 1024 / 1024).toFixed(2);
      console.log(`✅ Uploaded: ${file} (${size} MB) → s3://${BUCKET}/${key}`);
    } catch (err) {
      console.error(`❌ Failed to upload ${file}:`, err.message);
    }
  }

  console.log(`\n✅ Upload complete! ${uploaded} files uploaded.`);
  console.log(`📁 S3 URL: https://${BUCKET}.s3.${REGION}.amazonaws.com/${S3_PATH}`);
  console.log('');
}

// Run the upload
uploadToS3().catch(err => {
  console.error('❌ Upload failed:', err);
  process.exit(1);
});