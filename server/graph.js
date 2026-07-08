export function buildGraph(annotated, deduplicated, comments = []) {
  const nodes = deduplicated.map((group, index) => ({
    id: `node-${index}`,
    label: group.canonical,
    comment_ids: group.comment_ids,
    support_count: 0,
    attack_count: 0,
    question_count: 0,
  }));

  const commentToNode = {};
  nodes.forEach(node => {
    node.comment_ids.forEach(commentId => {
      commentToNode[commentId] = node.id;
    });
  });

  const links = [];
  const seen = new Set();

  for (const comment of annotated) {
    const sourceNode = commentToNode[comment.id];
    if (!sourceNode) continue;

    for (const targetId of comment.targets || []) {
      const targetNode = commentToNode[targetId];
      if (!targetNode || sourceNode === targetNode) continue;

      const relation = getRelation(comment.intent);
      const key = `${sourceNode}->${targetNode}:${relation}`;
      if (seen.has(key)) continue;
      seen.add(key);

      links.push({
        source: sourceNode,
        target: targetNode,
        relation,
      });

      const target = nodes.find(node => node.id === targetNode);
      if (target) {
        if (relation === 'attacks') target.attack_count += 1;
        if (relation === 'supports') target.support_count += 1;
        if (relation === 'questions') target.question_count += 1;
      }
    }
  }

  nodes.forEach((node, index) => {
    const firstComment = Math.min(...node.comment_ids);
    node.order = Number.isFinite(firstComment) ? firstComment : index;
  });

  nodes.sort((a, b) => a.order - b.order);
  nodes.forEach((node, index) => {
    node.order = index;
  });

  return {
    nodes,
    links,
    meta: buildMeta({ annotated, comments, links, nodes }),
  };
}

function getRelation(intent) {
  if (intent === 'counter-claim') return 'attacks';
  if (intent === 'agreement') return 'supports';
  if (intent === 'question') return 'questions';
  return 'restates';
}

function buildMeta({ annotated, comments, links, nodes }) {
  const classified = annotated.length;
  const withPropositions = annotated.filter(comment => comment.proposition).length;
  const targeted = annotated.filter(comment => comment.targets?.length).length;
  const propositionCoverage = classified ? withPropositions / classified : 0;
  const targetCoverage = classified ? targeted / Math.max(classified - 1, 1) : 0;
  const relationshipDensity = nodes.length ? Math.min(1, links.length / Math.max(nodes.length - 1, 1)) : 0;
  const confidence = Math.round((propositionCoverage * 0.52 + targetCoverage * 0.24 + relationshipDensity * 0.24) * 100);

  return {
    comments: comments.length,
    classified,
    relationships: links.length,
    confidence: Math.max(35, Math.min(96, confidence)),
  };
}
