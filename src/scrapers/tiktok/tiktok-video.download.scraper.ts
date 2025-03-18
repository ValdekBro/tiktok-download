import * as pw from 'playwright'
import { PageManager } from '../../page-manager'
import { XPath } from '../../xpath-builder'
import { BaseScraper } from '../base.scraper'
import { ITikTokSliderResult } from '../../types/tiktok-slider-result.interface'
import { ITikTokVideoResult } from '../../types/tiktok-video-result.interface'



export class TTVidoeDownloadScraper extends BaseScraper {
    constructor(
        browser: pw.Browser,
        parentPageManager: PageManager,
    ) {
        super(browser, parentPageManager)
    }

    public static isTikTokUrl(url: string): boolean {
        const tiktokUrlPattern = /^(https?:\/\/)?(www\.)?(tiktok\.com\/(@[\w.-]+\/video\/\d+|v\/\d+|t\/[\w.-]+|embed\/v2\/\d+|@[\w.-]+|foryou|discover|music\/[\w.-]+|tag\/[\w.-]+|[\w.-]+)|([\w-]+\.)*tiktok\.com\/[\w.-]+\/?)$/
        return tiktokUrlPattern.test(url)
    }

    private async closeCaptcha(page: pw.Page) {
        const captchaCloseButtonLoc = page.locator(
            XPath.anywhere(
                'button',
                {
                    id: "captcha_close_button"
                }
            )
            .build()
        )
        try {
            await captchaCloseButtonLoc.waitFor({ state: "attached", timeout: 2000 });
            const captchaCloseButton = await captchaCloseButtonLoc.first();
            await captchaCloseButton.click();
            console.log("Captcha close button IS found");
        } catch(e) {
            // console.log("Captcha close button not found");
        }
    }

    private async closeSignInModal(page: pw.Page) {
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
        try {
            await signInExitButtonLoc.waitFor({ state: "attached", timeout: 2000 });
            const signInExitButton = await signInExitButtonLoc.first();
            await signInExitButton.click();
            console.log("Sign in exit button IS found");
        } catch(e) {
            // console.log("Sign in exit button not found");
        }
    }

    private async scrapFromSwiper(page: pw.Page) {
        const swiperSlideLoc = page.locator(
            XPath.anywhere(
                'div',
                {
                    not: {
                        class: "swiper-slide-duplicate"
                    }
                }
            )
                .child("img")
                .build()
        )
        
        const slides = await swiperSlideLoc.all();

        const swiperAudioLoc = page.locator(
            XPath.anywhere('audio').build()
        )
        const audio = await swiperAudioLoc.first();
        const soundUrl = await audio.getAttribute("src")

        return {
            slidesUrls: await Promise.all(
                slides.map(async slide => await slide.getAttribute("src"))
            ),
            soundUrl
        }
    }

    private async scrapFromSource(page: pw.Page, url: string) {
        await page.goto(url, { waitUntil: "commit" })
        page.locator(XPath.anywhere('video').build())
            .first()
            .evaluate(
                elem => {
                    if(elem instanceof HTMLVideoElement) {
                        elem.muted = true;
                        elem.pause();
                    }
                }
            )
        await page.evaluate(() => {
            var a = document.createElement("a");
            a.setAttribute("href", window.location.href);
            a.setAttribute("download", "video.mp4");
            // a.style.display = "none";
            document.body.appendChild(a);
            a.click();
        })
    }

    private async scrapFromDownloadOption(page: pw.Page, videoLoc: pw.Locator) {
        await videoLoc.click({ button: "right" })

        const optionsLoc = page.locator(
            XPath.anywhere(
                'body',
            )
                .child('div', { position: "=1" })
                .child('ul')
                .build()
        )
        
        const options = await optionsLoc.first()
        await options.waitFor({ state: "attached", timeout: 2000 });

        const downloadButtonLoc = options.getByText("Download video");
        await downloadButtonLoc.waitFor({ state: "attached", timeout: 1000 });
    }

    public async scrapVideo(url: string) {
        const { page, i: pageIndex } = await this.pageManager
            .open(url)
        
        this.closeCaptcha(page)
        this.closeSignInModal(page)

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
        
        try {
            await swiperLoc.waitFor({ state: "attached", timeout: 2000 });
            const result = await this.scrapFromSwiper(page);
            await this.pageManager.close(pageIndex)
            return {
                type: "slider",
                ...result
            } as ITikTokSliderResult
        } catch(e) {
            // console.log("Swiper not found");
        }
        
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

        await videoLoc.waitFor({ state: "attached", timeout: 5000000 });

        const sourceLoc = videoLoc.locator(
            XPath.anywhere(
                'source',
            )
                .build()
        ).first()
        const sourceUrl = await sourceLoc.getAttribute("src")

        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        if(!sourceUrl) console.log("No source url found");
        try {
            if(sourceUrl)
                await this.scrapFromSource(page, sourceUrl);
            else 
                await this.scrapFromDownloadOption(page, videoLoc);
        } catch (e) {
            console.log("Failed to scrap video", e)
            await this.pageManager.close(pageIndex)
            return null
        }

        const download = await downloadPromise;

        const readStream = await download.createReadStream();

        readStream.on('close', async () => {
            await this.pageManager.close(pageIndex)
        })
        
        return {
            type: "video",
            videoStream: readStream
        } as ITikTokVideoResult
    }

    async close() {
        await super.close()
    }
}