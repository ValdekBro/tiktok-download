import * as pw from 'playwright'
import { XPath } from '../../xpath-builder'
import { ITikTokVideoResult } from './types/tiktok-video-result.interface'
import type { ITTDownloadStrategy } from './types/tiktok.download.strategy.interface'

export class TTVidoeDownloadStrategy implements ITTDownloadStrategy {
    private async scrapFromSource(page: pw.Page, url: string) {
        await page.goto(url, { waitUntil: "commit" })
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

    public async scrap(page: pw.Page) {
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

        const sourceLoc = videoLoc.locator(
            XPath.anywhere(
                'source',
            )
                .build()
        ).first()
        
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        
        const sourceUrl = await sourceLoc.getAttribute("src")

        if(!sourceUrl && process.env.NODE_ENV !== "production") 
            console.log("No source url found");

        if(sourceUrl)
            await this.scrapFromSource(page, sourceUrl);
        else 
            await this.scrapFromDownloadOption(page, videoLoc);

        const download = await downloadPromise;

        const readStream = await download.createReadStream();
        
        return {
            type: "video",
            videoStream: readStream
        } as ITikTokVideoResult
    }
}