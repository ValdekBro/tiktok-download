import { app } from './app'
import 'dotenv/config'

const PORT = process.env.PORT

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`)
})
