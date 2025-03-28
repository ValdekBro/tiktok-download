import { appInit } from '../app'
import 'dotenv/config'

const PORT = process.env.PORT

appInit()
  .then(app => {
    app.listen(PORT, () => {
      console.log(`Express server listening on port ${PORT}`)
    })
  })
  .catch(e => {
    throw e
  })
