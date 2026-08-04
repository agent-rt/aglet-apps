<Tray id="main" onClick="popover">
  {/*
    Up Next —— 菜单栏显示接下来的日程（只读系统日历）。

    ⚠️ TrayLabel 里的 Icon **必须包在 HStack 内**：runtime.appendTrayIR 会跳过顶层 Icon
    （顶层 Icon 被当作 title/icon 旧路径的兜底图标，不进组合 IR），平铺写的结果是菜单栏
    只剩文字。且该 walker 只认 Text/Icon，不支持 Show/If/DataScope —— 所以内容一律由
    scripts 算好写进 /state/trayText，未授权或无日程时为空串（视觉上只剩日历图标）。
  */}
  <TrayLabel>
    <HStack gap={4}>
      <Icon symbol="calendar" size="sm"/>
      <Text className="text-xs tabular-nums font-normal">{state.trayText}</Text>
    </HStack>
  </TrayLabel>

  <TrayMenu>
    <TrayMenuItem label={t.menuRefresh} onSelect="refresh"/>
    <TrayMenuItem label={t.menuQuit} quit/>
  </TrayMenu>

  <TrayPopover>
    <Page onEnter={() => scripts.refresh()}>
      <VStack gap={8} className="p-2">
        <HStack justify="between" align="center">
          <Heading level={3}>{t.title}</Heading>
          <Button icon="arrow-clockwise" variant="light" size="sm"
            onClick={() => scripts.refresh()}/>
        </HStack>

        {/* 已授权 → 日程列表；否则走下面的引导。用正向守卫（{x && …}）—— 反向
            守卫会编出无 when 的 If，web 显示 native 隐藏，属已知陷阱。 */}
        {state.authorized && (
          <VStack gap={6}>
            {state.empty && <EmptyState title={t.emptyToday} icon="confetti"/>}
            <For each={state.events}>
              <Card>
                <HStack justify="between" align="center" gap={8}>
                  <VStack gap={2} className="flex-1">
                    <Text className="text-sm font-medium">{item.title}</Text>
                    {item.location && (
                      <Text muted className="text-xs">{item.location}</Text>
                    )}
                  </VStack>
                  <VStack gap={2} className="items-end">
                    <Badge content={item.timeText} color="primary" icon="clock"/>
                    <Text muted className="text-xs">{item.calendar}</Text>
                  </VStack>
                </HStack>
              </Card>
            </For>
          </VStack>
        )}

        {/* 未授权引导：说明用途 + 一个按钮触发系统弹窗。denied 时系统不再弹，
            文案提示去「系统设置 › 隐私与安全性 › 日历」手动开。 */}
        {state.needsAuth && (
          <VStack gap={8} className="items-center py-4">
            <Icon symbol="calendar" size="xl"/>
            <Text muted className="text-sm text-center">{t.authHint}</Text>
            <Button label={t.btnGrant} color="primary" icon="unlock"
              disabled={state.loading}
              onClick={() => scripts.grantAccess()}/>
            {state.denied && (
              <Text muted className="text-xs text-center">{t.deniedHint}</Text>
            )}
          </VStack>
        )}
      </VStack>
    </Page>
  </TrayPopover>
</Tray>
