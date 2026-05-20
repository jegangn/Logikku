import {
  createSamuraiBoard,
  parsePuzzle,
  samuraiConsistencyCheck,
} from '@/engine'

export function freshSamuraiBoardFromGivensForTest(
  samuraiGivens: ReadonlyArray<string>,
): void {
  if (samuraiGivens.length !== 5) {
    throw new Error(`expected 5 sub-grid givens, got ${samuraiGivens.length}`)
  }
  const board = createSamuraiBoard()
  for (let g = 0; g < 5; g++) {
    const parsed = parsePuzzle(samuraiGivens[g]!, board.grids[g]!.shape)
    for (let r = 0; r < parsed.shape.size; r++) {
      for (let c = 0; c < parsed.shape.size; c++) {
        const src = parsed.cells[r]![c]!
        const dst = board.grids[g]!.cells[r]![c]!
        dst.value = src.value
        dst.given = src.given
        dst.candidates = new Set(src.candidates)
      }
    }
  }
  samuraiConsistencyCheck(board)
}
