module.exports = {
  apps: [
    {
      name: 'chatty-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start:prod',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        JWT_SECRET: process.env.JWT_SECRET || 'chatty-secret-key-change-in-production',
      },
    },
    {
      name: 'chatty-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run preview',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
