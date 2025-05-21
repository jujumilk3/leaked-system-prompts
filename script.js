document.addEventListener('DOMContentLoaded', () => {
    const fileListElement = document.getElementById('file-list');
    const contentDisplayElement = document.getElementById('content-display');

    if (!fileListElement) {
        console.error('Error: File list element not found.');
        return;
    }
    if (!contentDisplayElement) {
        console.error('Error: Content display element not found.');
        return;
    }
    if (typeof markdownContent === 'undefined' || markdownContent === null) {
        console.error('Error: markdownContent object not found. Was md_content.js loaded?');
        contentDisplayElement.innerHTML = '<p>Error: Could not load Markdown file content.</p>';
        return;
    }

    const ul = document.createElement('ul');

    // Sort filenames: KOR versions next to their originals, then alphabetically
    const sortedFilenames = Object.keys(markdownContent).sort((a, b) => {
        const aIsKor = a.endsWith('_KOR.md');
        const bIsKor = b.endsWith('_KOR.md');
        const aBase = aIsKor ? a.substring(0, a.length - 7) : a.substring(0, a.length - 3);
        const bBase = bIsKor ? b.substring(0, b.length - 7) : b.substring(0, b.length - 3);

        if (aBase.toLowerCase() === bBase.toLowerCase()) {
            return aIsKor ? 1 : -1; // Original before _KOR
        }
        return aBase.toLowerCase().localeCompare(bBase.toLowerCase());
    });

    sortedFilenames.forEach(filename => {
        const li = document.createElement('li');
        li.textContent = filename;
        li.setAttribute('data-filename', filename);
        li.addEventListener('click', () => {
            // Remove active class from other items
            document.querySelectorAll('#file-list li').forEach(item => item.classList.remove('active'));
            // Add active class to current item
            li.classList.add('active');

            const content = markdownContent[filename];
            if (typeof content === 'string') {
                try {
                    contentDisplayElement.innerHTML = marked.parse(content);
                } catch (e) {
                    console.error('Error parsing Markdown:', e);
                    contentDisplayElement.innerHTML = '<p>Error displaying Markdown content.</p>';
                }
            } else {
                contentDisplayElement.innerHTML = `<p>Content for ${filename} not found or is not a string.</p>`;
                console.warn(`Content for ${filename} is not a string:`, content);
            }
        });
        ul.appendChild(li);
    });

    fileListElement.appendChild(ul);

    // Optionally, display the first file by default
    if (sortedFilenames.length > 0) {
        const firstFileItem = fileListElement.querySelector('li');
        if (firstFileItem) {
            firstFileItem.click();
        }
    } else {
        contentDisplayElement.innerHTML = '<p>No Markdown files found to display.</p>';
    }
});
