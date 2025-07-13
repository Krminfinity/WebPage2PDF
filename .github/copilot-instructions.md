# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a Node.js web application that converts web pages to PDF files using Puppeteer. The application allows users to input multiple URLs (comma-separated) and download each page as a PDF file.

## Key Technologies:
- Express.js for the web server
- Puppeteer for web page to PDF conversion
- Modern HTML/CSS/JavaScript for the frontend
- Bootstrap or similar for responsive UI design

## Project Structure:
- `server.js` - Main Express server
- `public/` - Static files (HTML, CSS, JS)
- `downloads/` - Temporary storage for generated PDF files
- `uploads/` - Temporary storage for uploaded CSV files

## Features:
- Multiple URL input (comma-separated, up to 50 URLs)
- CSV file upload with automatic URL extraction
- Batch PDF generation
- Individual file downloads
- Bulk download as ZIP archive
- Responsive web interface
- Error handling for invalid URLs
