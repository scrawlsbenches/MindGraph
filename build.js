const esbuild = require('esbuild');
const fs = require('fs');

// Ensure dist directory exists
if (!fs.existsSync('dist')) fs.mkdirSync('dist');

async function build() {
  // Bundle & minify JS
  const jsResult = await esbuild.build({
    entryPoints: ['src/js/app.js'],
    bundle: true,
    minify: true,
    format: 'iife',
    outfile: 'dist/mindgraph.min.js',
    metafile: true,
  });

  // Bundle & minify CSS
  const cssResult = await esbuild.build({
    entryPoints: ['src/css/bundle.css'],
    bundle: true,
    minify: true,
    outfile: 'dist/mindgraph.min.css',
    metafile: true,
  });

  // Report sizes
  const jsSize = fs.statSync('dist/mindgraph.min.js').size;
  const cssSize = fs.statSync('dist/mindgraph.min.css').size;
  console.log(`JS:  ${(jsSize / 1024).toFixed(1)} KB (dist/mindgraph.min.js)`);
  console.log(`CSS: ${(cssSize / 1024).toFixed(1)} KB (dist/mindgraph.min.css)`);

  // Show module breakdown
  const jsText = esbuild.analyzeMetafileSync(jsResult.metafile);
  console.log('\nJS module breakdown:');
  console.log(jsText);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
