const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://localhost:1313' }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const { name, email, phone, github } = req.body;

        const originalFileName = req.file.originalname;
        const fileExtension = path.extname(originalFileName);
        const newFileName = originalFileName.replace(fileExtension, '') + Date.now() + fileExtension;

        // Move the uploaded file to the Hugo static directory
        const destinationPath = path.join(process.cwd(), 'static', 'files', newFileName);
        fs.renameSync(req.file.path, destinationPath);

        // Create a markdown file that includes contact info and links to the PDF file
        const markdownContent = `
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
+++

## Contact Information

- **Name:** ${name}
- **Email:** [${email}](mailto:${email})
- **Phone:** ${phone}
- **GitHub:** [${github}](${github})

---

## View Resume

You can [download the resume](/files/${newFileName}) or view it below:

<embed src="/files/${newFileName}" width="800" height="600" type="application/pdf" />
`;

        // Ensure the 'content/en/resumes' directory exists; if not, create it
        const markdownDir = path.join(process.cwd(), 'content', 'en', `users`, 'resumes');
        if (!fs.existsSync(markdownDir)) {
            fs.mkdirSync(markdownDir, { recursive: true });
        }

        // Write the markdown file to the 'content/en/resumes' directory
        const markdownFileName = `${name.replace(' ', '_')}_resume.md`;
        const markdownFilePath = path.join(markdownDir, markdownFileName);

        fs.writeFileSync(markdownFilePath, markdownContent);
        console.log(`Markdown file written to: ${markdownFilePath}`);

        // Redirect to users page after successful upload
        res.status(200).json({ message: 'Resume uploaded and displayed successfully!' });
    } catch (error) {
        console.error('Error processing the resume:', error);
        res.status(500).send('Error processing the resume.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
