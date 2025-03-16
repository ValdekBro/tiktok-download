export class Stopwatch {
    private startTime: number;

    constructor() { this.start() }

    public start() {
        this.startTime = (new Date()).getTime()
    }

    get msec() {
        const nowTime = (new Date()).getTime()
        return nowTime - this.startTime
    }

    get sec() {
        return this.msec / 1000
    }

    get min() {
        return this.sec / 60
    }
}