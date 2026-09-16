import TrieNode from "./TrieNode.js";

export default class FileTrie {

    constructor () {
        this.root = new TrieNode();
    }

    insert(name, data) {
        let node = this.root;

        for(const char of name.toLowerCase()) {
            if(!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }

            node = node.children.get(char);
        }

        node.isEnd = true;
        node.data = data;
    }

    searchPrefix(prefix) {
        let node = this.root;

        for(const char of prefix.toLowerCase()) {
            if(!node.children.has(char)) {
                return [];
            }

            node = node.children.get(char);
        }
        const results = [];
        this._collect(node, results);

        return results;
    }

    _collect(node, results) {
        if(node.isEnd) {
            results.push(node.data);
        }

        for(const child of node.children.values()) {
            this._collect(child, results);
        }
    }

}
