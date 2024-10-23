const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();

// Set up Multer for file upload; files will be temporarily stored in the 'uploads/' folder
const upload = multer({ dest: 'uploads/' });

// Route to handle the file upload
app.post('/upload', upload.single('resume'), async (req, res) => {
    try {
        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        // Get the original file name of the uploaded file
        const originalFileName = req.file.originalname;

        // Read the uploaded file (PDF)
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);

        // Process the PDF and generate markdown content with TOML front matter, including type = "resume"
        const markdownContent = `
+++
title = "${originalFileName.replace('.pdf', '')}"
date = "${new Date().toISOString()}"
draft = false
type = "resume"
+++

## Resume Overview

Below is the extracted content from the uploaded resume:

${pdfData.text.split('\n').map(line => `> ${line}`).join('\n')}

---

## Original File Information

- **File Name**: ${originalFileName}
- **Upload Date**: ${new Date().toLocaleDateString()}
        `;

        // Create the markdown file name based on the original name (replace .pdf with .md)
        const markdownFileName = `${originalFileName.replace('.pdf', '')}.md`;

        // Ensure the 'content/en/resumes' directory exists, if not, create it
        const markdownDir = path.join(__dirname, 'content', 'en', 'resumes');
        if (!fs.existsSync(markdownDir)) {
            fs.mkdirSync(markdownDir, { recursive: true });
        }

        // Write the markdown file to the 'content/en/resumes' directory
        const markdownFilePath = path.join(markdownDir, markdownFileName);
        fs.writeFileSync(markdownFilePath, markdownContent);

        // Respond with success message
        res.status(200).send('Resume uploaded and markdown generated!');
    } catch (error) {
        console.error('Error processing the resume:', error);
        res.status(500).send('Error processing the resume.');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
