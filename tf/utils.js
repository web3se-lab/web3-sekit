require('dotenv').config()
const TYPE = require('./type')
const tf = require(process.env.TFJS)
const ROOT = require('app-root-path')
const { random } = require('lodash')
const { SentencePieceProcessor, cleanText } = require('sentencepiece-js')
const FormData = require('form-data')
const fetch = require('cross-fetch')

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
    async tokenize(text, maskPercent = 0.15) {
        text = cleanText(text)
        const spp = new SentencePieceProcessor()
        await spp.load(`${ROOT}/tensorflow/models/sentence-piece/sentencepiece.model`)
        const ids = spp.encodeIds(text)
        const tokens = spp.encodePieces(text)
        const length = ids.length
        const maskNum = parseInt(length * maskPercent) // 15% need to mask
        let maskPos = []
        // randomly find 15% tokens
        while (maskPos.length < maskNum) {
            const r = random(0, length - 1)
            if (!maskPos.includes(r)) maskPos.push(r)
        }
        maskPos = maskPos.sort((a, b) => a - b) // sort mask position indexes
        const maskIds = [...ids]
        // replace some tokens
        for (const p of maskPos) {
            // mask and replace
            const num = random(1, 10)
            let replace
            if (num <= 8) replace = MASK // mask 80% possibility
            else if (num === 10) replace = random(6, VOC - 1) // 10% random replaced
            else replace = ids[p] // 10% possibility do nothing
            maskIds[p] = replace
        }
        const decode = spp.decodeIds(ids)

        return { tokens, ids, maskNum, maskPos, maskIds, text, decode, length: text.length }
    },
    // get embeddings from python API
    // method = method = 'embedding' | 'embeddingAvg' | 'embeddingMax'
    async embedAPI(text, method) {
        const url = `${process.env.EMBED_API}/${method}`
        const form = new FormData()
        form.append('text', text)
        const res = await fetch(url, { method: 'post', body: form }).then(res => res.json())
        return res.embedding
    },
    async tokenizeAPI(text) {
        const url = `${process.env.EMBED_API}/tokenize`
        const form = new FormData()
        form.append('text', text)
        return await fetch(url, { method: 'post', body: form }).then(res => res.json())
    },
    removeBr(text) {
        /*
        text = text.replace(/<\/?.+?>/gm, "");
        text = text.replace(/[\r\n]/gm, "");
        */
        text = text.replace(/\s\s+/g, ' ')
        return text
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
