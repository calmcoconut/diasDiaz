import * as params from '@params';

const resList = document.getElementById('searchResults');
const sInput = document.getElementById('searchInput');
const searchBox = document.getElementById('searchbox');
const searchStatus = document.getElementById('searchStatus');

let fuse = null;
let currentFocusIndex = -1;

const defaultFuseOptions = {
    distance: 100,
    threshold: 0.35,
    ignoreLocation: true,
    includeMatches: true,
    minMatchCharLength: 2,
    keys: ['title', 'summary', 'content']
};

const buildFuseOptions = () => {
    if (!params || !params.fuseOpts) {
        return defaultFuseOptions;
    }

    return {
        isCaseSensitive: params.fuseOpts.iscasesensitive ?? false,
        includeScore: params.fuseOpts.includescore ?? false,
        includeMatches: true,
        minMatchCharLength: params.fuseOpts.minmatchcharlength ?? 2,
        shouldSort: params.fuseOpts.shouldsort ?? true,
        findAllMatches: params.fuseOpts.findallmatches ?? false,
        keys: params.fuseOpts.keys ?? defaultFuseOptions.keys,
        location: params.fuseOpts.location ?? 0,
        threshold: params.fuseOpts.threshold ?? defaultFuseOptions.threshold,
        distance: params.fuseOpts.distance ?? defaultFuseOptions.distance,
        ignoreLocation: params.fuseOpts.ignorelocation ?? defaultFuseOptions.ignoreLocation
    };
};

const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(...args), delay);
    };
};

const setStatus = (message) => {
    if (searchStatus) {
        searchStatus.textContent = message;
    }
};

const reset = () => {
    if (resList) resList.innerHTML = '';
    if (sInput) {
        sInput.value = '';
        sInput.focus();
    }
    currentFocusIndex = -1;
    setStatus('Type a query above to search posts.');
};

const extractSnippet = (result) => {
    const item = result.item;
    let snippet = '';

    if (result.matches && Array.isArray(result.matches)) {
        const contentMatch = result.matches.find(m => m.key === 'content' || m.key === 'summary');
        if (contentMatch && contentMatch.indices && contentMatch.indices.length > 0) {
            const firstIndex = contentMatch.indices[0];
            const start = Math.max(0, firstIndex[0] - 50);
            const end = Math.min(contentMatch.value.length, firstIndex[1] + 90);
            const rawSnippet = contentMatch.value.substring(start, end).replace(/\s+/g, ' ').trim();
            const prefix = start > 0 ? '… ' : '';
            const suffix = end < contentMatch.value.length ? ' …' : '';
            snippet = prefix + rawSnippet + suffix;
        }
    }

    if (!snippet) {
        if (item.summary) {
            snippet = item.summary.replace(/\s+/g, ' ').trim();
            if (snippet.length > 140) {
                snippet = snippet.substring(0, 140) + ' …';
            }
        } else if (item.content) {
            snippet = item.content.replace(/\s+/g, ' ').trim();
            if (snippet.length > 140) {
                snippet = snippet.substring(0, 140) + ' …';
            }
        }
    }

    return snippet;
};

const renderResults = (results) => {
    if (!resList) return;
    resList.innerHTML = '';
    currentFocusIndex = -1;

    if (!Array.isArray(results) || results.length === 0) {
        setStatus('No matching posts found.');
        return;
    }

    const count = results.length;
    setStatus(`${count} ${count === 1 ? 'post' : 'posts'} found.`);

    const fragment = document.createDocumentFragment();

    results.forEach((result, idx) => {
        const item = result.item;
        const li = document.createElement('li');
        li.className = 'search-result-item';

        const row = document.createElement('div');
        row.className = 'search-result-row';

        const link = document.createElement('a');
        link.className = 'search-result-link';
        link.href = item.permalink;
        link.textContent = item.title;
        link.setAttribute('data-result-index', idx);

        row.appendChild(link);

        if (item.date) {
            const dateEl = document.createElement('time');
            dateEl.className = 'search-result-date';
            dateEl.textContent = item.date;
            row.appendChild(dateEl);
        }

        li.appendChild(row);

        const snippet = extractSnippet(result);
        if (snippet) {
            const p = document.createElement('p');
            p.className = 'search-result-snippet';
            p.textContent = snippet;
            li.appendChild(p);
        }

        fragment.appendChild(li);
    });

    resList.appendChild(fragment);
};

const performSearch = () => {
    if (!fuse || !sInput) return;

    const query = sInput.value.trim();
    if (!query) {
        if (resList) resList.innerHTML = '';
        currentFocusIndex = -1;
        setStatus('Type a query above to search posts.');
        return;
    }

    const searchOptions = params.fuseOpts?.limit ? { limit: params.fuseOpts.limit } : undefined;
    const results = searchOptions ? fuse.search(query, searchOptions) : fuse.search(query);
    renderResults(results);
};

const initSearch = async () => {
    if (!sInput || !resList) return;

    sInput.disabled = false;
    setStatus('Loading search index...');

    try {
        let response;
        try {
            response = await fetch('../index.json');
        } catch (e) {
            response = await fetch('/index.json');
        }

        if (!response.ok) {
            response = await fetch('/index.json');
        }

        if (!response.ok) {
            throw new Error(`Failed to load search index: ${response.status}`);
        }

        const data = await response.json();
        if (data && typeof Fuse !== 'undefined') {
            fuse = new Fuse(data, buildFuseOptions());
            setStatus('Type a query above to search posts.');
        } else {
            setStatus('Search index loaded, awaiting query.');
        }
    } catch (error) {
        console.error('Search init error:', error);
        setStatus('Unable to load search index.');
    }
};

window.addEventListener('load', initSearch);

sInput?.addEventListener('input', debounce(performSearch, 150));

sInput?.addEventListener('search', () => {
    if (!sInput.value) {
        reset();
    }
});

document.addEventListener('keydown', (event) => {
    const { key } = event;
    const active = document.activeElement;
    const links = resList ? Array.from(resList.querySelectorAll('.search-result-link')) : [];

    if (key === 'Escape') {
        if (searchBox?.contains(active)) {
            reset();
            return;
        }
    }

    if (links.length === 0) return;

    if (key === 'ArrowDown') {
        if (active === sInput) {
            event.preventDefault();
            currentFocusIndex = 0;
            links[0].focus();
        } else if (links.includes(active)) {
            event.preventDefault();
            const nextIdx = links.indexOf(active) + 1;
            if (nextIdx < links.length) {
                currentFocusIndex = nextIdx;
                links[nextIdx].focus();
            }
        }
    } else if (key === 'ArrowUp') {
        if (links.includes(active)) {
            event.preventDefault();
            const prevIdx = links.indexOf(active) - 1;
            if (prevIdx >= 0) {
                currentFocusIndex = prevIdx;
                links[prevIdx].focus();
            } else {
                currentFocusIndex = -1;
                sInput.focus();
            }
        }
    } else if (key === 'ArrowRight') {
        if (links.includes(active)) {
            active.click();
        }
    }
});
