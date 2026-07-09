import type {CellPart} from "../types/cellPart";
import type { WorldDto } from "../types/world";

const BASE_URL = "http://localhost:8080";

interface RawCellPart {
    x: number;
    y: number;
    width: number;
    height: number;
    data: string;
}


export async function fetchRandomCells(): Promise<CellPart> {
    // const searchParams = new URLSearchParams();
    // searchParams.append("type", "all");
    // searchParams.append("query", "coins");
    // searchParams.toString(); // "type=all&query=coins"
    const response = await fetch(`${BASE_URL}/world/random`)
    if(!response.ok) {
        throw new Error("blad api");
    }

    const raw = await response.json() as RawCellPart;


    console.log(raw)
    return {
        x: raw.x,
        y: raw.y,
        width: raw.width,
        height: raw.height,
        data: base64ToByteArray(raw.data),
    };
}

function base64ToByteArray(base64: string): Uint8Array {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function byteArrayToBase64(data: Uint8Array): string {
return btoa(String.fromCharCode(...data));

}

export interface RawWorldDto {
    tiles: RawTileDto[]
}

export interface RawTileDto {
    tileIndexX: number,
    tileIndexY: number,
    data: string
}

export async function fetchNextState(steps: number, world: WorldDto): Promise<WorldDto> {

    const body = JSON.stringify({
        step: steps,
        world: {
            tiles: world.tiles.map((tile) => ({
            tileIndexX: tile.tileIndexX,
            tileIndexY: tile.tileIndexY,
            data: byteArrayToBase64(tile.data),
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

    const raw = await response.json() as RawWorldDto;

    return {
        tiles: raw.tiles.map((rawTile) => {return {
            tileIndexX: rawTile.tileIndexX,
            tileIndexY: rawTile.tileIndexY,
            data: base64ToByteArray(rawTile.data)
        }})
    }
}