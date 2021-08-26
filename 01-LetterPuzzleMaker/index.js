const fs = require("fs")

WORDS = JSON.parse(fs.readFileSync("data/words.txt"));
WORD_SET = new Set(WORDS);
console.log(`Loaded ${WORDS.length} words.`);

class Board {
    constructor(size = 15) {
        this.size = size;
        this.tiles = [];
        for (let i = 0; i < this.size; i++) {
            this.tiles.push(Array(this.size).fill("."));
        }

        this.makePuzzle();
    }

    getDeltas(horizontal) {
        return horizontal ? [0, 1] : [1, 0];
    }

    getWordMask(horizontal, r, c, word, searchRow, searchColumn) {
        // Imagine that the word [word] has been placed on the board.
        // If (searchRow, searchColumn) overlaps the word, return the letter
        // at that coordinate. Otherwise, return whatever is currently
        // on the board at that position.

        if (horizontal) {
            if (searchRow !== r || searchColumn < c || searchColumn >= c + word.length) {
                return this.tiles[searchRow][searchColumn];
            }
            return word[searchColumn - c];
        } else {
            if (searchColumn !== c || searchRow < r || searchRow >= r + word.length) {
                return this.tiles[searchRow][searchColumn];
            }
            return word[searchRow - r];
        }
    }

    isValidPlacement(horizontal, r, c, word) {
        // We check to see if [word] is a valid placement without actually
        // modifying the contents of the puzzle.

        // First check that the word we are trying to place does not conflict
        // with any existing letter on the board. 
        // As we are doing this, count the number of overlaps.
        let overlaps = 0;
        let standalone = 0
        const [dr, dc] = this.getDeltas(horizontal);
        
        for (let i = 0; i < word.length; i++) {
            const boardTile = this.tiles[r + dr * i][c + dc * i];

            if (boardTile !== ".") {
                if (boardTile !== word[i]) {
                    return false;
                } else {
                    overlaps++;
                }
            } else {
                standalone++;
            }
        }

        // If there are no overlaps on a non empty board, this is not a valid placement.
        // Furthermore, the word must contain at least one letter which does not 
        // overlap an existing tile.
        if ((this.totalPlacements > 0 && overlaps === 0) || standalone === 0) {
            return false;
        }

        // Now we must check every row and column to see if the words they spell
        // are valid. This is where many placements will fail.

        // Rows first, then flip coordinates for columns.
        for (let flip of [false, true]) {
            for (let sr = 0; sr < this.size; sr++) {
                let acc = "";

                for (let sc = 0; sc < this.size; sc++) {
                    let char = this.getWordMask(horizontal, r, c, word,
                        (flip ? sc : sr), (flip ? sr : sc));
                    
                    if (char === ".") {
                        if (acc.length >= 2 && !WORD_SET.has(acc)) {
                            return false;
                        }
                        acc = "";
                    } else {
                        acc += char;
                    }
                }

                if (acc.length >= 2 && !WORD_SET.has(acc)) {
                    return false;
                }
            }
        }

        return true;
    }

    actuallyPlaceWord(word, horizontal, r, c) {
        // Given that we know [word] fits, place it on the board.

        this.totalPlacements++;
        const [dr, dc] = this.getDeltas(horizontal);

        for (let i = 0; i < word.length; i++) {
            this.tiles[r + dr * i][c + dc * i] = word[i];
        }
    }

    makePuzzle(cycles = 50000) {
        // The algorithm is very simple and kind of wasteful.
        // We simply attempt to pick a random word and see if it fits somewhere.
        // This process is repeated [cycles] times.
        
        this.totalPlacements = 0;

        for (let i = 0; i < cycles; i++) {
            const word = WORDS[Math.floor(Math.random() * WORDS.length)];
            let validPlacements = [];

            for (let r = 0; r < this.size; r++) {
                for (let c = 0; c <= this.size - word.length; c++) {
                    if (this.isValidPlacement(true, r, c, word)) {
                        validPlacements.push([true, r, c]);
                    }
                }
            }

            for (let r = 0; r <= this.size - word.length; r++) {
                for (let c = 0; c < this.size; c++) {
                    if (this.isValidPlacement(false, r, c, word)) {
                        validPlacements.push([false, r, c]);
                    }
                }
            }

            if (validPlacements.length > 0) {
                const placement = validPlacements[Math.floor(Math.random() * validPlacements.length)];
                this.actuallyPlaceWord(word, placement[0], placement[1], placement[2]);
            }
        }
    }

    toString() {
        return "+" + "-".repeat(this.size) + "+\n" +
            this.tiles.map(row => "|" + row.join("") + "|").join("\n") +
            "\n+" + "-".repeat(this.size) + "+\n";
    }

    density() {
        // Return the proportion of tiles which are occupied by a letter.
        let occupied = 0;

        for (let row of this.tiles) {
            for (let char of row) {
                if (char !== ".") {
                    occupied++;
                }
            }
        }

        return occupied / (this.size * this.size);
    }
}

function createBoard(searchTimeSeconds, size) {
    let bestDensity = 0;
    let best = null;
    let startTime = Date.now();
    let boardsGenerated = 0;
    
    while (Date.now() - startTime < searchTimeSeconds * 1000) {
        let board = new Board(size);
        let density = board.density();
        boardsGenerated++;

        if (density > bestDensity) {
            bestDensity = density;
            best = board;
        }
    }

    return [best, boardsGenerated];
}

let [board, boardsGenerated] = createBoard(5, 10);
console.log(board.toString());
console.log(`(Generated ${boardsGenerated}, density ${board.density()})`);