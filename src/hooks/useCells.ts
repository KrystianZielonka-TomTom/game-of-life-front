import { useEffect, useState } from "react";
import {fetchRandomCells} from "../api/cells";
import type { CellPart } from "../types/cellPart";

export function useRandomCells() {
    const [cells, setCells] = useState<CellPart | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRandomCells()
        .then(data => setCells(data))
        .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "Nieznany blad")
        })
        .finally(() => setLoading(false))
    }, []);

    return {cells, loading, error}
}