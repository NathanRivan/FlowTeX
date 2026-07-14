// Depth-first, pre-order list of every folder with its nesting depth (for folder pickers)
export function flattenFolders(folders, parentId = null, depth = 0) {
  return folders
    .filter(f => f.parent_id === parentId)
    .flatMap(f => [{ folder: f, depth }, ...flattenFolders(folders, f.id, depth + 1)]);
}
