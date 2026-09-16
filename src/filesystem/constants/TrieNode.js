export default class TrieNode {
    constructor () {
        this.children = new Map();
        this.isEnd = false;

        this.data = null;
    }
}
