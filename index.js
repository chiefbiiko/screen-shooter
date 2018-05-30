const { each } = require('async')
const { EventEmitter } = require('events')
const { existsSync, mkdirSync } = require('fs')
const { join, resolve } = require('path')
const { launch } = require('puppeteer')
const { parse } = require('url')
const { inherits } = require('util')
const debug = require('debug')('screen-shooter')

function ScreenShooter (opts = {}) {
  if (!(this instanceof ScreenShooter)) return new ScreenShooter(opts)
  EventEmitter.call(this, opts)
}

inherits(ScreenShooter, EventEmitter)

ScreenShooter.url2filepath = (dir, url) => join(dir, `${parse(url).host}.png`)

ScreenShooter.prototype.check = async function check (urls, dir, predicate) {
  if (typeof dir === 'function') {
    predicate = dir
    dir = './screenshots'
  }

  dir = resolve(dir)
  if (!existsSync(dir)) mkdirSync(dir)

  const self = this
  const browser = await launch()
  const metainfo = {}

  async function checkURL (browser, predicate, url) {
    const page = await browser.newPage()

    await page.goto(url, { waitUntil: 'networkidle0' })

    const passing = await predicate(page)
    debug(url, 'passing::', passing)
    const pageinfo = { passing: passing, url: url }
    metainfo[url] = passing

    if (!passing) {
      const filepath = ScreenShooter.url2filepath(dir, url)
      debug('filepath::', filepath)
      pageinfo.filepath = filepath
      await page.screenshot({ path: filepath, fullPage: true })
    }

    debug(url, 'pageinfo::', pageinfo)
    self.emit('pageinfo', pageinfo)

    await page.close()
    return passing
  }

  return new Promise((resolve, reject) => {
    each(urls, checkURL.bind(null, browser, predicate), async err => {
      debug('async.each cb err::', err)
      await browser.close()
      debug('metainfo::', metainfo)
      self.emit('metainfo::', metainfo)
      err ? reject(err) : resolve()
    })
  })
}

module.exports = ScreenShooter
