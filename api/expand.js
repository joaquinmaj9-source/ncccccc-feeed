export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'anthropic api key not configured' })
  }

  try {
    const { content, category, source } = req.body

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: `sos un agente de inteligencia contracultural, canchero, intelectual. todo en minúsculas. sin markdown, sin bullets, sin asteriscos ni formateo. texto plano puro. expandí esta información con contexto, conexiones interesantes, datos que no son obvios, y alguna reflexión filosa. sé directo, sin chamuyo. máximo 150 palabras.

categoría: ${category}
${source ? `fuente: ${source}` : ''}
contenido: ${content}`
          }
        ]
      })
    })

    const data = await response.json()
    const text = data.content
      ?.filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .toLowerCase() || 'no se pudo expandir.'

    return res.status(200).json({ expansion: text })
  } catch (err) {
    console.error('expand error:', err)
    return res.status(500).json({ error: 'error al expandir' })
  }
}
