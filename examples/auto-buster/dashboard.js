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

const space2lodash = keyword => keyword.trim().replace(/[\s]+/g, '_')

;(async () => {

  var STATUS
  var KEYWORD
  var N_MINED
  var N_PASS
  var N_FAIL
  var N_ERR

  const update = () => {
    diff.write(`
      Enter a keyword as input to ads-urls: ${dash.line()}

      Keyword: ${KEYWORD || 'none'}
      --------
      # mined urls: ${N_MINED || 0}
      # passing homepages: ${N_PASS || 0}
      # failing homepages: ${N_FAIL || 0}
      # errors encountered: ${N_ERR || 0}
      --------

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

    N_PASS = N_FAIL = 0
    STATUS = 'busy'
    KEYWORD = keyword
    update()

    const adsopts = { onlyHosts: true, uniquify: true }
    var urlMap
    try {
      urlMap = await adsUrls([ keyword ], adsopts)
    } catch (err) {
      N_ERR++
      update()
    }

    N_MINED = urlMap[keyword].length
    update()

    shooter.on('pageinfo', async pageinfo => {
      pageinfo.passing ? N_PASS++ : N_FAIL++
      update()
      if (!pageinfo.passing) await stampic(pageinfo.filepath)
    })

    const checkopts = { dir: join('./screenshots', space2lodash(keyword)) }
    var metainfo
    try {
      metainfo = await shooter.check(urlMap[keyword], checkopts, predicate)
      await writeFile(join(dir, 'info.json'), JSON.stringify(metainfo))
    } catch (err) {
      N_ERR++
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
