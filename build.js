const esbuild = require('esbuild');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

// Shared build options
const jsOptions = {
  entryPoints: ['src/js/app.js'],
  bundle: true,
  minify: !isWatch,
  sourcemap: true,
  format: 'iife',
  outfile: 'dist/mindgraph.min.js',
  metafile: true,
  logLevel: isWatch ? 'info' : 'silent',
};

const cssOptions = {
  entryPoints: ['src/css/bundle.css'],
  bundle: true,
  minify: !isWatch,
  sourcemap: true,
  outfile: 'dist/mindgraph.min.css',
  metafile: true,
  logLevel: isWatch ? 'info' : 'silent',
};

// Ensure dist directory exists
if (!fs.existsSync('dist')) fs.mkdirSync('dist');

function generateHTML() {
  const html = fs.readFileSync('index.html', 'utf8')
    .replace('dist/mindgraph.min.css', 'mindgraph.min.css')
    .replace('dist/mindgraph.min.js', 'mindgraph.min.js');
  fs.writeFileSync('dist/index.html', html);
}

async function build() {
  const jsResult = await esbuild.build(jsOptions);
  await esbuild.build(cssOptions);
  generateHTML();

  // Report sizes
  const jsSize = fs.statSync('dist/mindgraph.min.js').size;
  const cssSize = fs.statSync('dist/mindgraph.min.css').size;
  const htmlSize = fs.statSync('dist/index.html').size;
  console.log(`HTML: ${(htmlSize / 1024).toFixed(1)} KB (dist/index.html)`);
  console.log(`JS:   ${(jsSize / 1024).toFixed(1)} KB (dist/mindgraph.min.js)`);
  console.log(`CSS:  ${(cssSize / 1024).toFixed(1)} KB (dist/mindgraph.min.css)`);

  const jsText = esbuild.analyzeMetafileSync(jsResult.metafile);
  console.log('\nJS module breakdown:');
  console.log(jsText);
}

async function watch() {
  const jsCtx = await esbuild.context(jsOptions);
  const cssCtx = await esbuild.context(cssOptions);
  generateHTML();

  await jsCtx.watch();
  await cssCtx.watch();
  console.log('Watching for changes...');
}

if (isWatch) {
  watch().catch((err) => { console.error(err); process.exit(1); });
} else {
  build().catch((err) => { console.error(err); process.exit(1); });
}
