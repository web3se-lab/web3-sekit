const jsonFix = require('json-fixer')

/**
 * Extract json data from markdown
 * @param {string} markdown - input prompt
 */
function extractJSON(markdown) {
    try {
        const regex = /```json\n([\s\S]*?)\n```/g
        const match = regex.exec(markdown)
        return jsonFix((match && match[1]) || markdown).data
    } catch (e) {
        return markdown
    }
}

module.exports = { extractJSON }
