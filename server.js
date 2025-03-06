import { serve } from '@hono/node-server'; // Install if using Node.js
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createReadStream, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const app = new Hono();
const PORT = process.env.PORT || 5111;

const uploadsDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir);

app.use('*', cors());

app.post('/files', async (c) => {
  console.log('Received POST to /files');

  const body = await c.req.parseBody();
  const files = body.files || [];

  if (!Array.isArray(files) || files.length === 0) {
    console.log('No files found in request');
    return c.json({ success: false, message: 'No files uploaded' }, 400);
  }

  const savedFiles = files.map((file) => {
    const filePath = join(uploadsDir, `${Date.now()}-${file.filename}`);
    writeFileSync(filePath, file.data);
    console.log(`Saved file: ${file.filename} (${file.data.length} bytes)`);
    return { originalName: file.filename, savedPath: filePath, size: file.data.length };
  });

  return c.json({ success: true, message: `Successfully uploaded ${savedFiles.length} files`, files: savedFiles });
});

// serve static files from /dist
app.use('*', async (c, next) => {
  const filePath = join(process.cwd(), 'dist', c.req.path);
  if (existsSync(filePath)) {
    return c.body(createReadStream(filePath));
  }
  await next();
});

// AI says this is a catch-all for single page apps
app.get('*', async (c) => {
  return c.body(createReadStream(join(process.cwd(), 'dist', 'index.html')));
});

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`Server running at http://${info.address}:${info.port}`);
    console.log(`File upload endpoint: http://localhost:${PORT}/files`);
    console.log(`Files stored in: ${uploadsDir}`);
  }
);
