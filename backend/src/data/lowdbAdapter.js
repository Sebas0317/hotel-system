/**
 * lowdb adapter for JSON file storage
 * Provides querying capabilities on top of JSON files
 */
'use strict';

const fs = require('fs');
const path = require('path');

function JSONFileAdapter(filePath) {
  if (!filePath) {
    throw new Error('filePath is required');
  }
  
  this.filePath = filePath;
  this.read = () => {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      if (e.code === 'ENOENT') {
        return null;
      }
      throw e;
    }
  };
  
  this.write = (data) => {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  };
}

module.exports = { JSONFileAdapter };