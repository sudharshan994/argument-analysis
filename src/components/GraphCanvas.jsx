import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function GraphCanvas({ graph, replayStep }) {
  const svgRef = useRef();
  const containerRef = useRef();
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!graph?.nodes?.length) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.min(620, Math.max(420, Math.round(window.innerHeight * 0.58)));

    const visibleNodes = graph.nodes
      .filter(node => node.order <= replayStep)
      .map(node => ({ ...node }));
    const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
    const visibleLinks = graph.links
      .filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
      })
      .map(link => ({
        ...link,
        source: typeof link.source === 'object' ? link.source.id : link.source,
        target: typeof link.target === 'object' ? link.target.id : link.target,
      }));

    const linkColor = {
      attacks: '#f87171',
      supports: '#34d399',
      questions: '#fbbf24',
      restates: '#94a3b8',
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    Object.entries(linkColor).forEach(([relation, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${relation}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color)
        .attr('opacity', 0.72);
    });

    const group = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.45, 2.6])
      .on('zoom', event => {
        group.attr('transform', event.transform);
      });
    svg.call(zoom);

    const simulation = d3.forceSimulation(visibleNodes)
      .force('link', d3.forceLink(visibleLinks).id(node => node.id).distance(155))
      .force('charge', d3.forceManyBody().strength(-360))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(42));

    group.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(visibleLinks)
      .join('line')
      .attr('stroke', link => linkColor[link.relation] || linkColor.restates)
      .attr('stroke-width', 1.6)
      .attr('stroke-opacity', 0.58)
      .attr('marker-end', link => `url(#arrow-${link.relation})`)
      .style('opacity', 0)
      .transition()
      .duration(320)
      .style('opacity', 1);

    const node = group.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(visibleNodes)
      .join('g')
      .style('cursor', 'grab')
      .style('opacity', 0);

    node.transition()
      .duration(280)
      .delay((_, index) => index * 18)
      .style('opacity', 1);

    const drag = d3.drag()
      .on('start', (event, item) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        item.fx = item.x;
        item.fy = item.y;
      })
      .on('drag', (event, item) => {
        item.fx = event.x;
        item.fy = event.y;
      })
      .on('end', (event, item) => {
        if (!event.active) simulation.alphaTarget(0);
        item.fx = null;
        item.fy = null;
      });

    node.call(drag);

    node.append('circle')
      .attr('r', item => 22 + item.support_count * 3 + item.attack_count * 2)
      .attr('fill', item => {
        if (item.attack_count > item.support_count) return 'rgba(215, 0, 21, 0.08)';
        if (item.support_count > 0) return 'rgba(0, 168, 107, 0.08)';
        return 'rgba(0, 113, 227, 0.07)';
      });

    node.append('circle')
      .attr('r', item => 16 + item.support_count * 2.5)
      .attr('fill', item => {
        if (item.attack_count > item.support_count) return 'rgba(215, 0, 21, 0.16)';
        if (item.support_count > 0) return 'rgba(0, 168, 107, 0.16)';
        return 'rgba(0, 113, 227, 0.13)';
      })
      .attr('stroke', item => {
        if (item.attack_count > item.support_count) return '#d70015';
        if (item.support_count > 0) return '#00a86b';
        return '#0071e3';
      })
      .attr('stroke-width', 1.8)
      .attr('stroke-opacity', 0.78)
      .style('filter', item => (item.order === replayStep ? 'url(#glow)' : 'none'));

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', item => -(22 + item.support_count * 2.5 + 5))
      .attr('font-size', '11px')
      .attr('font-weight', '800')
      .attr('fill', '#1d1d1f')
      .attr('pointer-events', 'none')
      .text(item => {
        const max = 34;
        return item.label.length > max ? `${item.label.slice(0, max)}...` : item.label;
      });

    node.on('mouseenter', (event, item) => {
      const rect = container.getBoundingClientRect();
      setTooltip({
        x: event.clientX - rect.left + 12,
        y: event.clientY - rect.top - 10,
        label: item.label,
        supports: item.support_count,
        attacks: item.attack_count,
        questions: item.question_count || 0,
        comments: item.comment_ids.length,
      });
    });

    node.on('mousemove', event => {
      const rect = container.getBoundingClientRect();
      setTooltip(prev => prev ? {
        ...prev,
        x: event.clientX - rect.left + 12,
        y: event.clientY - rect.top - 10,
      } : null);
    });

    node.on('mouseleave', () => setTooltip(null));

    simulation.on('tick', () => {
      group.selectAll('.links line')
        .attr('x1', link => link.source.x)
        .attr('y1', link => link.source.y)
        .attr('x2', link => link.target.x)
        .attr('y2', link => link.target.y);

      group.selectAll('.nodes g')
        .attr('transform', item => `translate(${item.x},${item.y})`);
    });

    return () => simulation.stop();
  }, [graph, replayStep]);

  return (
    <div className="graph-container" ref={containerRef}>
      <svg ref={svgRef} />
      <div className="legend">
        <div className="legend-item"><span className="legend-dot attacks" />Attacks</div>
        <div className="legend-item"><span className="legend-dot supports" />Supports</div>
        <div className="legend-item"><span className="legend-dot questions" />Questions</div>
        <div className="legend-item"><span className="legend-dot restates" />Restates</div>
      </div>

      {tooltip && (
        <div className="node-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="tooltip-label">{tooltip.label}</div>
          <div className="tooltip-stats">
            {tooltip.comments} comment{tooltip.comments !== 1 ? 's' : ''} |{' '}
            <span style={{ color: '#34d399' }}>+{tooltip.supports}</span>{' '}
            <span style={{ color: '#f87171' }}>-{tooltip.attacks}</span>{' '}
            <span style={{ color: '#fbbf24' }}>?{tooltip.questions}</span>
          </div>
        </div>
      )}
    </div>
  );
}
