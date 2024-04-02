
const fs = require('fs');
const path = require('path');

const packageJson = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
const version = JSON.parse(packageJson).version;
const packageName = JSON.parse(packageJson).name;
const versionFilePath = path.join(__dirname, '../src/version.ts');

fs.readFile(versionFilePath, 'utf8', function (err, data) {
    if (err) {
        return console.error(err);
    }
    const versionFileContent = `export const version = '${version}';\n`;

    if (data === versionFileContent) {
        console.log(`Version file is up to date: ${packageName}@${version}`);
        return;
    }

    fs.writeFile(versionFilePath, versionFileContent, 'utf8', function (err) {
        if (err) return console.error(err);
        console.log(`Output release: ${packageName}@${version}`);
    });
});



