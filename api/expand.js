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
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `expandí esta info con contexto real, conexiones no obvias y algo filoso. escribí como alguien que sabe y le habla a un amigo que también sabe — sin chamuyo, sin asteriscos, sin bullets, sin markdown. todo en minúsculas, texto plano puro. mínimo 300 caracteres, idealmente más. arrancá directo, sin intro ni "claro que sí" ni nada de eso. no repitas el contenido original, expandilo.

categoría: ${category}
${source ? `fuente: ${source}` : ''}
contenido: ${content}

recordá: mínimo 300 caracteres, texto corrido, sin formato.`
          }
        ]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('anthropic error:', response.status, errText)
      return res.status(500).json({ error: `anthropic error ${response.status}` })
    }

    const data = await response.json()
    
    if (!data.content || data.content.length === 0) {
      return res.status(500).json({ error: 'respuesta vacía de anthropic' })
    }

    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .toLowerCase()
      .trim()

    if (!text) {
      return res.status(500).json({ error: 'no se pudo expandir' })
    }

    return res.status(200).json({ expansion: text })

  } catch (err) {
    console.error('expand error:', err)
    return res.status(500).json({ error: `error: ${err.message}` })
  }
}
