/*
 * Crawler data from scamsniper
 * UI is needed
 * devilyouwei
 * devilyouwei@foxmail.com
 */
const { sleep, getAPI, getBrowser } = require('./utils')
const { check, insert } = require('./getContract')
const cheerio = require('cheerio')
const NETWORK = 'bscMain'

async function getFromIndex() {
    const url = 'https://scamsniper.net/'
    const browser = await getBrowser()
    try {
        const page = await browser.newPage()
        while (true) {
            await page.goto(url)
            await page.waitForSelector('.scan-block')
            const html = await page.content()
            const h = cheerio.load(html)
            const contractH = h('.scans .contract')
            for (const e of contractH) {
                const addr = h(e).text()
                const flag = await check(addr)
                if (flag) continue // skip existed contract
                const source = await getAPI(NETWORK, addr)
                source.ContractAddress = addr
                source.Network = NETWORK
                if (source.SourceCode) await insert(source)
            }
            await sleep(15000)
        }
    } catch (e) {
        console.error(e)
        setTimeout(getFromIndex, 15000)
    } finally {
        await browser.close()
    }
}

if (process.argv[2] == 'index') getFromIndex()
