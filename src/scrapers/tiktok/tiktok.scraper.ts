import * as pw from 'playwright'
import { PageManager } from '../../page-manager'
import { XPath } from '../../xpath-builder'
import { BaseScraper } from '../base.scraper'
import { isLocatorFound } from '../../helpers'
import { ITTDownloadStrategy } from './types/tiktok.download.strategy.interface'
import { TTAlbumDownloadStrategy } from './tiktok-album.download.strategy'
import { TTVidoeDownloadStrategy } from './tiktok-video.download.strategy'

export class TikTokScraper extends BaseScraper {
    constructor(
        browser: pw.Browser,
        parentPageManager: PageManager,
    ) {
        super(browser, parentPageManager)
    }

    public static isTikTokUrl(url: string): boolean {
        const tiktokUrlPattern = /^(https?:\/\/)?(([\w-]+\.)*tiktok\.com\/(@[\w.-]+\/(video|photo)\/\d+|v\/\d+|t\/[\w.-]+|embed\/v2\/\d+|@[\w.-]+|foryou|discover|music\/[\w.-]+|tag\/[\w.-]+|[\w.-]+))(\/)?(\?.*)?$/
        return tiktokUrlPattern.test(url)
    }

    public async closeCaptcha(page: pw.Page) {
        const captchaCloseButtonLoc = page.locator(
            XPath.anywhere(
                'button',
                {
                    id: "captcha_close_button"
                }
            )
            .build()
        )
        if(await isLocatorFound(captchaCloseButtonLoc)) {
            const captchaCloseButton = await captchaCloseButtonLoc.first();
            await captchaCloseButton.click();
            console.log("Captcha close button IS found");
        }
    }

    public async closeSignInModal(page: pw.Page) {
        const signInExitButtonLoc = page.locator(
            XPath.anywhere(
                'div',
                {
                    equal: {
                        attr: 'data-e2e',
                        value: "modal-close-inner-button"
                    },
                }
            )
            .build()
        )
        if(await isLocatorFound(signInExitButtonLoc)) {
            const signInExitButton = await signInExitButtonLoc.first();
            await signInExitButton.click();
            console.log("Sign in exit button IS found");
        }
    }

    public async isAlbum(page: pw.Page) {
        const swiperLoc = page.locator(
            XPath.anywhere(
                'div',
                {
                    equal: {
                        attr: 'class',
                        value: "swiper-wrapper"
                    }
                }
            )
                .build()
        ).first()

        return isLocatorFound(swiperLoc)
    }

    public async isVideo(page: pw.Page) {
        const videoLoc = page.locator(
            XPath.anywhere(
                'video', 
                { 
                    position: "=1",
                    equal: { 
                        attr: 'mediatype', 
                        value: "video" 
                    } 
                }
            )
                .build()
        ).first()

        return isLocatorFound(videoLoc)
    }  

    public async scrap(url: string) {
        const { page, i: pageIndex } = await this.pageManager
            .open(url)

        await Promise.all([
            this.closeCaptcha(page),
            this.closeSignInModal(page)
        ])
        
        let strategy: ITTDownloadStrategy

        const [
            isAlbum,
            isVideo
        ] = await Promise.all([
            this.isAlbum(page),
            this.isVideo(page)
        ])

        if(isAlbum)
            strategy = new TTAlbumDownloadStrategy()
        else if(isVideo)
            strategy = new TTVidoeDownloadStrategy()

        const result = await strategy.scrap(page)

        if(result.type === 'video')
            result.videoStream.on('close', async () => {
                await this.pageManager.close(pageIndex)
            })

        return result
    }
}