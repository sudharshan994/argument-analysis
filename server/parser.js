export function parseThread(rawText) {
  const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);
  const comments = [];
  let id = 0;

  for (const line of lines) {
    const match = line.match(/^([^:]{2,80}):\s+(.{8,})$/);
    if (!match) continue;

    comments.push({
      id,
      author: match[1].trim(),
      text: match[2].trim().replace(/\s+/g, ' '),
      parent_id: null,
      timestamp: id + 1,
    });
    id += 1;
  }

  return comments;
}
