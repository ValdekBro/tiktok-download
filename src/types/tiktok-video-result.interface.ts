import internal from "node:stream";

export interface ITikTokVideoResult {
    type: 'video'
    videoStream: internal.Readable
}