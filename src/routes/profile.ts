import { Hono } from "hono";
import {PrismaClient} from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";


export const profileRouter = new Hono<{
    Bindings:{
        DATABASE_URL:string
        JWT_SECRET:string
    },
    Variables:{
        userId:string
    }
}>()

profileRouter.use("/*", async (c, next) => {
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

profileRouter.get("/get-profile",async(c)=>{
    const userId = c.get("userId")
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate())
    try{
   
        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: {
                id:true,
                username:true,
                name:true,
            }
        })

        if (!user) {
            return c.json({ message: "User not found" }, 404);
        }else{
            return c.json({
                user
            })
        }
    }catch(e){
        return c.json({error:e})
    }finally {
        await prisma.$disconnect(); 
      }
})


profileRouter.get("/other/:id",async(c)=>{
    const userid = c.req.param("id");

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());

    try {
        const user = await prisma.user.findFirst({
            where: {
                id: Number(userid)
            },
            select: {
                id: true,
                name: true,
                username: true
            }
        })

        if (!user) {
            c.status(404);
            return c.json({
                message: "User not found"
            })
        }else{
        return c.json({
            user})
        }
       
    }catch (e) {
        c.status(411);
        return c.json({
            "error": e
        })
    }
})