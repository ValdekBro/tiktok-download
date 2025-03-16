import * as pw from 'playwright'
import { wait } from '../../helpers'
import { PageManager } from '../../page-manager'
import { XPath } from '../../xpath-builder'
import { BaseScraper } from '../base.scraper'
import { URL } from 'node:url' // Add this import

export class TTVidoeDownloadScraper extends BaseScraper {
    constructor(
        browser: pw.Browser,
        parentPageManager: PageManager,
    ) {
        super(browser, parentPageManager)
    }

    public static isTikTokUrl(url: string): boolean {
        const tiktokUrlPattern = /^(https?:\/\/)?(www\.)?(tiktok\.com\/(@[\w.-]+\/video\/\d+|v\/\d+|t\/[\w.-]+|embed\/v2\/\d+|@[\w.-]+|foryou|discover|music\/[\w.-]+|tag\/[\w.-]+|[\w.-]+)|vm\.tiktok\.com\/[\w.-]+\/?)$/
        return tiktokUrlPattern.test(url)
    }

    public async scrapVideo(url: string) {
        const { page, i: pageIndex } = await this.pageManager
            .open(url)

        const videoLoc = page.locator(
            XPath.anywhere(
                'video', 
                { 
                    equal: { 
                        attr: 'mediatype', 
                        value: "video" 
                    } 
                }
            )
                .build()
        )
        const videosList = await videoLoc.all()
        if(!videosList.length)
            return null

        videosList[0].click({ button: "right" })

        const downloadPromise = page.waitForEvent('download');

        const downloadButtonLoc = page.locator(
            XPath.anywhere(
                'body',
            )
                .child('div', { position: "=1" })
                .child('ul')
                .child('li', { position: "=1" })
                .build()
        )
        const downloadButton = await downloadButtonLoc.first()
        await downloadButton.click()

        const download = await downloadPromise;

        const readStream = await download.createReadStream();
        readStream.on('close', async () => {
            await this.pageManager.close(pageIndex)
        })
        return readStream
    }

    async close() {
        await super.close()
    }
}