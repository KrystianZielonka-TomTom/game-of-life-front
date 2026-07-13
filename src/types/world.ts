export interface WorldDto {
    tiles: TileDto[]
}

export interface TileDto {
    tileIndexX: number,
    tileIndexY: number,
    data: Uint8Array
}

export interface TimingDto<T> {
    stepMs: number,
    loadingMs: number,
    response: T
}