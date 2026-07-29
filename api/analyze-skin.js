const Anthropic = require('@anthropic-ai/sdk');

// API key lives only here, server-side — never sent to the browser.
const client = new Anthropic();

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SERVICE_NAMES = [
  'Signature Facial',
  'Clarifying Acne Therapy',
  'Advanced Sculpt & Renew',
  'Dermaplane Facial',
  'Microcurrent Face Sculpting',
  'Body Wrap',
  'Korean Lash Lift',
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { image, mediaType } = req.body || {};

  if (!image || typeof image !== 'string') {
    res.status(400).json({ error: 'Missing image' });
    return;
  }
  // ~1024px JPEG at quality 0.85 is well under this; guards against an
  // unexpectedly large upload reaching the model call.
  if (image.length > 6_000_000) {
    res.status(413).json({ error: 'Image too large' });
    return;
  }
  const safeMediaType = ALLOWED_MEDIA_TYPES.includes(mediaType) ? mediaType : 'image/jpeg';

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              observations: {
                type: 'array',
                items: { type: 'string' },
                description: '2-4 brief, neutral, non-diagnostic visual observations about the skin in the photo (e.g. visible dryness, some redness, texture, dullness). If the image is not a clear selfie of a face, note that here instead.',
              },
              summary: {
                type: 'string',
                description: 'One or two friendly, encouraging sentences summarizing the observations.',
              },
              tips: {
                type: 'array',
                items: { type: 'string' },
                description: '3 practical, general skincare tips based on the observations. Never make medical claims or diagnose a condition.',
              },
              recommended_service: {
                type: 'string',
                enum: SERVICE_NAMES,
                description: 'The single service from this list that best matches the observations.',
              },
            },
            required: ['observations', 'summary', 'tips', 'recommended_service'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: safeMediaType, data: image } },
            {
              type: 'text',
              text:
                'You are a friendly assistant for "Delicate Skin & Care," a mobile esthetics business. ' +
                'Look at this selfie and give brief, general, non-diagnostic skincare observations and tips. ' +
                'Never make medical claims, never diagnose a skin condition, and keep the tone warm and encouraging. ' +
                'If the image does not clearly show a face, say so plainly in the summary and give generic tips instead.',
            },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      res.status(422).json({ error: 'Analysis declined for this image' });
      return;
    }

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) {
      res.status(502).json({ error: 'No analysis returned' });
      return;
    }

    const data = JSON.parse(textBlock.text);
    res.status(200).json(data);
  } catch (err) {
    console.error('analyze-skin error:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
};
