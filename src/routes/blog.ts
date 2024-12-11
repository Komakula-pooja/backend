import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { createBlogInput,updateBlogInput } from "@komakula/medium-common";


export const blogRouter=new Hono<{
    Bindings:{
        DATABASE_URL:string;
        JWT_SECRET:string;
    },
    Variables:{
        userId:string;
    }
}>();

blogRouter.use("/*",async (c, next)=>{
    const authHeader=c.req.header("authorization") || "";
    try{
        const user= await verify(authHeader, c.env.JWT_SECRET);

        if(user){
            c.set("userId",String(user.id));
            await next();
        }else{
            c.status(403);
            return c.json({
                message:"You are not logged in"
            })
        }
    }catch(e){
        c.status(403);
            return c.json({
                message:"You are not logged in"
            })
    }
   
});

blogRouter.post('/',async (c)=>{
    const body= await c.req.json();
    const {success}=createBlogInput.safeParse(body);
    if(!success){
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        })
    }
    const authorId=c.get("userId")
    const prisma=new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const blog = await prisma.blog.create({
        data:{
            title:body.title,
            content:body.content,
            authorId:Number(authorId)
        }
    })

    return c.json({
        id:blog.id
    })
  })
  
blogRouter.put('/',async(c)=>{
    const body= await c.req.json();
    const {success} =updateBlogInput.safeParse(body);
    if(!success){
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        })
    }
    const prisma=new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const blog = await prisma.blog.update({
        where:{
            id:body.id
        },
        data:{
            title:body.title,
            content:body.content,
        }
    })

    return c.json({
        id:blog.id
    })
  })

blogRouter.get('/bulk',async(c)=>{
    //const authorId=c.get("userId")
    const prisma=new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const blogs=await prisma.blog.findMany({
        select:{
            content:true,
            title:true,
            authorId:true,
            id:true,
            author:{
                select:{
                    name:true,
                }
            },
            createdAt:true,
            updatedAt:true,
            _count: {
                  select: {
                    comments: true,
                  },
            },
        }
    });
    
    return c.json({
        blogs
    })

})
  
blogRouter.get('/:id',async(c)=>{
    const id=c.req.param("id");
    const prisma=new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    try{
        const blog= await prisma.blog.findFirst({
            where:{
                id:Number(id)
            },
            select:{
                id:true,
                title:true,
                content:true,
                author:{
                    select:{
                        name:true
                    }
                },
                createdAt:true,
                updatedAt:true
            }
        })
    
        return c.json({
            blog
        })
    }catch(e){
        c.status(411);
        return c.json({
            message:"Error while fetching blog post"
        })
    }
    
})

blogRouter.get('/search/:titleQuery', async (c) => {

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const  titleQuery  = c.req.param('titleQuery')?.trim()||'';
    console.log('Received titleQuery:', titleQuery); 
    if (!titleQuery) {
        c.status(400);
        return c.json({ error: "Title is required" });
    }

    try {
        console.log('Searching for blogs with title containing:', titleQuery);
      const blogs = await prisma.blog.findMany({
        where: {
          title: {
            contains: titleQuery, 
            mode: 'insensitive', 
          },
        },
        select: {
            id: true,
            title: true,
            content: true,
            author: {
                select: {
                    name: true
                }
            },
            createdAt: true,
            updatedAt: true
        },
      });
  
      if (blogs.length === 0) {
        return c.json({ msg: "No blogs found" });
      }
  
      return c.json(blogs);  
    } catch (error) {
        console.error('Detailed error:', error);
        c.status(500);
        return c.json({ message: "Internal Server Error" });
    }
  });
  