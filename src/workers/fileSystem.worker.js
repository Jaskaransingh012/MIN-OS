self.onmessage = function (event) {
  const { type, data } = event.data;

  try {
    switch (type) {
      case "SEARCH_FULL_SYSTEM":
        searchFullSystem(data);
        break;

      case "SEARCH_DIRECTORY":
        searchDirectory(data);
        break;

      case "AUTOCOMPLETE":
        autocomplete(data);
        break;

      default:
        throw new Error(`Unknown worker operation: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      success: true,
      type: "SEARCH_FULL_SYSTEM",
      results,
      requestId: event.data.requestId,
    });
  }
};

// --------------------------------------
// FULL SYSTEM SEARCH
// --------------------------------------

function searchFullSystem({ root, pattern }) {
  const results = [];

  const lowerPattern = pattern.toLowerCase();

  function traverse(node) {
    if (node.name.toLowerCase().includes(lowerPattern)) {
      results.push({
        id: node.id,
        name: node.name,
        isDirectory: node.isDirectory,
        isFile: node.isFile,
        path: node.path,
      });
    }

    if (node.isDirectory && node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);

  self.postMessage({
    success: true,
    type: "SEARCH_FULL_SYSTEM",
    results,
    requestId: event.data.requestId,
  });
}

// --------------------------------------
// CURRENT DIRECTORY SEARCH
// --------------------------------------

function searchDirectory({ children, pattern }) {
  const lowerPattern = pattern.toLowerCase();

  const results = children.filter((child) =>
    child.name.toLowerCase().includes(lowerPattern),
  );

  self.postMessage({
    success: true,
    type: "SEARCH_FULL_SYSTEM",
    results,
    requestId: event.data.requestId,
  });
}

// --------------------------------------
// AUTOCOMPLETE
// --------------------------------------

function autocomplete({ children, prefix }) {
  const lowerPrefix = prefix.toLowerCase();

  const results = children.filter((child) =>
    child.name.toLowerCase().startsWith(lowerPrefix),
  );

  self.postMessage({
    success: true,
    type: "SEARCH_FULL_SYSTEM",
    results,
    requestId: event.data.requestId,
  });
}
