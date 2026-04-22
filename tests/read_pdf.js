const fs = require('fs');
const pdfParse = require('pdf-parse');

let dataBuffer = fs.readFileSync('final_PROJECT_grading-factor.pdf');

pdfParse(dataBuffer).then(function(data) {
    const lines = data.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('level 3') || lines[i].toLowerCase().includes('level 4')) {
             console.log(lines.slice(Math.max(i-2, 0), Math.min(i+30, lines.length)).join('\n'));
             break;
        }
    }
}).catch(console.error);
