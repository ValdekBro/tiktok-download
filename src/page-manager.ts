import * as pw from 'playwright'
import { Stopwatch } from './clock'
import { isNull, wait } from './helpers'

enum EPageManagerRegistryItemStatus {
    FREE,
    RESERVED,
    BUSY,
}

interface PageManagerRegistryItem {
    page: pw.Page | null
    status: EPageManagerRegistryItemStatus
}

export class PageManager {
    public context: pw.BrowserContext

    public readonly PAGE_LOAD_TIMEOUT_MSEC = 5 * 60 * 1000

    private readonly pagesRegistry: {
        [key: number]: PageManagerRegistryItem
    } = {}

    private readonly queue: (() => Promise<void>)[] = []
    private processingQueue = false
    
    constructor(
        private readonly browser: pw.Browser,
        private readonly PAGES_NUMBER: number
    ) {
        for(let i = 0; i < PAGES_NUMBER; i++)
            this.pagesRegistry[i] = { 
                page: null,
                status: EPageManagerRegistryItemStatus.FREE
            }
    }

    public getPage(index: number) {
        return this.pagesRegistry[index].page
    }

    private setPage(index: number, page: pw.Page) {
        this.pagesRegistry[index] = {
            page,
            status: EPageManagerRegistryItemStatus.BUSY
        }
    }
    private reserveIndex(index: number) {
        this.pagesRegistry[index] = {
            page: null,
            status: EPageManagerRegistryItemStatus.RESERVED
        }
    }
    private clearIndex(index: number) {
        this.pagesRegistry[index] = {
            page: null,
            status: EPageManagerRegistryItemStatus.FREE
        }
    }

    private get emptyIndex() {
        for(let i = 0; i < this.PAGES_NUMBER; i++)
            if(this.pagesRegistry[i].status == EPageManagerRegistryItemStatus.FREE) 
                return i
        return null
    }

    public async waitForFreeIndex(timeoutMsec?: number) {
        if(isNull(timeoutMsec)) timeoutMsec = 10 * 60 * 1000 // 10min

        const getIndex = async () => {
            while(isNull(this.emptyIndex)) 
                await wait(500)
            return {
                success: true,
                index: this.emptyIndex
            }
        }
        const timeout = async () => {
            await wait(timeoutMsec)
            return {
                success: false
            }
        }
        const res = await Promise.race([
            getIndex(),
            timeout()
        ])

        if(res.success) 
            return (res as { success: true, index: number }).index
        else 
            throw new Error('Waiting for free page index timeout')
    }

    public async init() {
        this.context = await this.browser.newContext({
            serviceWorkers: "block",
            bypassCSP: true,
        });
    }

    public async destroy() {
        try {
            await this.context.close()
        } catch(e) {
            console.error("Failed to close browser context")
        }
    }

    public async open(url: string) {
        return new Promise<{ i: number, page: pw.Page }>((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await this.processOpen(url)
                    resolve(result)
                } catch (e) {
                    reject(e)
                }
            })
            this.processQueue()
        })
    }

    private async processOpen(url: string) {
        const index = await this.waitForFreeIndex()
        this.reserveIndex(index)
        const stopwatch = new Stopwatch()
        stopwatch.start()

        const timeLogger = setInterval(() => {
            console.log(`Page <${url}> loading for ${Math.round(stopwatch.sec)}sec`)
        }, 10 * 1000)
        let page: pw.Page = null
        try {
            page = await this.context.newPage()
            await page.route('**/*.{png,jpg,jpeg,css,gif,avif}', route => route.abort())
            await page.goto(url, { timeout: this.PAGE_LOAD_TIMEOUT_MSEC, waitUntil: "commit" })

            clearInterval(timeLogger)
            this.setPage(index, page)
            return {
                i: index,
                page,
            }
        } catch (e) {
            if (page) await page.close()
            clearInterval(timeLogger)
            this.clearIndex(index)
            throw e
        }
    }

    private async processQueue() {
        if (this.processingQueue) return
        this.processingQueue = true

        while (this.queue.length > 0) {
            const task = this.queue.shift()
            if (task) await task()
        }

        this.processingQueue = false
    }

    public async close(index: number) {
        const page = await this.getPage(index)
        await page.close()
        this.clearIndex(index)
    }
}