// Reminders —— 声明式提醒：app **不写** notifications.schedule/cancel，只维护一个
// `remind_at_ms`（epoch ms）字段；host 按 manifest.reminders 绑定在 data-write 后自动
// 排程/取消（>0 排，<=0 或删除取消）。OS 到点投递，宿主休眠也响；无 due_scan job、
// 无 notified_at 去重字段。
//
// 唯一的额外职责是**菜单栏计数**：TrayLabel 的服务端 walker 只认 Text/Icon（不支持
// Show/DataScope），所以未完成条数必须在这里算好写进 /state/trayText。每个写操作后
// 都刷一次；空串 = 无待办（菜单栏只剩铃铛图标）。

// DatePicker mode="datetime" 产出 `yyyy-MM-ddTHH:mm`（本地时间，无时区后缀），
// Date.parse 按本地时区解析 —— 正是用户期望的语义。空值 → 0 = 不排程。
// 仍保留空格分隔的兼容（历史数据 / seed.json 可能是 "yyyy-MM-dd HH:mm"）。
function dueMs(s) {
  if (!s) return 0;
  const t = Date.parse(String(s).replace(" ", "T"));
  return isNaN(t) ? 0 : t;
}

// 未完成条数 → 菜单栏。data.list 的 envelope 在不同调用路径下可能是 {items} 或
// {data:{items}}，两种都兜（拿不到就当 0：宁可菜单栏少个数字，不让写操作失败）。
async function syncTray(ctx) {
  let items = [];
  try {
    const r = await ctx.dispatch("data.list", {
      collection: "items",
      where: { completed: false },
    });
    items = (r && r.items) || (r && r.data && r.data.items) || [];
  } catch (_e) {
    items = [];
  }
  const n = items.length;
  await ctx.setState({ trayText: n > 0 ? String(n) : "" });
  return n;
}

export default {
  // 菜单栏计数重算（Page onEnter 调；也可手动触发）。
  async refreshTray(_args, ctx) {
    const n = await syncTray(ctx);
    return { ok: true, count: n };
  },

  // 新建：completed=false，remind_at_ms 取 due_at（有就排）。host 自动排程。
  async addReminder(_args, ctx) {
    const f = ctx.form || {};
    const title = ((f.title || "") + "").trim();
    if (!title) return { ok: false };
    await ctx.dispatch("data.create", {
      collection: "items",
      data: {
        title: title,
        notes: f.notes || "",
        due_at: f.due_at || "",
        remind_at_ms: dueMs(f.due_at),
        completed: false,
        created_at: new Date(ctx.now()).toISOString(),
      },
    });
    ctx.setStateAt("/form/title", "");
    ctx.setStateAt("/form/notes", "");
    ctx.setStateAt("/form/due_at", "");
    await syncTray(ctx);
    return { ok: true };
  },

  // 完成：清 remind_at_ms（→ host 自动取消未来通知）。
  async complete(args, ctx) {
    await ctx.dispatch("data.update", {
      collection: "items",
      id: args.id,
      patch: {
        completed: true,
        completed_at: new Date(ctx.now()).toISOString(),
        remind_at_ms: 0,
      },
    });
    await syncTray(ctx);
    return { ok: true };
  },

  // 撤销完成：复活 remind_at_ms（→ host 若 due 在未来自动重排；已过期则 <=0 不排）。
  async uncomplete(args, ctx) {
    await ctx.dispatch("data.update", {
      collection: "items",
      id: args.id,
      patch: { completed: false, completed_at: "", remind_at_ms: dueMs(args.due_at) },
    });
    await syncTray(ctx);
    return { ok: true };
  },

  // 删除：host 在 data.delete 后自动取消该 row 的通知。
  async remove(args, ctx) {
    await ctx.dispatch("data.delete", { collection: "items", id: args.id });
    await syncTray(ctx);
    return { ok: true };
  },
};
