module.exports = {
    devServer: {
        port: 8081
    },
    outputDir: 'build',
    publicPath: process.env.NODE_ENV === 'production'
        ? '/telos-cloud-js/'
        : '/'
}