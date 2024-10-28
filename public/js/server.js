const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const pdfParse = require('pdf-parse');

const app = express();
app.use(cors({ origin: 'http://localhost:1313' }));
app.use(express.urlencoded({ extended: true }));

// Multer configuration to accept both resume and profile image fields
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            if (file.fieldname === 'resume') {
                cb(null, 'static/files'); // Save resume files here
            } else if (file.fieldname === 'profileImage') {
                cb(null, 'static/images/users'); // Save images here
            }
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + path.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix);
        }
    })
});

async function extractTextFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
}

// Use upload.fields to handle multiple file inputs
app.post('/upload', upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), async (req, res) => {
    console.log('File upload initiated...');
    try {
        if (!req.files || !req.files['resume'] || !req.files['profileImage']) {
            console.error('Resume or profile image not uploaded.');
            return res.status(400).send('Resume or profile image not uploaded.');
        }

        const { name, email, phone, github } = req.body;
        const resumeFile = req.files['resume'][0];
        const imageFile = req.files['profileImage'][0];

        // Process PDF resume to extract text
        const extractedText = await extractTextFromPDF(resumeFile.path);
        const sections = detectSections(extractedText);
        const markdownContent = generateMarkdownContent(name, email, phone, github, resumeFile.filename, sections, imageFile.filename);

        const markdownDir = path.join(process.cwd(), 'content', 'en', 'users', 'resumes');
        if (!fs.existsSync(markdownDir)) fs.mkdirSync(markdownDir, { recursive: true });

        const markdownFileName = `${name.replace(' ', '_')}_resume.md`;
        const markdownFilePath = path.join(markdownDir, markdownFileName);

        fs.writeFileSync(markdownFilePath, markdownContent);
        console.log(`Markdown file written to: ${markdownFilePath}`);

        res.status(200).json({ message: 'Resume and image uploaded successfully!', path: markdownFilePath });
    } catch (error) {
        console.error('Error processing the resume:', error);
        res.status(500).send('Error processing the resume.');
    }
});

// Generate markdown content function with image path
function generateMarkdownContent(name, email, phone, github, newFileName, sections, newImageFileName) {
    let markdownContent = `
+++
title = "${name}'s Resume"
date = "${new Date().toISOString()}"
type = "resume"
draft = false
description = "Resume for ${name}"
name = "${name}"
email = "${email}"
phone = "${phone}"
github = "${github}"
resumeFile = "${newFileName}"
image = "images/users/${newImageFileName}"
+++

## Contact Information

- **Name:** ${name}
- **Email:** [${email}](mailto:${email})
- **Phone:** ${phone}
- **GitHub:** [${github}](${github})

---

`;

    for (const [sectionTitle, content] of Object.entries(sections)) {
        markdownContent += `## ${sectionTitle}\n${content ? content.trim() : 'No content available.'}\n\n`;
    }

    markdownContent += `
## View Resume

You can [download the resume](/files/${newFileName}) or view it below:

<embed src="/files/${newFileName}" width="800" height="600" type="application/pdf" />
    `;

    return markdownContent;
}

// Detect sections function
function detectSections(text) {
    const sections = {
        Introduction: '',
        Education: '',
        Skills: '',
        Experience: ''
    };

    const lines = text.split('\n');
    let currentSection = 'Introduction';

    lines.forEach(line => {
        const lineTrimmed = line.trim();
        if (!lineTrimmed) return;

        const lowerLine = lineTrimmed.toLowerCase();

        if (lowerLine.includes('education') || lowerLine.includes('degree')) currentSection = 'Education';
        else if (lowerLine.includes('skills')) currentSection = 'Skills';
        else if (lowerLine.includes('experience')) currentSection = 'Experience';

        sections[currentSection] += lineTrimmed + ' ';
    });

    for (const section in sections) {
        sections[section] = sections[section].replace(/\s+/g, ' ').trim();
    }

    return sections;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
