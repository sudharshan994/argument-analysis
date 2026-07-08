import express from 'express';
import cors from 'cors';
import { parseThread } from './parser.js';
import { extractPropositions, deduplicatePropositions } from './nvidia.js';
import { buildGraph } from './graph.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.post('/analyze', async (req, res) => {
  try {
    const { rawText } = req.body;

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'No text provided.' });
    }

    if (rawText.length > 25000) {
      return res.status(413).json({
        error: 'Thread is too large for one analysis. Keep it under 25,000 characters.',
      });
    }

    console.log('Parsing thread...');
    const comments = parseThread(rawText);

    if (comments.length < 2) {
      return res.status(400).json({
        error: 'Add at least two comments using the format "username: comment text".',
      });
    }

    console.log(`Found ${comments.length} comments. Classifying intents...`);
    const annotated = await extractPropositions(comments);

    console.log('Deduplicating propositions...');
    const deduplicated = await deduplicatePropositions(annotated);

    if (!deduplicated.length) {
      return res.status(422).json({
        error: 'No logical claims were found. Try a thread with more specific arguments.',
      });
    }

    console.log('Building graph...');
    const graph = buildGraph(annotated, deduplicated, comments);

    console.log(`Done: ${graph.nodes.length} nodes, ${graph.links.length} links`);
    res.json(graph);
  } catch (error) {
    console.error('Error:', error.message);

    if (error.message.includes('NVIDIA_API_KEY') || error.message.includes('API key')) {
      return res.status(500).json({
        error: 'Invalid or missing NVIDIA API key. Check your .env file.',
      });
    }

    res.status(500).json({
      error: error.message || 'Internal server error.',
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Argument Replay Engine server running on http://localhost:${PORT}`);
  console.log('POST /analyze');
  console.log('GET  /health');
});
