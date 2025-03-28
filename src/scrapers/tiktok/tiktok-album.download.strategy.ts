import * as pw from 'playwright'
import { XPath } from '../../xpath-builder'
import type { ITTDownloadStrategy } from './types/tiktok.download.strategy.interface'
import { ITikTokSliderResult } from './types/tiktok-slider-result.interface';

export class TTAlbumDownloadStrategy implements ITTDownloadStrategy {
    public async scrap(page: pw.Page): Promise<ITikTokSliderResult> {
        const swiperSlideLoc = page.locator(
            XPath.anywhere(
                'div',
                { class: "swiper-wrapper" }
            )
                .child(
                    "div",
                    { not: { class: "swiper-slide swiper-slide-duplicate" } }
                )
                .child("img")
                .build()
        )
        await swiperSlideLoc.waitFor({ state: 'attached', timeout: 5000 });
        
        const slides = await swiperSlideLoc.all();

        const swiperAudioLoc = page.locator(
            XPath.anywhere('audio').build()
        )
        const audio = await swiperAudioLoc.first();
        const soundUrl = await audio.getAttribute("src")

        return {
            type: 'slider',
            slidesUrls: await Promise.all(
                slides.map(async slide => await slide.getAttribute("src"))
            ),
            soundUrl
        }
    }
}