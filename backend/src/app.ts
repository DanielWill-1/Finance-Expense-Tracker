import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { localRequestGuard } from './middleware/localRequestGuard';
import { resolve } from 'path';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: false }));
app.use(localRequestGuard);
app.use(express.json({ limit: '24mb' }));

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api', routes);

app.use('/api/*', notFoundHandler);

if (env.NODE_ENV === 'production') {
  const frontendDist = resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.includes('.')) {
      next();
      return;
    }
    res.sendFile(resolve(frontendDist, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
}

app.use(errorHandler);

export default app;
