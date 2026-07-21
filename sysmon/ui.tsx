<Tray id="main" onClick="popover">
  <TrayLabel>
    {/* 每项指标由 settings.enable_* 守卫可见性（关闭即不显、scripts 也不 poll）。net 列对齐
        netspeed:上行在前、每行 HStack justify=between（箭头贴左、数字贴右）、min-w-[70px]
        稳定行宽、外层 VStack justify=evenly；mem/cpu 列用「小标签 + 大数值」双行。全部关闭时 <Icon> 兜底。 */}
    <HStack gap={10}>
      {settings.enable_net !== "false" && (
        <VStack justify="evenly" align="center" className="min-w-[80px]">
          <HStack justify="between" className="min-w-[70px]">
            <Text color="#F5B14C" className="text-xs font-normal">↑</Text>
            <Text className="text-xs tabular-nums font-normal">{state.upText}</Text>
          </HStack>
          <HStack justify="between" className="min-w-[70px]">
            <Text color="#4FD1C5" className="text-xs font-normal">↓</Text>
            <Text className="text-xs tabular-nums font-normal">{state.downText}</Text>
          </HStack>
        </VStack>
      )}
      {settings.enable_mem !== "false" && (
        <VStack justify="evenly" align="center" className="min-w-[40px]">
          <Text className="text-xs opacity-50 font-normal">MEM</Text>
          <Text className="text-xs tabular-nums font-normal">{state.memText}</Text>
        </VStack>
      )}
      {settings.enable_cpu !== "false" && (
        <VStack justify="evenly" align="center" className="min-w-[40px]">
          <Text className="text-xs opacity-50 font-normal">CPU</Text>
          <Text className="text-xs tabular-nums font-normal">{state.cpuText}</Text>
        </VStack>
      )}
    </HStack>
    <Icon symbol="gauge"/>
  </TrayLabel>

  <TrayMenu>
    <TrayMenuItem label={t.menuQuit} quit/>
  </TrayMenu>

  <TrayPopover>
    <Page className="px-4 py-3 flex flex-col gap-4 select-none">
      {/* CPU 区:标题 + 占用率大值(温度作次级)+ 色带进度条 + user/sys 拆分 */}
      {settings.enable_cpu !== "false" && (
        <VStack gap={2}>
          <HStack className="items-center justify-between">
            <HStack gap={5} className="items-center">
              <Icon symbol="cpu" size="sm" color="#98989D"/>
              <Text className="text-[11px] font-semibold uppercase tracking-wider opacity-55">{t.cpu}</Text>
            </HStack>
            <HStack gap={6} className="items-center">
              {state.cpuTempText && (
                <Text className="text-[11px] tabular-nums opacity-45">{state.cpuTempText}</Text>
              )}
              <Text className="text-sm font-semibold tabular-nums">{state.cpuVal}%</Text>
            </HStack>
          </HStack>
          <Progress value={state.cpuVal} max={100} size="sm" bands={[{upTo: 60, color: "#30D158"}, {upTo: 85, color: "#FFD60A"}, {color: "#FF453A"}]}/>
          <HStack className="items-center justify-between">
            <Text className="text-[10px] tabular-nums opacity-40">{t.user} {state.cpuUser}%</Text>
            <Text className="text-[10px] tabular-nums opacity-40">{t.sys} {state.cpuSys}%</Text>
          </HStack>
        </VStack>
      )}

      <Divider className="opacity-40"/>

      {/* 内存区:标题 + 已用字节大值 + 色带进度条 + 占用率 / 总量 */}
      {settings.enable_mem !== "false" && (
        <VStack gap={2}>
          <HStack className="items-center justify-between">
            <HStack gap={5} className="items-center">
              <Icon symbol="memory" size="sm" color="#98989D"/>
              <Text className="text-[11px] font-semibold uppercase tracking-wider opacity-55">{t.memory}</Text>
            </HStack>
            <Text className="text-sm font-semibold tabular-nums">
              {{op: "format", kind: "bytes", value: {op: "state", path: "/state/memUsed"}}}
            </Text>
          </HStack>
          <Progress value={state.memPct} max={100} size="sm" bands={[{upTo: 70, color: "#0A84FF"}, {upTo: 90, color: "#FFD60A"}, {color: "#FF453A"}]}/>
          <HStack className="items-center justify-between">
            <Text className="text-[10px] tabular-nums opacity-40">{state.memPct}%</Text>
            <Text className="text-[10px] tabular-nums opacity-40">
              / {{op: "format", kind: "bytes", value: {op: "state", path: "/state/memTotal"}}}
            </Text>
          </HStack>
        </VStack>
      )}

      <Divider className="opacity-40"/>

      {/* 网络区:标题 + ↓/↑ 大值 + 实时曲线 + 累计收发 */}
      {settings.enable_net !== "false" && (
        <VStack gap={2}>
          <HStack gap={5} className="items-center">
            <Icon symbol="network" size="sm" color="#98989D"/>
            <Text className="text-[11px] font-semibold uppercase tracking-wider opacity-55">{t.network}</Text>
          </HStack>
          <HStack className="items-center justify-between">
            <HStack gap={4} className="items-center">
              <Icon symbol="arrow-down" color="#4FD1C5"/>
              <Text className="text-sm font-semibold tabular-nums">{state.downText}</Text>
            </HStack>
            <HStack gap={4} className="items-center">
              <Icon symbol="arrow-up" color="#F5B14C"/>
              <Text className="text-sm font-semibold tabular-nums">{state.upText}</Text>
            </HStack>
          </HStack>
          <Chart collection="samples" query={{orderBy: [{field: "ts", direction: "asc"}], limit: 60}} xField="ts" series={[{field: "down", color: "#4FD1C5"}, {field: "up", color: "#F5B14C"}]} height={46} sparkline/>
          <HStack className="items-center justify-between">
            <Text className="text-[10px] tabular-nums opacity-40">
              ↓ {{op: "format", kind: "bytes", value: {op: "state", path: "/state/rxTotal"}}}
            </Text>
            <Text className="text-[10px] tabular-nums opacity-40">
              ↑ {{op: "format", kind: "bytes", value: {op: "state", path: "/state/txTotal"}}}
            </Text>
          </HStack>
        </VStack>
      )}
    </Page>
  </TrayPopover>
</Tray>
