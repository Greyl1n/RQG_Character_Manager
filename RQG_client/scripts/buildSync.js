import fs from 'fs';

const distPath = 'dist/index.html';
const localAppPath = 'runequest_app.html';
const rootAppPath = '../runequest_app.html';
const rootIndexPath = '../index.html';

if (fs.existsSync(distPath)) {
  let content = fs.readFileSync(distPath, 'utf8');

  // Clean up any redirect script from the built bundle first
  content = content.replace(/<script[^>]*>[\s\S]*?window\.location\.replace[\s\S]*?<\/script>\s*/gi, '');

  // Find the first <script> tag (the React bundle)
  const scriptStart = content.indexOf('<script');
  const scriptEnd = content.indexOf('</script>', scriptStart);

  if (scriptStart !== -1 && scriptEnd !== -1) {
    const fullEnd = scriptEnd + '</script>'.length;
    const fullScript = content.slice(scriptStart, fullEnd);

    // Extract inner JS code
    const bodyStart = fullScript.indexOf('>') + 1;
    const bodyEnd = fullScript.lastIndexOf('</script>');
    const scriptBody = fullScript.slice(bodyStart, bodyEnd);

    // Remove the script from <head> using slice
    content = content.slice(0, scriptStart) + content.slice(fullEnd);

    // Create non-module script tag
    const newScript = `<script>\n${scriptBody}\n</script>`;

    // Insert right before </body> so <div id="root"> exists before script runs
    const bodyCloseIdx = content.lastIndexOf('</body>');
    if (bodyCloseIdx !== -1) {
      content = content.slice(0, bodyCloseIdx) + newScript + '\n' + content.slice(bodyCloseIdx);
    } else {
      content += '\n' + newScript;
    }

    fs.writeFileSync(distPath, content, 'utf8');
    fs.writeFileSync(localAppPath, content, 'utf8');
    fs.writeFileSync(rootAppPath, content, 'utf8');
    fs.writeFileSync(rootIndexPath, content, 'utf8');
    console.log('✓ Successfully built and synced to dist/index.html, runequest_app.html, ../runequest_app.html, and ../index.html');
  }
}
