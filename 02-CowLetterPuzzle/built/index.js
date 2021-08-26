var ipcRenderer = require("electron").ipcRenderer;
var fs = require("fs");
WORDS = JSON.parse(fs.readFileSync("static/words.json", "utf-8"));
WORD_SET = new Set(WORDS);
console.log("Loaded " + WORDS.length + " words.");
var Board = /** @class */ (function () {
    function Board(size) {
        if (size === void 0) { size = 15; }
        this.size = size;
        this.tiles = [];
        for (var i = 0; i < this.size; i++) {
            this.tiles.push(Array(this.size).fill("."));
        }
        this.makePuzzle();
    }
    Board.prototype.getDeltas = function (horizontal) {
        return horizontal ? [0, 1] : [1, 0];
    };
    Board.prototype.getWordMask = function (horizontal, r, c, word, searchRow, searchColumn) {
        // Imagine that the word [word] has been placed on the board.
        // If (searchRow, searchColumn) overlaps the word, return the letter
        // at that coordinate. Otherwise, return whatever is currently
        // on the board at that position.
        if (horizontal) {
            if (searchRow !== r || searchColumn < c || searchColumn >= c + word.length) {
                return this.tiles[searchRow][searchColumn];
            }
            return word[searchColumn - c];
        }
        else {
            if (searchColumn !== c || searchRow < r || searchRow >= r + word.length) {
                return this.tiles[searchRow][searchColumn];
            }
            return word[searchRow - r];
        }
    };
    Board.prototype.isValidPlacement = function (horizontal, r, c, word) {
        // We check to see if [word] is a valid placement without actually
        // modifying the contents of the puzzle.
        // First check that the word we are trying to place does not conflict
        // with any existing letter on the board. 
        // As we are doing this, count the number of overlaps.
        var overlaps = 0;
        var standalone = 0;
        var _a = this.getDeltas(horizontal), dr = _a[0], dc = _a[1];
        for (var i = 0; i < word.length; i++) {
            var boardTile = this.tiles[r + dr * i][c + dc * i];
            if (boardTile !== ".") {
                if (boardTile !== word[i]) {
                    return false;
                }
                else {
                    overlaps++;
                }
            }
            else {
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
        for (var _i = 0, _b = [false, true]; _i < _b.length; _i++) {
            var flip = _b[_i];
            for (var sr = 0; sr < this.size; sr++) {
                var acc = "";
                for (var sc = 0; sc < this.size; sc++) {
                    var char = this.getWordMask(horizontal, r, c, word, (flip ? sc : sr), (flip ? sr : sc));
                    if (char === ".") {
                        if (acc.length >= 2 && !WORD_SET.has(acc)) {
                            return false;
                        }
                        acc = "";
                    }
                    else {
                        acc += char;
                    }
                }
                if (acc.length >= 2 && !WORD_SET.has(acc)) {
                    return false;
                }
            }
        }
        return true;
    };
    Board.prototype.actuallyPlaceWord = function (word, horizontal, r, c) {
        // Given that we know [word] fits, place it on the board.
        this.totalPlacements++;
        var _a = this.getDeltas(horizontal), dr = _a[0], dc = _a[1];
        for (var i = 0; i < word.length; i++) {
            this.tiles[r + dr * i][c + dc * i] = word[i];
        }
    };
    Board.prototype.makePuzzle = function (cycles) {
        // The algorithm is very simple and kind of wasteful.
        // We simply attempt to pick a random word and see if it fits somewhere.
        // This process is repeated [cycles] times.
        if (cycles === void 0) { cycles = 50000; }
        this.totalPlacements = 0;
        for (var i = 0; i < cycles; i++) {
            var word = WORDS[Math.floor(Math.random() * WORDS.length)];
            var validPlacements = [];
            for (var r = 0; r < this.size; r++) {
                for (var c = 0; c <= this.size - word.length; c++) {
                    if (this.isValidPlacement(true, r, c, word)) {
                        validPlacements.push([true, r, c]);
                    }
                }
            }
            for (var r = 0; r <= this.size - word.length; r++) {
                for (var c = 0; c < this.size; c++) {
                    if (this.isValidPlacement(false, r, c, word)) {
                        validPlacements.push([false, r, c]);
                    }
                }
            }
            if (validPlacements.length > 0) {
                var placement = validPlacements[Math.floor(Math.random() * validPlacements.length)];
                this.actuallyPlaceWord(word, placement[0], placement[1], placement[2]);
            }
        }
    };
    Board.prototype.toString = function () {
        return "+" + "-".repeat(this.size) + "+\n" +
            this.tiles.map(function (row) { return "|" + row.join("") + "|"; }).join("\n") +
            "\n+" + "-".repeat(this.size) + "+\n";
    };
    Board.prototype.density = function () {
        // Return the proportion of tiles which are occupied by a letter.
        var occupied = 0;
        for (var _i = 0, _a = this.tiles; _i < _a.length; _i++) {
            var row = _a[_i];
            for (var _b = 0, row_1 = row; _b < row_1.length; _b++) {
                var char = row_1[_b];
                if (char !== ".") {
                    occupied++;
                }
            }
        }
        return occupied / (this.size * this.size);
    };
    return Board;
}());
function createBoard(searchTimeSeconds, size) {
    var bestDensity = 0;
    var best = null;
    var startTime = Date.now();
    var boardsGenerated = 0;
    while (Date.now() - startTime < searchTimeSeconds * 1000) {
        var board = new Board(size);
        var density = board.density();
        boardsGenerated++;
        if (density > bestDensity) {
            bestDensity = density;
            best = board;
        }
    }
    return [best, boardsGenerated];
}
var Tile = /** @class */ (function () {
    function Tile(open, contents) {
        this.open = open;
        this.contents = contents;
    }
    return Tile;
}());
var Game = /** @class */ (function () {
    function Game(boardElement) {
        var _this = this;
        this.boardElement = boardElement;
        this.answer = null;
        this.elements = [];
        this.size = 0;
        this.guesses = [];
        this.hideHorizontal = [];
        this.letterSizePixels = 16;
        this.selectedRow = -1;
        this.selectedColumn = -1;
        this.selectedHorizontal = true;
        this.hideHalf = false;
        this.newPuzzle(6);
        document.addEventListener("keydown", function (event) {
            _this.tileKey(event.key);
            event.preventDefault();
        });
        window.addEventListener("resize", function (event) {
            _this.calculateAutomaticFontSize();
            _this.draw();
        });
    }
    Game.prototype.newPuzzle = function (size) {
        this.answer = new Board(size); //createBoard(1, size)[0];
        this.createElements(size);
        this.guesses = [];
        this.hideHorizontal = [];
        for (var r = 0; r < size; r++) {
            this.guesses.push([]);
            this.hideHorizontal.push([]);
            for (var c = 0; c < size; c++) {
                this.guesses[this.guesses.length - 1].push("");
                this.hideHorizontal[this.hideHorizontal.length - 1].push(Math.random() < 0.5);
            }
        }
        this.draw();
    };
    Game.prototype.createElements = function (size) {
        var _this = this;
        while (this.boardElement.firstChild) {
            this.boardElement.removeChild(this.boardElement.lastChild);
        }
        this.boardElement.style.gridTemplateColumns = "2fr repeat(" + size + ", 1fr)";
        this.boardElement.style.gridTemplateRows = "2fr repeat(" + size + ",  1fr)";
        this.boardElement.style.gridGap = "5px";
        this.elements = [];
        var _loop_1 = function (r) {
            var row = [];
            var _loop_2 = function (c) {
                var element = document.createElement("div");
                element.style.width = "100%";
                element.style.height = "100%";
                element.style.gridColumnStart = c + 1;
                element.style.gridColumnEnd = c + 2;
                element.style.gridRowStart = r + 1;
                element.style.gridRowEnd = r + 2;
                element.classList.add(r === 0 || c === 0 ? "letters" : "tile");
                if (c === 0 && r !== 0) {
                    element.classList.add("row-letters");
                }
                if (r === 0 && c !== 0) {
                    element.classList.add("column-letters");
                }
                element.addEventListener("click", function (event) {
                    _this.tileClick(r, c);
                });
                this_1.boardElement.appendChild(element);
                row.push(element);
            };
            for (var c = 0; c <= size; c++) {
                _loop_2(c);
            }
            this_1.elements.push(row);
        };
        var this_1 = this;
        for (var r = 0; r <= size; r++) {
            _loop_1(r);
        }
        this.size = size;
        this.calculateAutomaticFontSize();
    };
    Game.prototype.isSolid = function (r, c) {
        return r < 0 || c < 0 || r >= this.size || c >= this.size || this.answer.tiles[r][c] === ".";
    };
    Game.prototype.tileClick = function (r, c) {
        console.log("Click: " + r + ", " + c);
        if (r < 1 || c < 1 || this.isSolid(r - 1, c - 1)) {
            this.selectedRow = -1;
            this.selectedColumn = -1;
        }
        else if (r - 1 === this.selectedRow && c - 1 === this.selectedColumn) {
            this.selectedHorizontal = !this.selectedHorizontal;
        }
        else {
            this.selectedRow = r - 1;
            this.selectedColumn = c - 1;
            // Remember, r and c are one more than the tile indexes
            if (!this.isSolid(r - 1, c)) {
                this.selectedHorizontal = true;
            }
            else if (!this.isSolid(r, c - 1)) {
                this.selectedHorizontal = false;
            }
            else {
                this.selectedHorizontal = true;
            }
        }
        this.draw();
    };
    Game.prototype.tileKey = function (key) {
        console.log("Key: " + key);
        if (/^[a-zA-Z]$/.test(key)) {
            if (this.isSolid(this.selectedRow, this.selectedColumn)) {
                return;
            }
            this.guesses[this.selectedRow][this.selectedColumn] = key.toUpperCase();
            if (this.selectedHorizontal) {
                this.selectedColumn++;
            }
            else {
                this.selectedRow++;
            }
            if (this.isSolid(this.selectedRow, this.selectedColumn)) {
                this.selectedColumn = -1;
                this.selectedRow = -1;
            }
            this.draw();
        }
        if (key === "Backspace" || key === "Delete") {
            this.guesses[this.selectedRow][this.selectedColumn] = "";
            if (this.selectedHorizontal && !this.isSolid(this.selectedRow, this.selectedColumn - 1)) {
                this.selectedColumn--;
            }
            if (!this.selectedColumn && !this.isSolid(this.selectedRow - 1, this.selectedColumn)) {
                this.selectedRow--;
            }
            this.draw();
        }
        if (key === "\\") {
            this.newPuzzle(this.size);
            this.draw();
        }
        if (key === "+" || key === "=") {
            this.newPuzzle(this.size + 1);
            this.draw();
        }
        if (key === "-" && this.size > 4) {
            this.newPuzzle(this.size - 1);
            this.draw();
        }
        if (key === "0") {
            this.hideHalf = !this.hideHalf;
            this.draw();
        }
    };
    Game.prototype.draw = function () {
        for (var r = 0; r < this.size; r++) {
            for (var c = 0; c < this.size; c++) {
                var element = this.elements[r + 1][c + 1];
                while (element.firstChild) {
                    element.removeChild(element.lastChild);
                }
                element.classList.add(this.answer.tiles[r][c] === "." ? "disabled" : "enabled");
                element.classList.remove(this.answer.tiles[r][c] === "." ? "enabled" : "disabled");
                if (r === this.selectedRow && c === this.selectedColumn) {
                    element.classList.add("selected");
                    element.classList.remove("selected-line");
                }
                else if ((this.selectedHorizontal && r === this.selectedRow) ||
                    (!this.selectedHorizontal && c === this.selectedColumn)) {
                    element.classList.remove("selected");
                    element.classList.add("selected-line");
                }
                else {
                    element.classList.remove("selected");
                    element.classList.remove("selected-line");
                }
                if (this.guesses[r][c].length !== 0) {
                    var text = document.createTextNode(this.guesses[r][c].toUpperCase());
                    var div = document.createElement("div");
                    div.classList.add("automatic-letter-size");
                    div.style.fontSize = this.letterSizePixels + "px";
                    div.appendChild(text);
                    element.appendChild(div);
                }
            }
        }
        for (var _i = 0, _a = [true, false]; _i < _a.length; _i++) {
            var horizontal = _a[_i];
            for (var i = 0; i < this.size; i++) {
                var letters = Array(26).fill(0);
                var guesses = Array(26).fill(0);
                for (var j = 0; j < this.size; j++) {
                    var r = (horizontal ? i : j);
                    var c = (horizontal ? j : i);
                    if (!this.isSolid(r, c) && (!this.hideHalf || horizontal == !this.hideHorizontal[r][c])) {
                        letters[this.answer.tiles[r][c].toLowerCase().charCodeAt(0) - 97]++;
                        var g = this.guesses[r][c];
                        if (g.length > 0) {
                            guesses[g.toLowerCase().charCodeAt(0) - 97]++;
                        }
                    }
                }
                var headerElement = (horizontal ? this.elements[i + 1][0] : this.elements[0][i + 1]);
                while (headerElement.firstChild) {
                    headerElement.removeChild(headerElement.lastChild);
                }
                headerElement.style.fontSize = this.letterSizePixels * 0.5 + "px";
                var flexible = document.createElement("div");
                flexible.className = "flexible";
                var allCorrect = true;
                for (var ch = 0; ch < 26; ch++) {
                    for (var o = 0; o < letters[ch]; o++) {
                        var type = (o >= guesses[ch] ? "needed" : (o < letters[ch] ? "satisfied" : "extra"));
                        var char = document.createTextNode(String.fromCharCode(65 + ch));
                        var charContainer = document.createElement("div");
                        charContainer.className = type;
                        charContainer.appendChild(char);
                        flexible.appendChild(charContainer);
                        if (guesses[ch] !== letters[ch]) {
                            allCorrect = false;
                        }
                    }
                }
                headerElement.appendChild(flexible);
                if (allCorrect) {
                    headerElement.classList.add("all-correct");
                }
                else {
                    headerElement.classList.remove("all-correct");
                }
            }
        }
    };
    Game.prototype.calculateAutomaticFontSize = function () {
        if (this.elements.length === 0) {
            this.letterSizePixels = 16;
            return;
        }
        var lastTile = this.elements[this.elements.length - 1][this.elements[this.elements.length - 1].length - 1];
        this.letterSizePixels = lastTile.clientWidth * 0.7;
    };
    return Game;
}());
var game = new Game(document.getElementById("board"));
