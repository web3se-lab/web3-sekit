module.exports = {
    apps: [
        {
            name: 'Web3 Crack',
            script: 'web/app.js', // 你的应用入口文件
            // 其他配置...
            ignore_watch: ['static/contract', 'static/solc']
        }
    ]
    // PM2 全局配置...
}
