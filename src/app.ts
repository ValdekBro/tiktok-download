import express from 'express'
import { Request, Response, NextFunction } from 'express'
import * as bodyParser from 'body-parser'
import router from './router'
import * as pw from 'playwright'
import { bot } from './telegram'
import { message } from "telegraf/filters";
import { PageManager } from './page-manager'
import { TTVidoeDownloadScraper } from './scrapers/tiktok/tiktok-video.download.scraper'

export let browser: pw.Browser = null
let ttScraper: TTVidoeDownloadScraper = null

export const appInit = async () => {
    const app = express()

    // Custom error handler
    function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
        console.error(err.stack)
        res.status(500).json({ error: err.message })
    }

    // Default route
    function defaultRoute(req: Request, res: Response, next: NextFunction) {
        res.sendStatus(404)
    }

    const launchOptions = {
        headless: false,
    };
    
    console.log("Launching browser...")
    browser = await pw.firefox.launch(launchOptions);

    const pm = new PageManager(
        browser,
        5
    )

    ttScraper = new TTVidoeDownloadScraper(browser, pm)
    await ttScraper.init()

    console.log("Launching Telegram bot...")
    bot.start((ctx) => ctx.reply(`
Помічниииик! 
Відправ мені посилання на ТікТок, а я тобі відправлю відео! 
Відправ мені фото і я перекладу тобі текст на ньому!`
    ))

    const handleTikTokLink = async (link: string) => {
        console.log("Creating page...")
        const data = await ttScraper.scrapVideo(link)
        return data
    }

    bot.on(message('text'), async (ctx) => {
        if(TTVidoeDownloadScraper.isTikTokUrl(ctx.message.text)) {
            ctx.reply("Бачу ТікТок посилання, чекай...")
            const data = await handleTikTokLink(ctx.message.text)
            if(data) {
                await ctx.replyWithVideo({
                    source: data
                })
            } else {
                await ctx.reply("Sorry, couldn't find video")
            }
        } else {
            await ctx.reply("Sorry, this is not a TikTok link");
        }
    })
    bot.launch()

    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use('/', router)
    app.use(defaultRoute) // default route has to be last route
    app.use(errorHandler) // Error handler goes last
    return app
}

// Enable graceful stop
process.once('SIGINT', async () => {
    bot.stop('SIGINT')
    console.log("Closing...")
    await ttScraper.close()
    await browser.close()
})
process.once('SIGTERM', async () => {
    bot.stop('SIGTERM')
    console.log("Closing...")
    await ttScraper.close()
    await browser.close()
})