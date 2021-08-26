// Process the BNC word list to extract about 5000 good, solid words
// of about the right length (2 to 5 letters).
//
// Input is in data/bnc_wordlist.txt; output will be in
// data/words.txt as a 500-elem JSON array of strings, each one word.

const fs = require('fs');

let words = [];
const text = fs.readFileSync("data/bnc_wordlist.txt", {
    encoding: "utf-8"
}); 

for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^[0-9]+\s+[0-9]+\s+([a-z]+)\s+$/);
    if (match) {
        const word = match[1];
        if (word.length >= 3 && word.length <= 7) {
            words.push(word);
            if (words.length >= 20000) {
                break;
            }
        }
    }
}

fs.writeFileSync("data/words.txt", JSON.stringify(words));
console.log("Finished writing " + words.length + " words to file!");

