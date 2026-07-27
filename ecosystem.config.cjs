module.exports = {
    apps: [
        {
            name: "frontend-p3k",
            script: "./build/index.js", // Gunakan ./ agar path lebih pasti
            watch: false,               // Jangan aktifkan watch di produksi
            env: {
                NODE_ENV: "production",
                PORT: 3001,
                // Pastikan IP di bawah ini adalah IP yang Anda ketik di browser
                ORIGIN: "http://33.33.33.5",
                // Sesuaikan dengan endpoint API backend Anda
                PUBLIC_API_URL: "http://33.33.33.5"
            }
        }
    ]
}