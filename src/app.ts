import express from 'express'
import { Request, Response, NextFunction } from 'express'
import * as bodyParser from 'body-parser'
import router from './server/router'
import * as pw from 'playwright'
import { bot } from './server/telegram'
import { message } from "telegraf/filters";
import { PageManager } from './page-manager'
import { TikTokScraper } from './scrapers/tiktok/tiktok.scraper'
import { toBatches } from './helpers'

export let browser: pw.Browser = null
let ttScraper: TikTokScraper = null

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

    const launchOptions: pw.LaunchOptions = {
        headless: process.env.NODE_ENV === 'production',
    };
    
    console.log("Launching browser...")
    browser = await pw.firefox.launch(launchOptions);

    const pm = new PageManager(
        browser,
        5
    )

    ttScraper = new TikTokScraper(browser, pm)
    await ttScraper.init()

    console.log("Launching Telegram bot...")
    bot.start((ctx) => ctx.reply("Помічниииик!\n"
        + "Відправ мені посилання на ТікТок, а я тобі відправлю відео!\n"
        // + "Відправ мені фото і я перекладу тобі текст на ньому!"
    ))

    bot.on(message('text'), async (ctx) => {
        if(TikTokScraper.isTikTokUrl(ctx.message.text)) {
            const result = await ttScraper.scrap(ctx.message.text)

            switch(result.type) {
                case 'video':
                    await ctx.replyWithVideo({
                        source: result.videoStream
                    })
                    break
                case 'slider':
                    const groups = toBatches(result.slidesUrls, 10)
                    for (const group of groups) {
                        await ctx.replyWithMediaGroup(
                            group.map(url => ({
                                type: "photo",
                                media: url,
                            }))
                        )
                    }
                    await ctx.replyWithAudio(result.soundUrl)
                    break
                default:
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
    await browser.close()
})
process.once('SIGTERM', async () => {
    bot.stop('SIGTERM')
    console.log("Closing...")
    await browser.close()
})


