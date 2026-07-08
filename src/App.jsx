import { useEffect, useMemo, useRef, useState } from 'react';
import GraphCanvas from './components/GraphCanvas';
import InsightPanel from './components/InsightPanel';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const PAYMENT_ADDRESS = import.meta.env.VITE_PAYMENT_ADDRESS || import.meta.env.VITE_PAYMENT_UPI || 'your-payment-id';
const PAYMENT_NAME = import.meta.env.VITE_PAYMENT_NAME || 'Argument Replay Engine';

const SAMPLE_THREAD = `Alice: Climate change is primarily caused by human activity and carbon emissions
Bob: The climate has always changed naturally over millions of years, so humans are not the main cause
Carol: Natural cycles exist, but the current rate of warming is unusually fast in geological history
Dave: The scientific consensus strongly supports human-caused warming
Eve: Scientists just say what gets them funding
Frank: Can someone explain why temperatures rose so sharply after industrialization?
Bob: Solar activity could explain the warming instead of carbon emissions
Carol: Solar activity has declined since the 1980s while temperatures continued rising
Dave: The greenhouse effect has been understood since the 1800s
Alice: Fossil fuel carbon has a measurable isotopic signature in the atmosphere
Frank: Both sides raised points, but the evidence seems stronger for human causation`;

const commentPattern = /^[^:]{2,80}:\s+.{8,}$/;

const serviceTiers = [
  { name: 'Free Trial', price: 'Rs 10', detail: 'Starter access for one short thread before buying a full report.' },
  { name: 'Replay Report', price: '$9', detail: 'One clean claim map and short summary for a single thread.' },
  { name: 'Pro Pack', price: '$29', detail: 'Priority analysis with report-ready insights and conflict notes.' },
  { name: 'Team Audit', price: '$99', detail: 'Deep read for communities, campaigns, and research teams.' },
];

