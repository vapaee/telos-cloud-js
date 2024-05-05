const fs = require('fs');
const path = require('path');

// Define las rutas de origen y destino
const srcDir = path.join(__dirname, '..', 'src', 'scss');
const destDir1 = path.join(__dirname, '..', 'lib', 'scss');
const destDir2 = path.join(__dirname, '..', 'styles');

// Copia los archivos de estilos desde src a lib
fs.readdir(srcDir, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  files.forEach(file => {
    // make sure the parent directory exists
    fs.mkdirSync(destDir1, { recursive: true });
    fs.mkdirSync(destDir2, { recursive: true });
    fs.copyFile(path.join(srcDir, file), path.join(destDir1, file), err => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`${file} copied to lib`);
    });
    fs.copyFile(path.join(srcDir, file), path.join(destDir2, file), err => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`${file} copied to styles`);
    });
  });
});

