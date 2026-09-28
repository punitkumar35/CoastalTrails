import http from 'http';

async function main() {
  const wsUrl = await new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        const list = JSON.parse(b);
        resolve(list[0].webSocketDebuggerUrl);
      });
    });
  });

  const ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    const expr = `
      (() => {
        const width = window.innerWidth;
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const overflowing = [];
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > width + 2 || rect.left < -2 || el.scrollWidth > width + 2) {
            overflowing.push({
              tag: el.tagName,
              id: el.id,
              class: el.className ? String(el.className).slice(0, 80) : '',
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              scrollWidth: el.scrollWidth
            });
          }
        });
        return JSON.stringify({ innerWidth: width, docWidth, bodyWidth, overflowing: overflowing.slice(0, 15) });
      })()
    `;

    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: expr }
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id === 1) {
      console.log('Result:', JSON.parse(data.result.result.value));
      process.exit(0);
    }
  };
}

main().catch(console.error);
