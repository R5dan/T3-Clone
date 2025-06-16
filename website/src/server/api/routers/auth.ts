import { z } from "zod";
import { workos } from "~/server/workos";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({
    
    }))
    .query(() => {
    workos.userManagement.autheni
  })
})
