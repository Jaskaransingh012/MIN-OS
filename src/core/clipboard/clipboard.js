import ClipboardItem from './ClipboardItem.js';

/**
 * Clipboard service – manages the system clipboard with native browser integration.
 * Registered as a kernel service under 'clipboard'.
 */
export default class Clipboard {
    constructor() {
        // Internal storage: one active item
        this._currentItem = null;

        // Keep a reference to the last item written to native clipboard
        this._lastNativeWrite = null;

        // Flag to avoid re‑entrant sync loops
        this._syncing = false;
    }

    /**
     * Copy data to the clipboard.
     * @param {Object|string} data - If string, treated as text/plain.
     *                                If object, can be { 'text/plain': '...', 'text/html': '...' }
     * @param {Object} [metadata] - Optional metadata for the clipboard item.
     * @returns {ClipboardItem} The created item.
     */
    async copy(data, metadata = {}) {
        let itemData;
        if (typeof data === 'string') {
            itemData = { 'text/plain': data };
        } else if (data instanceof ClipboardItem) {
            // Copy from another item – clone it
            const cloned = new ClipboardItem(
                Object.fromEntries(data.data),
                { ...data.metadata, ...metadata }
            );
            this._currentItem = cloned;
            await this._syncToNative(cloned);
            return cloned;
        } else if (typeof data === 'object' && data !== null) {
            itemData = { ...data };
        } else {
            throw new TypeError('Clipboard.copy: data must be a string or object');
        }

        const item = new ClipboardItem(itemData, metadata);
        this._currentItem = item;
        await this._syncToNative(item);
        return item;
    }

    /**
     * Paste – returns the current clipboard item (internal).
     * If no internal item exists, tries to read from the native clipboard.
     * @returns {ClipboardItem|null}
     */
    async paste() {
        if (this._currentItem) {
            return this._currentItem;
        }

        // Attempt to read from native clipboard
        const nativeItem = await this._readFromNative();
        if (nativeItem) {
            this._currentItem = nativeItem;
            return nativeItem;
        }

        return null;
    }

    /**
     * Get the current clipboard item without reading from native (if empty).
     */
    get currentItem() {
        return this._currentItem;
    }

    /**
     * Clear the internal clipboard (does not clear native).
     */
    clear() {
        this._currentItem = null;
    }

    // ─── Native clipboard integration ───────────────────────────

    /**
     * Write the given item to the browser's native clipboard.
     * Supports text/plain and text/html.
     */
    async _syncToNative(item) {
        if (!item) return;
        if (this._syncing) return;
        this._syncing = true;

        try {
            // Check if the browser supports the modern Clipboard API
            if (!navigator.clipboard || !navigator.clipboard.write) {
                console.warn('Clipboard: native write not supported');
                return;
            }

            const clipboardItems = [];

            // Text/plain
            const plainText = item.getData('text/plain');
            if (plainText) {
                clipboardItems.push(
                    new ClipboardItem({
                        'text/plain': new Blob([plainText], { type: 'text/plain' }),
                    })
                );
            }

            // Text/html
            const htmlText = item.getData('text/html');
            if (htmlText) {
                clipboardItems.push(
                    new ClipboardItem({
                        'text/html': new Blob([htmlText], { type: 'text/html' }),
                    })
                );
            }

            // If we have both, combine into one ClipboardItem with both types
            // But the API expects a single ClipboardItem with multiple blobs.
            // We'll combine if we have at least one.
            if (clipboardItems.length > 0) {
                // Combine all blobs into one ClipboardItem
                const combined = {};
                for (const ci of clipboardItems) {
                    for (const [type, blob] of ci) {
                        combined[type] = blob;
                    }
                }
                await navigator.clipboard.write([new ClipboardItem(combined)]);
                this._lastNativeWrite = item;
            }
        } catch (err) {
            console.error('Clipboard: failed to write to native', err);
        } finally {
            this._syncing = false;
        }
    }

    /**
     * Read from the native clipboard and create a ClipboardItem.
     * Currently supports text/plain and text/html.
     */
    async _readFromNative() {
        if (!navigator.clipboard || !navigator.clipboard.read) {
            console.warn('Clipboard: native read not supported');
            return null;
        }

        try {
            const items = await navigator.clipboard.read();
            if (items.length === 0) return null;

            const data = {};
            // Process the first clipboard item (most browsers only expose one)
            const item = items[0];
            const types = item.types;

            for (const type of types) {
                if (type === 'text/plain' || type === 'text/html') {
                    try {
                        const blob = await item.getType(type);
                        const text = await blob.text();
                        data[type] = text;
                    } catch (e) {
                        // ignore unsupported types
                    }
                }
            }

            if (Object.keys(data).length === 0) return null;

            // Create a ClipboardItem with metadata indicating it came from native
            return new ClipboardItem(data, { source: 'native' });
        } catch (err) {
            console.error('Clipboard: failed to read from native', err);
            return null;
        }
    }

    /**
     * Destroy – clean up any resources (none currently).
     */
    destroy() {
        this.clear();
        this._lastNativeWrite = null;
    }
}

