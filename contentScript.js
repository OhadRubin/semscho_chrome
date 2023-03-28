(async() => {
    const SEARCH_API_URL = "https://api.semanticscholar.org/graph/v1/author/search";
    const AUTHOR_API_URL = "https://api.semanticscholar.org/graph/v1/author";

    const citationCache = new Map();

    async function getCitationCount(authorName) {
        if (citationCache.has(authorName)) {
            return { authorName, citationCount: citationCache.get(authorName) };
        }

        const response = await fetch(`${SEARCH_API_URL}?query=${encodeURIComponent(authorName)}`);
        const data = await response.json();
        const matchedAuthors = data.data && data.data.filter((author) => author.name === authorName);

        if (!matchedAuthors || matchedAuthors.length === 0) return { authorName, citationCount: null };

        const authorDetailsPromises = matchedAuthors.map(({ authorId }) => fetch(`${AUTHOR_API_URL}/${authorId}?fields=citationCount`).then((res) => res.json()));
        const authorDetailsList = await Promise.all(authorDetailsPromises);
        const topAuthor = authorDetailsList.reduce((prev, current) => (prev.citationCount > current.citationCount) ? prev : current);

        citationCache.set(authorName, topAuthor.citationCount);
        return { authorName, citationCount: topAuthor.citationCount };
    }
    async function updateTextNode(node) {
        const text = node.textContent;
        const regex = /(?:\(|\b)([A-Z][a-z]+ [A-Z][a-z]+)(?:\)|,|;)?/g;
        let newText = text;

        let match;
        while ((match = regex.exec(text)) !== null) {
            const name = match[1];
            const { citationCount } = await getCitationCount(name);
            const replacement = citationCount && citationCount !== 0 ? `${name} (${citationCount} citations)` : name;
            newText = newText.replace(name, replacement);
        }

        if (newText !== text) {
            node.textContent = newText;
        }
    }

    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            updateTextNode(node);
        } else {
            for (const child of node.childNodes) {
                processNode(child);
            }
        }
    }

    // Process the page initially
    processNode(document.body);

    // Set up a MutationObserver to monitor DOM changes
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const addedNode of mutation.addedNodes) {
                processNode(addedNode);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();

// const newText = text.replace(/(?:\(|\b)([A-Z][a-z]+ [A-Z][a-z]+)(?:\)|,|;|\p{P})?/gu, async (match, name) => { /*...*/ });
// const newText = text.replace(/(?:\(|\b)([A-Z][a-z]+ [A-Z][a-z]+)(?:\)|,|;|[.*[\]?])?/g, async(match, name) => { /*...*/ });