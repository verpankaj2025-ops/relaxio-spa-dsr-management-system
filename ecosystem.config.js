module.exports = {
  apps: [
    {
      name: 'cloudspa-dsr-api',
      script: 'dist/server.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/error.log',
      out_file: './logs/app.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
    },
  ],
};
