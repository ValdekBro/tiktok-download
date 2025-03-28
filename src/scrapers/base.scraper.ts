import * as pw from 'playwright'
import { PageManager } from '../page-manager'
import * as fs from 'fs/promises'
import * as path from 'path'

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

    protected async savePageSnapshot(page: pw.Page, name: string): Promise<void> {
        const snapshotsDir = path.join(process.cwd(), 'snapshots');
        try {
            await fs.access(snapshotsDir);
        } catch {
            await fs.mkdir(snapshotsDir, { recursive: true });
        }

        // Generate timestamp and create snapshot folder
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const snapshotFolder = path.join(snapshotsDir, `${name}_${timestamp}`);
        await fs.mkdir(snapshotFolder, { recursive: true });

        // Save HTML content
        const htmlContent = await page.content();
        await fs.writeFile(path.join(snapshotFolder, 'page.html'), htmlContent, 'utf-8');

        // Save screenshot
        await page.screenshot({
            path: path.join(snapshotFolder, 'screenshot.png'),
            fullPage: true
        });

        console.log(`Page snapshot saved to: ${snapshotFolder}`);
    }
}