import { Hono } from 'hono'
import { userRouter } from './routes/user';
import { blogRouter } from './routes/blog';
import { cors } from 'hono/cors';
import { likeRouter } from './routes/like';
import { commentRouter } from './routes/comment';
import { profileRouter } from './routes/profile';

const app = new Hono<{
  Bindings:{
    DATABASE_URL:string;
    JWT_SECRET:string
  }
}>();

app.use('/*',cors())
app.route("api/v1/user",userRouter);
app.route("api/v1/blog",blogRouter);
app.route("api/v1/like",likeRouter);
app.route("api/v1/comment",commentRouter);
app.route("api/v1/profile",profileRouter);


export default app




