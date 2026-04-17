module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: 'node',
      args: 'dist/main.js',
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'node',
      args: './node_modules/vite/bin/vite.js --host',
    },
  ],
};