module.exports = {
  apps: [
    {
      name: "sims-backend",
      cwd: "/var/www/sims-hospital/backend",
      script: "dist/src/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
