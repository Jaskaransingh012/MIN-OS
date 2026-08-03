export default class FileTypeRegistry {
  constructor() {
    this._map = new Map([
      ['txt', 'text/plain'],
      ['html', 'text/html'],
      ['css', 'text/css'],
      ['js', 'application/javascript'],
      ['json', 'application/json'],
      ['png', 'image/png'],
      ['jpg', 'image/jpeg'],
      ['jpeg', 'image/jpeg'],
      ['gif', 'image/gif'],
      ['svg', 'image/svg+xml'],
      ['pdf', 'application/pdf'],
      ['zip', 'application/zip']
    ]);
  }

  register(extension, mimeType) {
    if (typeof extension !== 'string' || typeof mimeType !== 'string') {
      throw new Error('Extension and MIME type must be strings');
    }
    this._map.set(extension.toLowerCase(), mimeType);
  }

  getMimeType(extensionOrFilename) {
    let ext = extensionOrFilename;
    if (ext.includes('.')) {
      ext = ext.split('.').pop();
    }
    return this._map.get(ext.toLowerCase()) || 'application/octet-stream';
  }
}
