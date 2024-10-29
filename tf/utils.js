require('dotenv').config()
const axios = require('axios')
const tf = require(process.env.TFJS)

const TYPE = {
    fee: 0,
    disableTrading: 1,
    blacklist: 2,
    reflect: 3,
    maxTX: 4,
    mint: 5,
    honeypot: 6,
    reward: 7,
    rebase: 8,
    maxSell: 9
}

module.exports = {
    // get embeddings from python API
    // pool = 'avg' | 'cls' | 'max'
    async embedAPI(text, pool = 'avg') {
        const url = `${process.env.EMBED_API}/embedding`
        // remove blank
        for (const i in text) text[i] = text[i].replace(/\s\s+/g, ' ')

        const response = await axios.post(url, { text, pool })
        return response.data.embedding
    },
    async tokenizeAPI(text) {
        const url = `${process.env.EMBED_API}/tokenize`
        // remove blank
        for (const i in text) text[i] = text[i].replace(/\s\s+/g, ' ')

        const response = await axios.post(url, { text })
        return response.data
    },
    removeBr(text) {
        /*
        text = text.replace(/<\/?.+?>/gm, "");
        text = text.replace(/[\r\n]/gm, "");
        */
        return text.replace(/\s\s+/g, ' ')
    },
    TYPE, // 10 type dict
    tf
}
