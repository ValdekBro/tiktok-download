import type { ITikTokSliderResult } from "./tiktok-slider-result.interface"
import type { ITikTokVideoResult } from "./tiktok-video-result.interface"
import type * as pw from 'playwright'

export type TTTDownloadResult = ITikTokSliderResult | ITikTokVideoResult

export interface ITTDownloadStrategy {
    scrap(page: pw.Page): Promise<TTTDownloadResult>
}