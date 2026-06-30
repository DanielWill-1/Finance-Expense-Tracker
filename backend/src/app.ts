import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware';

const app = express();

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express.json());

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api', routes);

app.use('/api/*', notFoundHandler);

app.use(errorHandler);

export default app;
