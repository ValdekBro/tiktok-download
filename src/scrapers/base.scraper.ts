import * as pw from 'playwright'
import { PageManager } from '../page-manager'

export abstract class BaseScraper {
    protected pageManager: PageManager
    
    constructor(
        private readonly browser: pw.Browser,
        externalPageManager?: PageManager,
    ) {
        this.pageManager = externalPageManager || new PageManager(
            this.browser,
            10
        )
    }

    public async init() {
        await this.pageManager.init()
    }

    public async close() {
        await this.pageManager.destroy()
    }
}