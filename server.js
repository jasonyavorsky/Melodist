import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(join(__dirname, 'dist')));

app.listen(process.env.PORT || 3000, () => {
  console.log(`Melodist running at http://localhost:${process.env.PORT || 3000}`);
});
