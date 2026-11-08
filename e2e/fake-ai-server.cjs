const http = require('node:http');

const retryAttempts = new Map();
const maxBodyBytes = 32_000;

function sendSse(response, text) {
  response.write(`event: response.output_text.delta\ndata: ${JSON.stringify({ delta: text })}\n\n`);
  response.write('event: response.completed\ndata: {}\n\n');
  response.end();
}

function contextFrom(payload) {
  const inputs = Array.isArray(payload.input) ? payload.input : [];
  const latest = [...inputs].reverse().find((item) => item && item.role === 'user');
  const content = typeof latest?.content === 'string' ? latest.content : '';
  const match = content.match(/<ledger_context>([\s\S]*?)<\/ledger_context>/);
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    return;
  }
  if (request.method !== 'POST' || request.url !== '/v1/responses') {
    response.writeHead(404).end();
    return;
  }

  let body = '';
  let size = 0;
  request.on('data', (chunk) => {
    size += chunk.length;
    if (size > maxBodyBytes) {
      response.writeHead(413).end();
      request.destroy();
      return;
    }
    body += chunk;
  });
  request.on('end', () => {
    if (response.writableEnded) return;
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      response.writeHead(400).end();
      return;
    }

    if (payload.stream !== true) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ output_text: 'READY' }));
      return;
    }

    const input = Array.isArray(payload.input) ? payload.input : [];
    const latest = [...input].reverse().find((item) => item && item.role === 'user');
    const question = typeof latest?.content === 'string' ? latest.content : '';
    if (/retry this request/i.test(question)) {
      const count = retryAttempts.get(question) ?? 0;
      retryAttempts.set(question, count + 1);
      if (count === 0) {
        response.writeHead(429, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({ error: { message: 'synthetic quota detail must not reach the UI' } }),
        );
        return;
      }
    }

    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    if (/cancel this request/i.test(question)) {
      response.write(
        `event: response.output_text.delta\ndata: ${JSON.stringify({ delta: 'This response will be cancelled.' })}\n\n`,
      );
      const interval = setInterval(() => {
        response.write(
          `event: response.output_text.delta\ndata: ${JSON.stringify({ delta: ' Waiting…' })}\n\n`,
        );
      }, 100);
      response.on('close', () => clearInterval(interval));
      setTimeout(() => {
        clearInterval(interval);
        if (!response.writableEnded) sendSse(response, ' Cancellation completed.');
      }, 10_000);
      return;
    }

    const ledger = contextFrom(payload);
    const totals = Array.isArray(ledger?.currencyTotals) ? ledger.currencyTotals : [];
    const summary = totals.length
      ? totals
          .map((row) => `${row.currency} ${Number(row.expenses).toFixed(2)} expenses`)
          .join('; ')
      : 'No transactions were found in the requested period.';
    sendSse(response, `Synthetic provider used ledger context: ${summary}`);
  });
});

server.listen(Number(process.env.GHOSTLEDGER_E2E_FAKE_AI_PORT || '31337'), '127.0.0.1');
