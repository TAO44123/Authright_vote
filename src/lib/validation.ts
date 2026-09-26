import { z } from "zod";

export const createPollSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(80, "补充说明最多 80 字").default(""),
  options: z.array(z.string().trim().min(1).max(100)).min(2).max(8),
  startsAt: z.number().int().positive(),
  endsAt: z.number().int().positive(),
  managerToken: z.string().min(40).max(100),
  createKey: z.uuid(),
}).superRefine((data, ctx) => {
  if (data.endsAt <= data.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "截止时间必须晚于开始时间" });
  if (data.endsAt <= Date.now()) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "截止时间必须在未来" });
  if (new Set(data.options.map((item) => item.toLocaleLowerCase("zh-CN"))).size !== data.options.length) {
    ctx.addIssue({ code: "custom", path: ["options"], message: "选项不能重复" });
  }
});

export const voteSchema = z.object({ optionId: z.string().uuid() });
