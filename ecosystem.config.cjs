module.exports = {
  apps: [
    {
      name: 'chatty-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start:dev',
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'chatty-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
