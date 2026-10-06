/** PM2 config for CampusCore school demo (CloudPanel Node site) */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'campuscore-school',
      script: 'server.js',
      cwd: path.join(__dirname, 'backend'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5012
      }
    }
  ]
};
