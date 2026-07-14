import type { TimingDto, WorldDto } from "../types/world";
import { CHUNK_WIDTH } from "../store.js"

const BASE_URL = "http://localhost:8080";
const CHUNK_ARR_LENGTH = CHUNK_WIDTH * CHUNK_WIDTH;

export async function fetchRandomCells(x: number, y: number, width: number, height: number): Promise<TimingDto<WorldDto>> {
    const searchParams = new URLSearchParams();
    searchParams.append("steps", "1");
    searchParams.append("x", Math.floor(x).toString());
    searchParams.append("y", Math.floor(y).toString());
    searchParams.append("w", Math.floor(width).toString());
    searchParams.append("h", Math.floor(height).toString());
    const response = await fetch(`${BASE_URL}/world/random?` + searchParams.toString())
    if(!response.ok) {
        throw new Error("blad api");
    }

    const raw = await response.json() as TimingDto<RawWorldDto>;

    return {
        stepMs: raw.stepMs,
        loadingMs: raw.loadingMs,
        response: {
        tiles: raw.response.tiles.map((rawTile) => {return {
            tileIndexX: rawTile.tileIndexX,
            tileIndexY: rawTile.tileIndexY,
            data: base64ToCellData(rawTile.data, CHUNK_ARR_LENGTH)
        }})
    }
    }
}


function base64ToByteArray(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function byteArrayToBase64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data));
}

function base64ToCellData(base64: string, width: number): Uint8Array {
    const bytes = base64ToByteArray(base64);
    const result = new Uint8Array(width);

    for (let i = 0; i < width; i++) {
        const byteIndex = i >> 3;
        const bitIndex = i & 7;
        if (byteIndex < bytes.length) {
            result[i] = (bytes[byteIndex] & (1 << bitIndex)) !== 0 ? 1 : 0;
        }
    }

    return result;
}

function cellDataToBase64(value: Uint8Array): string {
    let highestSetBit = -1;
    for (let i = 0; i < value.length; i++) {
        if (value[i]) highestSetBit = i;
    }

    if (highestSetBit === -1) {
        return byteArrayToBase64(new Uint8Array(0));
    }

    const byteLength = (highestSetBit >> 3) + 1;
    const bytes = new Uint8Array(byteLength);

    for (let i = 0; i <= highestSetBit; i++) {
        if (value[i]) {
            const byteIndex = i >> 3;
            const bitIndex = i & 7;
            bytes[byteIndex] |= (1 << bitIndex);
        }
    }

    return byteArrayToBase64(bytes);
}

export interface RawWorldDto {
    tiles: RawTileDto[]
}

export interface RawTileDto {
    tileIndexX: number,
    tileIndexY: number,
    data: string
}

export async function fetchNextState(steps: number, world: WorldDto): Promise<TimingDto<WorldDto>>  {

    const body = JSON.stringify({
        step: steps,
        world: {
            tiles: world.tiles.map((tile) => ({
            tileIndexX: tile.tileIndexX,
            tileIndexY: tile.tileIndexY,
            data: cellDataToBase64(tile.data),
            })),
        },
        });

    const response = await fetch(`${BASE_URL}/world/step`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: body,
    })

    if(!response.ok) {
        throw new Error("blad api");
    }

    const raw = await response.json() as TimingDto<RawWorldDto>;

    return {
        stepMs: raw.stepMs,
        loadingMs: raw.loadingMs,
        response: {
        tiles: raw.response.tiles.map((rawTile) => {return {
            tileIndexX: rawTile.tileIndexX,
            tileIndexY: rawTile.tileIndexY,
            data: base64ToCellData(rawTile.data, CHUNK_ARR_LENGTH)
        }})
    }
    }
}