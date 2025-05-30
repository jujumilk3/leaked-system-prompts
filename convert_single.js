const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const sourcePath = process.argv[2];
const targetPath = process.argv[3];
const title = process.argv[4];

if (!sourcePath || !targetPath || !title) {
    console.error('Usage: node convert_single.js <sourcePath> <targetPath> <title>');
    process.exit(1);
}

fs.readFile(sourcePath, 'utf8', (err, mdContent) => {
    if (err) {
        console.error(`Error reading Markdown file ${sourcePath}: ${err.message}`);
        // Output a specific marker to indicate read failure for this script
        console.log(`MarkedJS_ReadFile_Failed: ${path.basename(targetPath)}`);
        process.exit(1); // Still exit with error for the script itself
    }
    try {
        const htmlContent = marked.parse(mdContent);
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
</head>
<body>
${htmlContent}
</body>
</html>`;
        fs.writeFile(targetPath, fullHtml, 'utf8', (writeErr) => {
            if (writeErr) {
                console.error(`Error writing HTML file ${targetPath}: ${writeErr.message}`);
                // Output a specific marker to indicate write failure for this script
                console.log(`MarkedJS_WriteFile_Failed: ${path.basename(targetPath)}`);
                process.exit(1); // Still exit with error
            }
            console.log(`MarkedJS_OK: ${path.basename(targetPath)}`);
        });
    } catch (parseErr) {
        console.error(`Error parsing Markdown with marked for ${sourcePath}: ${parseErr.message}`);
        // Output a specific marker to indicate parse failure for this script
        console.log(`MarkedJS_Parse_Failed: ${path.basename(targetPath)}`);
        process.exit(1); // Still exit with error
    }
});
