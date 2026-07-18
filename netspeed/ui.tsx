<Tray id="main" onClick="popover">
  <TrayLabel>
    {/* 样式由设置 tray_style 决定,默认 text。settings 默认不 seed(读 null),故按 tokstat 手法:
        让「text=默认」落在 fallback(!== "graph")分支,unset 即显示文字。graph 块显式 ===
        graph/combined(不用 ||,复制一份,同 tokstat)。walker 服务端解析守卫。combined 时图左文右。 */}
    <HStack gap={4}>
      {settings.tray_style === "graph" && (
        <VStack gap={1}>
          <Sparkline collection="samples" field="down" limit={48} color="#4FD1C5"/>
          <Sparkline collection="samples" field="up" limit={48} color="#F5B14C"/>
        </VStack>
      )}
      {settings.tray_style === "combined" && (
        <VStack gap={1}>
          <Sparkline collection="samples" field="down" limit={48} color="#4FD1C5"/>
          <Sparkline collection="samples" field="up" limit={48} color="#F5B14C"/>
        </VStack>
      )}
      {settings.tray_style !== "graph" && (
        <VStack align="end" gap={0}>
          <HStack gap={1}>
            <Text color="#4FD1C5" className="text-xs">↓</Text>
            <Text className="text-xs tabular-nums">{state.downText}</Text>
          </HStack>
          <HStack gap={1}>
            <Text color="#F5B14C" className="text-xs">↑</Text>
            <Text className="text-xs tabular-nums">{state.upText}</Text>
          </HStack>
        </VStack>
      )}
    </HStack>
  </TrayLabel>

  <TrayMenu>
    <TrayMenuItem label={t.menuRefresh} onSelect="refresh"/>
    <TrayMenuItem label={t.menuQuit} quit/>
  </TrayMenu>

  <TrayPopover>
    <Page className="p-4 flex flex-col gap-3 select-none">
      <Text className="text-sm font-semibold">{t.title}</Text>

      <HStack className="items-center justify-between">
        <HStack gap={2} className="items-center">
          <Icon symbol="arrow-down" color="#4FD1C5"/>
          <Text className="text-xs opacity-70">{t.down}</Text>
        </HStack>
        <Text className="text-sm tabular-nums font-medium">
          {{op: "format", kind: "rate", value: {op: "state", path: "/state/down"}}}
        </Text>
      </HStack>

      <HStack className="items-center justify-between">
        <HStack gap={2} className="items-center">
          <Icon symbol="arrow-up" color="#F5B14C"/>
          <Text className="text-xs opacity-70">{t.up}</Text>
        </HStack>
        <Text className="text-sm tabular-nums font-medium">
          {{op: "format", kind: "rate", value: {op: "state", path: "/state/up"}}}
        </Text>
      </HStack>

      <Divider/>

      <HStack className="items-center justify-between">
        <Text className="text-xs opacity-50">{t.totalDown}</Text>
        <Text className="text-xs tabular-nums opacity-70">
          {{op: "format", kind: "bytes", value: {op: "state", path: "/state/rxTotal"}}}
        </Text>
      </HStack>
      <HStack className="items-center justify-between">
        <Text className="text-xs opacity-50">{t.totalUp}</Text>
        <Text className="text-xs tabular-nums opacity-70">
          {{op: "format", kind: "bytes", value: {op: "state", path: "/state/txTotal"}}}
        </Text>
      </HStack>
    </Page>
  </TrayPopover>
</Tray>
