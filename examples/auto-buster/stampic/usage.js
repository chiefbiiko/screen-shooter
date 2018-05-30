const load = require('./index');

(async () => {
  const stampic = await load()
  const picpath = await stampic('./pupp.png')
  console.log('pic got stamped', picpath)
})()
