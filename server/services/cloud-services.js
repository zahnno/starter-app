const aws = require('aws-sdk');

// Initialize AWS S3
const initializeAWS = () => {
  aws.config.update({
    secretAccessKey: process.env.S3_ACCESS_SECRET,
    accessKeyId: process.env.S3_ACCESS_KEY,
    region: "us-east-1",
  });

  return new aws.S3();
};

// Initialize services
initializeGoogleCloud();
const s3 = initializeAWS();

// Export initialized clients
module.exports = {
  s3,
  initializeAWS,
}; 