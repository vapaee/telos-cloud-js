const fs = require('fs');
const path = require('path');

// Define las rutas de origen y destino
const srcDir = path.join(__dirname, '..', 'src', 'scss');
const destDir = path.join(__dirname, '..', 'dist', 'scss');

// Copia los archivos de estilos desde src a dist
fs.readdir(srcDir, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  files.forEach(file => {
    // make sure the parent directory exists
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFile(path.join(srcDir, file), path.join(destDir, file), err => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`${file} copied to dist`);
    });
  });
});

