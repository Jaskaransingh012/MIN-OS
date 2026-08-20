export default class ClipBoardItem{

    constructor (data = {}, metadata = {}) {

        this.data = new Map(Object.entries(data));
        this.metadata = {
            timeStamp : Date.now(),
            source: null,
            ...metadata
        }
        this.id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random();

    }

     /**
     * Check if the item contains data of a given MIME type.
     */
    hasType(type) {
        return this.data.has(type);
    }

     /**
     * Retrieve data for a specific MIME type.
     */
    getData(type) {
        return this.data.get(type) || null;
    }

     /**
     * Convenience: get plain text if available.
     */
    getText() {
        return this.getData('text/plain') || this.getData('text/uri-list') || '';
    }

    /**
     * Convert to a plain object for serialization (e.g., for native clipboard).
     */
    toJSON() {
        return {
            id: this.id,
            data: Object.fromEntries(this.data),
            metadata: this.metadata,
        };
    }
}
