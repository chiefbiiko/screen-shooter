const { join } = require('path')
const { promisify } = require('util')
const writeFile = promisify(require('fs').writeFile)
const shooter = require('./../../index')()
const style = (start, cursor, end) => '[ ' + start + cursor + end + ' ]'
const dash = require('neat-input')({ style: style })
const diff = require('ansi-diff-stream')()
const adsUrls = require('./ads-urls')
const load = require('./stampic')
const debug = require('debug')('auto-buster')

const loify = keyword => keyword.replace(/[\s]+/g, '_')

;(async () => {

  var STATUS
  var KEYWORD
  var N_MINED
  var N_PASS
  var N_FAIL

  const update = () => { // KEYWORD, N_MINED, N_PASS, N_FAIL, BUSY
    diff.write(`
      Enter a keyword as input to ads-urls: ${dash.line()}

      Keyword: ${KEYWORD || 'none'}
      --------
      Number of mined urls: ${N_MINED || 0}
      Number of passing homepages: ${N_PASS || 0}
      Number of failing homepages: ${N_FAIL || 0}

      Status: ${STATUS || 'idle'}
    `)
  }

  const stampic = await load()

  async function predicate (page) {
    const content = await page.content()
    return /datenschutz(?:erklärung)?/i.test(content)
  }

  async function onenter (line) {
    const keyword = line.trim()
    if (!keyword) return

    N_PASS = 0
    N_FAIL = 0
    STATUS = 'busy'
    KEYWORD = keyword
    update()

    const urlMap = await adsUrls([ keyword ], { 
      onlyHosts: true,
      uniquify: true
    })

    N_MINED = urlMap[keyword].length
    update()

    const dir = loify(keyword)

    shooter.on('pageinfo', async pageinfo => {
      pageinfo.passing ? N_PASS++ : N_FAIL++
      update()
      if (!pageinfo.passing) await stampic(pageinfo.filepath)
    })

    shooter.on('metainfo', async metainfo => {
      await writeFile(join(dir, 'info.json'), JSON.stringify(metainfo))
    })

    try {
      await shooter.check(urlMap[keyword], dir, predicate)
    } catch (err) {
      STATUS = 'errored'
      update()
    }

    STATUS = 'idle'
    update()
  }

  diff.pipe(process.stdout)

  dash.on('update', update)
  dash.on('enter', onenter)

  update()

})()
