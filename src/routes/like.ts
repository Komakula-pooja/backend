import {PrismaClient} from "@prisma/client/edge";
import { Hono } from "hono";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";

export const likeRouter = new Hono<{
    Bindings : {
        DATABASE_URL:string
        JWT_SECRET:string
    },
        Variables:{
            userId:string;
        }
}>()
likeRouter.use("/*", async(c, next)=>{
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

likeRouter.post("/:blogId", async (c) => {
    const userId = c.get("userId");
    const blogId = c.req.param("blogId");

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    try {
        const existingLike = await prisma.like.findFirst({
            where: {
                userId: Number(userId),
                blogId: Number(blogId)
            },
        });

        if (existingLike) {
            const unlike = await prisma.like.delete({
                where: {
                    id: existingLike.id,
                },
            });
            c.status(200);
            return c.json({
                success: true,
                action: "unliked", 
                message: "Unliked successfully",
                unlike
            });
        }

        const newLike = await prisma.like.create({
            data: {
                like: 1,
                userId: Number(userId),
                blogId: Number(blogId),
            },
            include: {
                blogs: true,
                users: true,
            },
        });

        return c.json({
            success: true,
            action: "liked",
            like: newLike,
            message: "Liked successfully",
        });
    } catch (error) {
        console.error("Error:", error);
        c.status(500);
        return c.json({ error: "An error occurred" });
    } finally {
        await prisma.$disconnect(); 
    }
});


likeRouter.get("/:blogId", async (c) => {
    const userId = c.get("userId");
    const blogId = c.req.param("blogId");
  
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
  
    try {
      const userLike = await prisma.like.findFirst({
        where: {
          userId: Number(userId),
          blogId: Number(blogId),
        },
      });

      const totalLikes = await prisma.like.count({
        where: {
            blogId: Number(blogId),
        },
      });
  
      const isLiked = !!userLike; 
      return c.json({
          success: true,
          isLiked,
          totalLikes
        });  
    } catch (error) {
      c.status(403);
      return c.json({ error: error });
    } finally {
      await prisma.$disconnect();
    }
  });