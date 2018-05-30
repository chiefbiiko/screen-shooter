const tape = require('tape')
const del = require('del')
const ScreenShooter = require('.')

tape('shootin', async t => {
  const shooter = new ScreenShooter()
  const pageinfos = []
  const urls = [ 'https://github.com' ]
  const dir = './testshots'

  async function predicate (page) {
    const content = await page.content()
    return /datenschutz(?:erklärung)?/i.test(content)
  }

  shooter.on('pageinfo', pageinfo => pageinfos.push(pageinfo))

  const metainfo = await shooter.check(urls, dir, predicate)

  t.ok(metainfo.hasOwnProperty('https://github.com'), 'got metainfo')
  t.is(pageinfos.length, 1, 'got one pageinfo')
  t.notOk(pageinfos[0].passing, 'github not passing')
  t.ok(pageinfos[0].filepath, 'got pageinfo.filepath 4 github')

  await del([ './testshots' ])
  t.end()
})
