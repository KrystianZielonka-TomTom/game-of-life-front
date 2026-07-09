export interface WorldDto {
    tiles: TileDto[]
}

export interface TileDto {
    tileIndexX: number,
    tileIndexY: number,
    data: Uint8Array
}