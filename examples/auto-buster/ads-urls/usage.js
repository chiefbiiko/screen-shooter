const adsurls = require('./index')

adsurls([ 'air max 97 gold' ], { onlyHost: true, uniquify: true })
  .then(console.log)
  .catch(console.error)
