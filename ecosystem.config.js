module.exports = {
  apps: [
    {
      name: "whatsapp-api",
      script: "dist/index.js",
      instances: 1, // Penting: Jangan gunakan cluster mode (max) karena WhatsApp Web client adalah stateful browser session
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
