require('dotenv').config()
const TYPE = require('./type')
const axios = require('axios')
const tf = require(process.env.TFJS)

const UNIT = 32 // LSTM hidden units
const DIST = 0.2 // highlight within distance bound
const MULT = 2 // highlight scale size
const INPUT = 768 // input size of the first NN layer, the lowest dim
const FUNS = 128 // slice functions

const PAD = -1 // [PAD] pad none value
const UNK = 0 // [UNK]
const MASK = 3 // [MASK] mask random items (MLM)
const CLS = 4 // [CLS] class for seq
const SEP = 5 // [SEP] divide seq (NSP)
const VOC = 50000 // total vocab

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
    UNIT: UNIT, // LSTM hidden units
    TYPE: TYPE, // 10 type dict
    DIST: DIST, // highlight within distance bound
    MULT: MULT, // highlight scale size
    INPUT: INPUT, // input size of the first NN layer, the lowest dim
    FUNS: FUNS, // slice functions
    PAD: PAD,
    UNK: UNK,
    CLS: CLS,
    SEP: SEP,
    MASK: MASK,
    VOC: VOC,
    tf: tf
}
