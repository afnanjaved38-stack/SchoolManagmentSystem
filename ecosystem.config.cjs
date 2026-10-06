/** PM2 config for CampusCore school demo (CloudPanel Node site) */
module.exports = {
  apps: [
    {
      name: 'campuscore-school',
      script: 'backend/server.js',
      cwd: __dirname,
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
