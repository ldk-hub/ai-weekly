const fs = require('fs');

function patch(oldHtmlPath, newHtmlPath, isStudy) {
  let oldHtml = fs.readFileSync(oldHtmlPath, 'utf8');
  const newHtml = fs.readFileSync(newHtmlPath, 'utf8');

  const startIndex = oldHtml.indexOf('  <!-- Hero -->');
  const endIndex = oldHtml.indexOf(isStudy ? '  <!-- Reading list & Archive -->' : '  <!-- Feed grouped by day -->');

  if (startIndex !== -1 && endIndex !== -1) {
    const finalHtml = oldHtml.substring(0, startIndex) + newHtml + '\n' + oldHtml.substring(endIndex);
    fs.writeFileSync(oldHtmlPath, finalHtml, 'utf8');
    console.log(`Successfully patched ${oldHtmlPath}`);
  } else {
    console.error(`Could not find boundaries for ${oldHtmlPath}`);
  }
}

patch('site/news.html', '/Users/nhn/.gemini/antigravity-ide/brain/67cd3e58-fe3e-4932-bf9c-c0480a200d8b/scratch/new_header_news.html', false);
patch('site/study.html', '/Users/nhn/.gemini/antigravity-ide/brain/67cd3e58-fe3e-4932-bf9c-c0480a200d8b/scratch/new_header_study.html', true);

