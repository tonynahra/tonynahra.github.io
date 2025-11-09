
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 
    'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 
    'were', 'will', 'with', 'part', 'op', 'web', 'at', 'al', 'com', 'org', 'www',
    'https', 'http', 'pdf', 'html', 'sheet', 'cheat', 'for', 'github', 'master',
    'file', 'files', 'user', 'users', 'server', 'servers', 'link', 'more', 'read',
    'view', 'full', 'size', 'click', 'introductory', 'introduction', 'advanced',
    'comprehensive', 'dummies', 'glance', 'handout', 'part 1', 'v1',
    'photo', 'usa', 'new', 'york', 'amazing', 'island'
]);


const REPLACEMENT_MAP = {
    'javascript': 'js',
    'artificial': 'ai',
    'intelligence': 'ai',
    'llms': 'llm',
    'python': 'python',
    'statistics': 'stats',
    'statistical': 'stats',
    'powerbi': 'bi',
    'power': 'bi',
    'analysis': 'data',
    'analytics': 'data'
};

const SYNONYM_MAP = {
    'js': ['javascript'],
    'ai': ['artificial', 'intelligence'],
    'llm': ['llms'],
    'stats': ['statistics', 'statistical'],
    'bi': ['powerbi', 'power'],
    'data': ['analysis', 'analytics']
};
