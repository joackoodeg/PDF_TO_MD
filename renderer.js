const { ipcRenderer } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');

const convertBtn = document.getElementById('convertBtn');
const pdfInput = document.getElementById('pdfInput');
const preview = document.getElementById('preview');

convertBtn.addEventListener('click', () => {
  const file = pdfInput.files[0];
  if (!file) return alert("Select a PDF file first!");

  const filePath = file.path;

  execFile('python', ['converter.py', filePath], (err, stdout, stderr) => {
    if (err) {
      alert("Error in conversion.");
      console.error(stderr);
      return;
    }

    // Preview markdown output
    preview.textContent = stdout;

    // Save file automatically as 'output.md'
    const outputPath = path.join(__dirname, 'output.md');
    fs.writeFileSync(outputPath, stdout);
    alert("Markdown file saved!");
  });
});

