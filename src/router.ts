import express from 'express'

const router = express.Router()

router.get('/health', function (req, res) {
    res.status(200).send("OK")
})
router.get('/ping', function (req, res) {
    res.status(200).send("pong")
})

export default router
