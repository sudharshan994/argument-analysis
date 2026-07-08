export default function InsightPanel({ graph }) {
  if (!graph?.nodes?.length) return null;

  const totals = {
    attacks: graph.links.filter(link => link.relation === 'attacks').length,
    supports: graph.links.filter(link => link.relation === 'supports').length,
    questions: graph.links.filter(link => link.relation === 'questions').length,
    restates: graph.links.filter(link => link.relation === 'restates').length,
  };

  const mostAttacked = [...graph.nodes].sort((a, b) => b.attack_count - a.attack_count)[0];
  const mostSupported = [...graph.nodes].sort((a, b) => b.support_count - a.support_count)[0];
  const crosstalk = findCrosstalk(graph);

  return (
    <div className="insight-panel">
      <div className="insight-title">Argument insights</div>

      <div className="insight-grid">
        <div className="insight-stat">
          <strong>{graph.nodes.length}</strong>
          <span>Unique claims</span>
        </div>
        <div className="insight-stat">
          <strong>{totals.attacks}</strong>
          <span>Attacks</span>
        </div>
        <div className="insight-stat">
          <strong>{totals.supports}</strong>
          <span>Supports</span>
        </div>
        <div className="insight-stat">
          <strong>{graph.meta?.confidence || 0}%</strong>
          <span>Confidence</span>
        </div>
      </div>

      <div className="insight-list">
        {mostAttacked?.attack_count > 0 && (
          <div className="insight-item">
            <span>Most contested</span>
            <div>
              <span className="insight-quote">"{truncate(mostAttacked.label, 82)}"</span>
              {' '}was attacked {mostAttacked.attack_count} time{mostAttacked.attack_count !== 1 ? 's' : ''}.
            </div>
          </div>
        )}

        {mostSupported?.support_count > 0 && (
          <div className="insight-item">
            <span>Most supported</span>
            <div>
              <span className="insight-quote">"{truncate(mostSupported.label, 82)}"</span>
              {' '}was supported {mostSupported.support_count} time{mostSupported.support_count !== 1 ? 's' : ''}.
            </div>
          </div>
        )}

        {crosstalk.length > 0 && (
          <div className="insight-item">
            <span>Crosstalk detected</span>
            <div>
              <span className="insight-quote">"{truncate(crosstalk[0].a, 58)}"</span>
              {' '}conflicts with{' '}
              <span className="insight-quote">"{truncate(crosstalk[0].b, 58)}"</span>.
            </div>
          </div>
        )}

        <div className="insight-item">
          <span>Report angle</span>
          <div>
            Lead with {totals.attacks > totals.supports ? 'conflict reduction' : 'consensus mapping'}:
            {' '}this thread has {totals.attacks} attacks, {totals.supports} supports, and {totals.questions} questions.
          </div>
        </div>
      </div>
    </div>
  );
}

function findCrosstalk(graph) {
  const crosstalk = [];

  for (const link of graph.links) {
    if (link.relation !== 'attacks') continue;

    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    const reverse = graph.links.find(other => {
      const otherSourceId = typeof other.source === 'object' ? other.source.id : other.source;
      const otherTargetId = typeof other.target === 'object' ? other.target.id : other.target;
      return otherSourceId === targetId && otherTargetId === sourceId && other.relation === 'attacks';
    });

    if (!reverse) continue;

    const source = graph.nodes.find(node => node.id === sourceId);
    const target = graph.nodes.find(node => node.id === targetId);
    const key = [sourceId, targetId].sort().join('-');

    if (source && target && !crosstalk.some(item => item.key === key)) {
      crosstalk.push({ key, a: source.label, b: target.label });
    }
  }

  return crosstalk;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}...` : str;
}