export default function App() {
  const [rawText, setRawText] = useState('');
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef(null);

  const inputStats = useMemo(() => {
    const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);
    const valid = lines.filter(line => commentPattern.test(line));
    const words = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
    const score = Math.min(100, Math.round((valid.length / Math.max(lines.length, 1)) * 70 + Math.min(valid.length, 8) * 3.75));

    return {
      lines: lines.length,
      valid: valid.length,
      words,
      score: rawText.trim() ? score : 0,
    };
  }, [rawText]);

  useEffect(() => {
    if (playing && graph) {
      const max = graph.nodes.length - 1;
      intervalRef.current = setInterval(() => {
        setStep(prev => {
          if (prev >= max) {
            setPlaying(false);
            clearInterval(intervalRef.current);
            return max;
          }
          return prev + 1;
        });
      }, 700);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, graph]);

  async function analyze() {
    if (inputStats.valid < 2) {
      setError('Add at least two comments in "name: message" format for an accurate argument map.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API_URL}/analyze`, { rawText }, { timeout: 45000 });
      if (data.error) {
        setError(data.error);
        return;
      }
      setGraph(data);
      setStep(0);
      document.getElementById('replay')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        'Could not reach the analysis server. Start the backend and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function copyPaymentAddress() {
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(PAYMENT_ADDRESS);
        } catch {
          fallbackCopy(PAYMENT_ADDRESS);
        }
      } else {
        fallbackCopy(PAYMENT_ADDRESS);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. Select the payment address manually and try again.');
    }
  }

  function togglePlay() {
    if (!graph) return;
    if (step >= graph.nodes.length - 1) setStep(0);
    setPlaying(prev => !prev);
  }

  function reset() {
    setPlaying(false);
    setGraph(null);
    setStep(0);
    setError(null);
  }

  const canAnalyze = inputStats.valid >= 2 && !loading;
  const visibleCount = graph ? Math.min(step + 1, graph.nodes.length) : 0;

  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="Primary navigation">
        <a className="brand-mark" href="#top" aria-label="Argument Replay Engine home">
          <span>ARE</span>
        </a>
        <div className="nav-links">
          <a href="#analyze">Analyze</a>
          <a href="#payment">Payment</a>
          <a href="#replay">Replay</a>
        </div>
      </nav>

      <section className="hero-stage" id="top">
        <div className="hero-copy">
          <div className="eyebrow">Argument intelligence for creators, founders, and moderators</div>
          <h1>Argument Replay Engine</h1>
          <p>
            Turn noisy debate threads into an elegant live map of claims, attacks, support,
            questions, and missed points.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#analyze">Start analysis</a>
            <a className="ghost-button" href="#payment">View payment</a>
          </div>
        </div>

        <div className="hero-device" aria-hidden="true">
          <div className="device-glass">
            <div className="orbital orbital-one" />
            <div className="orbital orbital-two" />
            <div className="thread-line line-one" />
            <div className="thread-line line-two" />
            <div className="thread-line line-three" />
            <div className="claim-node node-one">Claim</div>
            <div className="claim-node node-two">Support</div>
            <div className="claim-node node-three">Attack</div>
            <div className="claim-node node-four">Question</div>
            <div className="device-footer">
              <span>Live replay</span>
              <strong>92%</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Product strengths">
        <div><strong>3D replay</strong><span>Animated graph reveal</span></div>
        <div><strong>AI structure</strong><span>Claims and relationships</span></div>
        <div><strong>Paid reports</strong><span>Built for monetization</span></div>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <span className="status-dot error-dot" aria-hidden="true" />
          <div>{error}</div>
        </div>
      )}

      <section className="workspace-grid" id="analyze">
        <div className="input-panel">
          <div className="panel-heading">
            <div>
              <span className="metric-label">Thread input</span>
              <h2>Paste the discussion</h2>
            </div>
            <button className="ghost-button compact" onClick={() => setRawText(SAMPLE_THREAD)}>
              Load sample
            </button>
          </div>

          <textarea
            id="thread-input"
            className="input-textarea"
            rows={14}
            placeholder="Name: Comment text"
            value={rawText}
            onChange={event => setRawText(event.target.value)}
          />

          <div className="input-footer">
            <div className="mini-stats">
              <span>{inputStats.valid} valid</span>
              <span>{inputStats.words} words</span>
              <span>{inputStats.score}% ready</span>
            </div>
            <button className="primary-button" onClick={analyze} disabled={!canAnalyze}>
              Analyze thread
            </button>
          </div>
        </div>

        <aside className="side-stack">
          <div className="value-card lift-card">
            <span className="metric-label">Accuracy guard</span>
            <strong>Structured lines improve results</strong>
            <p>Each comment is parsed before the AI classifies intent, reducing messy input drift.</p>
          </div>
          <div className="value-card lift-card">
            <span className="metric-label">Buyer outcome</span>
            <strong>Clear reports beat raw chats</strong>
            <p>Clients pay for distilled positions, conflict points, and actionable summaries.</p>
          </div>
        </aside>
      </section>

      <section className="payment-section" id="payment">
        <div className="payment-copy">
          <span className="metric-label">Payment page</span>
          <h2>Accept paid reports instantly</h2>
          <p>
            Use this section as the customer payment handoff for reports, pro packs,
            and team audits. Replace the address in `.env` with your real UPI, wallet,
            or payment identifier before publishing.
          </p>
        </div>

        <div className="payment-card lift-card">
          <div className="payment-chip">Secure handoff</div>
          <h3>{PAYMENT_NAME}</h3>
          <div className="payment-address" aria-label="Payment address">{PAYMENT_ADDRESS}</div>
          <button className="primary-button" onClick={copyPaymentAddress}>
            {copied ? 'Copied' : 'Copy payment address'}
          </button>
        </div>

        <div className="pricing-grid">
          {serviceTiers.map(tier => (
            <article className="price-card lift-card" key={tier.name}>
              <span>{tier.name}</span>
              <strong>{tier.price}</strong>
              <p>{tier.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {loading && (
        <section className="loading-panel" aria-live="polite">
          <div className="loader" />
          <h2>Building the argument map</h2>
          <p>Parsing comments, extracting propositions, and checking relationships.</p>
        </section>
      )}

      {graph && !loading && (
        <section className="replay-panel" id="replay">
          <div className="result-header">
            <div>
              <span className="metric-label">Analysis complete</span>
              <h2>{visibleCount} of {graph.nodes.length} claims revealed</h2>
            </div>
            <div className="result-metrics">
              <span>{graph.links.length} relationships</span>
              <span>{graph.meta?.confidence || 0}% confidence</span>
              <span>{graph.meta?.comments || 0} comments</span>
            </div>
          </div>

          <div className="controls-bar">
            <button className="icon-button" onClick={togglePlay} aria-label={playing ? 'Pause replay' : 'Play replay'}>
              {playing ? 'II' : '>'}
            </button>
            <button className="icon-button" onClick={() => setStep(0)} aria-label="Restart replay">
              |&lt;
            </button>
            <input
              type="range"
              className="scrubber"
              min={0}
              max={graph.nodes.length - 1}
              value={step}
              onChange={event => {
                setPlaying(false);
                setStep(Number(event.target.value));
              }}
              aria-label="Replay position"
            />
            <span className="step-indicator">{step + 1} / {graph.nodes.length}</span>
            <button className="ghost-button compact" onClick={reset}>New thread</button>
          </div>

          <GraphCanvas graph={graph} replayStep={step} />
          <InsightPanel graph={graph} />
        </section>
      )}
    </main>
  );
}

function fallbackCopy(value) {
  const helper = document.createElement('textarea');
  helper.value = value;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.appendChild(helper);
  helper.select();
  document.execCommand('copy');
  document.body.removeChild(helper);
}
