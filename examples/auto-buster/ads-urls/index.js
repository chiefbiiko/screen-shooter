const { launch } = require('puppeteer')
const { parse } = require('url')
const dealias = require('aka-opts')
const debug = require('debug')('ads-urls')

const AKA_CONF = {
  onlyHosts: [ 'onlyHost', 'host', 'hosts' ],
  uniquify: [ 'uniq', 'unique' ],
  swallowErrors: [ 'swallow' ]
}
// const NAV_CONF = { waitUntil: 'networkidle0', timeout: 1000 }

async function adsurls (keywords, opts) {
  opts = dealias(opts || {}, AKA_CONF)
  opts = Object.assign({
    onlyHosts: false,
    uniquify: false,
    swallowErrors: false
  }, opts)

  const browser = await launch()
  const urlMap = {}

  // async iteratee
  async function scan (browser, keyword) {
    const page = await browser.newPage()

    // go to google and enter the keyword ...
    await page.goto('https://google.com/'/*, NAV_CONF*/)
    debug('url after 1st nav::', await page.url())
    await page.type('#lst-ib', keyword)

    // wait for renavigation ...
    const renav = page.waitForNavigation(/*NAV_CONF*/)
    await page.keyboard.press('Enter')
    await renav
    debug('url after 2nd nav::', await page.url())

    // mine links with classes "plantl pla-hc-c" ...
    const hrefs = await page.$$eval('a.plantl.pla-hc-c', as => {
      return as.map(a => a.href)
    })

    debug('opts.onlyHosts::', opts.onlyHosts)

    const mapds = hrefs.map(href => {
      if (opts.onlyHosts) {
        const parts = parse(href)
        debug('parts::', parts)
        const short = parts.protocol + '//' + parts.host
        debug('short::', short)
        return short
      } else {
        return href
      }
    })
    const links = opts.uniquify ? [ ...new Set(mapds) ] : mapds

    debug('mined links::', links)
    urlMap[keyword] = links

    await page.close()
    return links
  }

  await Promise.all(
    keywords.map(scan.bind(null, browser))
      .map(p => p.catch(opts.swallowErrors ? err => {} : err => err))
  )
  await browser.close()

  debug('urlMap::', urlMap)
  return urlMap
}

module.exports = adsurls
