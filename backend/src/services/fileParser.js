const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const yauzl = require('yauzl');

const readFile = promisify(fs.readFile);

/**
 * Parse a file and return its plain text content.
 * Supports: .docx, .odt, .txt, .pdf (text extraction best-effort)
 */
async function parseFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.docx') {
    return parseDOCX(filePath);
  }

  if (ext === '.odt') {
    return parseODT(filePath);
  }

  if (ext === '.txt') {
    const buf = await readFile(filePath);
    return buf.toString('utf-8');
  }

  // Fallback: try reading as utf-8 text
  const buf = await readFile(filePath);
  return buf.toString('utf-8');
}

async function parseDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  if (result.messages && result.messages.length > 0) {
    result.messages.forEach(m => {
      if (m.type === 'error') console.error('[fileParser] mammoth error:', m.message);
      else console.warn('[fileParser] mammoth warning:', m.message);
    });
  }
  return result.value.trim();
}

/**
 * Parse ODF/ODT by unzipping and extracting content.xml, then stripping XML tags.
 */
function parseODT(filePath) {
  return new Promise((resolve, reject) => {
    let textContent = '';
    let found = false;

    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (entry.fileName === 'content.xml') {
          found = true;
          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr) return reject(streamErr);
            const chunks = [];
            readStream.on('data', chunk => chunks.push(chunk));
            readStream.on('end', () => {
              const xml = Buffer.concat(chunks).toString('utf-8');
              textContent = extractTextFromODFXML(xml);
              zipfile.close();
              resolve(textContent.trim());
            });
            readStream.on('error', reject);
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on('end', () => {
        if (!found) reject(new Error('content.xml not found in ODT file'));
      });

      zipfile.on('error', reject);
    });
  });
}

/**
 * Strip XML tags from ODF content.xml and return plain text.
 * Inserts spaces/newlines at paragraph and span boundaries.
 */
function extractTextFromODFXML(xml) {
  // Replace paragraph tags with newlines
  let text = xml
    .replace(/<text:p[^>]*>/g, '\n')
    .replace(/<text:h[^>]*>/g, '\n')
    .replace(/<text:line-break[^>]*\/?>/g, '\n')
    .replace(/<text:tab[^>]*\/?>/g, '\t')
    .replace(/<text:s[^>]*\/?>/g, ' ')
    // Remove all remaining XML tags
    .replace(/<[^>]+>/g, '')
    // Decode common XML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#xA;/g, '\n')
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n');

  return text;
}

module.exports = { parseFile };
