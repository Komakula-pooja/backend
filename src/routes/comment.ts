import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";
import { commentCreate,commentUpdate } from "@komakula/medium-common";

export const commentRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();


commentRouter.use("/*", async (c, next) => {
    const authHeader=c.req.header("authorization") || "";
    try{
        const user= await verify(authHeader, c.env.JWT_SECRET);

        if(user){
            c.set("userId",String(user.id));
            await next();
        }else{
            c.status(403);
            return c.json({
                message:"You are not authorized"
            })
        }
    }catch(e){
        c.status(403);
            return c.json({
                message:"Invalid token"
            })
    }
});


commentRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  try {
    const valid = commentCreate.safeParse(body);
    if (!valid.success) {
      c.status(400);
      return c.json({ error: valid.error });
    }

    const prisma = new PrismaClient({ datasourceUrl: c.env.DATABASE_URL }).$extends(
      withAccelerate()
    );

    const response = await prisma.comment.create({
      data: {
        comment: body.content,
        blogId: body.blogId, 
        userId: Number(userId),
      },
    });

    c.status(200);
    return c.json({ response });
  } catch (error) {
    c.status(500);
    return c.json({ error: "Internal Server Error" });
  }
});


commentRouter.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const valid = commentUpdate.safeParse(body);
  if (!valid.success) {
    c.status(400);
    return c.text("Inputs not correct");
  }

  try {
    const prisma = new PrismaClient({ datasourceUrl: c.env.DATABASE_URL }).$extends(
      withAccelerate()
    );

    const res = await prisma.comment.update({
      where: {
        id: Number(id),
      },
      data: {
        comment: body.comment, 
      },
    });

    return c.json({ success: true, res });
  } catch (error) {
    c.status(500);
    return c.json({ error: "Internal Server Error" });
  }
});


commentRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const prisma = new PrismaClient({ datasourceUrl: c.env.DATABASE_URL }).$extends(
      withAccelerate()
    );

    const res = await prisma.comment.delete({
      where: {
        id: Number(id),
      },
    });

    return c.json({ success: true, message: "Comment deleted successfully", res });
  } catch (error) {
    c.status(500);
    return c.json({ error: "Internal Server Error" });
  }
});


commentRouter.get("/:blogId", async (c) => {
  const blogId = c.req.param("blogId");

  try {
    const prisma = new PrismaClient({ datasourceUrl: c.env.DATABASE_URL }).$extends(
      withAccelerate()
    );

    const comments = await prisma.comment.findMany({
      where: {
        blogId: Number(blogId), 
      },
      select: {
        id: true,
        comment: true, 
        users: { select: { name: true } }, 
      },
    });

    return c.json({ success: true, comments });
  } catch (error) {
    c.status(500);
    return c.json({ error: "Internal Server Error" });
  }
});
