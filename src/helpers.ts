import * as pw from 'playwright';

export const wait = async (msec: number) => new Promise<true>(res => setTimeout(() => res(true), msec))
export const isNull = <T>(v: T) => v == undefined || v == null
export const isNotNull = <T>(v: T) => !isNull(v)
export const arrFromEnd = <T>(arr: T[], i: number): T => arr[arr.length - 1 - i]
export const toPascalCase = (str: string): string => str.replace(/(\w)(\w*)/g, (_,g1,g2) => g1.toUpperCase() + g2.toLowerCase());
export const toBatches = <T>(arr: T[], batchSize: number): T[][] => {
    const batches: T[][] = []
    for (let i = 0; i < arr.length; i += batchSize) {
        batches.push(arr.slice(i, i + batchSize))
    }
    return batches
}

export class PromiseQueue<T> {
    private readonly ASSIGN_PROMISE_TIMEOUT = 1 * 1000
    private queue: (Promise<T | boolean>)[] = []
  
    public add(promise: Promise<T>) {
        const reservedIndex = this.queue.push(wait(this.ASSIGN_PROMISE_TIMEOUT)) - 1
        this.queue[reservedIndex] = promise.then(this.queue[reservedIndex] = null)
    }

    public waitForAll() {
        return Promise.all(this.queue.filter(isNotNull))
    }
}

export const isLocatorFound = async (locator: pw.Locator, timeout: number = 2000) => {
    try {
        await locator.waitFor({ state: "attached", timeout })
        return true
    } catch(e) {
        if (e instanceof pw.errors.TimeoutError)
            return false
        throw e
    }
}