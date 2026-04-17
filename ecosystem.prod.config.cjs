module.exports = {
  apps: [
    {
      name: 'chatty',
      cwd: './backend',
      script: 'node',
      args: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
    },
  ],
};